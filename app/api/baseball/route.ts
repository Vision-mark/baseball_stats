import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

// 所有讀寫都走 service role，繞過 RLS；權限檢查全部由這支 API 自己把關
const supabase = createAdminClient();

// 取得目前登入者的 email（未登入回傳 null）
async function getUserEmail(): Promise<string | null> {
  const authClient = await createServerSupabase();
  const { data: { user } } = await authClient.auth.getUser();
  return user?.email ? user.email.toLowerCase() : null;
}

// 檢查這個 email 是否對指定球隊擁有權限（超級管理員對所有球隊都算有權限）
async function hasTeamPermission(email: string | null, teamId: any): Promise<boolean> {
  if (!email || teamId === undefined || teamId === null || teamId === '') return false;

  const { data: admin } = await supabase
    .from('super_admins')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  if (admin) return true;

  const { data } = await supabase
    .from('team_permissions')
    .select('id')
    .eq('email', email)
    .eq('team_id', teamId)
    .maybeSingle();

  return !!data;
}

export async function GET() {
  try {
    const { data: teams, error: teamsErr } = await supabase.from('teams').select('*');
    const { data: players, error: playersErr } = await supabase.from('players').select('*');
    const { data: fielderStats, error: fielderErr } = await supabase.from('fielder_stats').select('*');
    const { data: pitcherStats, error: pitcherErr } = await supabase.from('pitcher_stats').select('*');

    const firstError = teamsErr || playersErr || fielderErr || pitcherErr;
    if (firstError) {
      console.error('讀取資料失敗:', firstError);
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    const allStats = [
      ...(fielderStats || []).map(s => ({ ...s, type: 'fielder' })),
      ...(pitcherStats || []).map(s => ({ ...s, type: 'pitcher' }))
    ].sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime());

    return NextResponse.json({ teams: teams || [], players: players || [], stats: allStats });
  } catch (error: any) {
    console.error('讀取資料例外:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 這幾個 action 都會寫入/刪除資料，一律要求先登入
    const writeActions = ['addTeam', 'addPlayersBulk', 'addStatsBulk', 'deletePlayer', 'deleteStat'];
    const email = writeActions.includes(action) ? await getUserEmail() : null;

    if (writeActions.includes(action) && !email) {
      return NextResponse.json({ error: '請先使用 Google 帳號登入' }, { status: 401 });
    }

    // 新增球隊功能已停用：請直接在 Supabase 後台的 teams 資料表新增
    if (action === 'addTeam') {
      return NextResponse.json(
        { error: '此功能已停用，請直接於 Supabase 後台新增球隊' },
        { status: 403 }
      );
    }

    // 1. 批量新增球員（只有對該球隊有權限的 email 才能新增）
    if (action === 'addPlayersBulk') {
      const playersList = body.playersList || [];

      const involvedTeamIds = [...new Set(playersList.map((p: any) => p.team_id))];
      for (const teamId of involvedTeamIds) {
        const ok = await hasTeamPermission(email, teamId);
        if (!ok) {
          return NextResponse.json({ error: '您沒有權限為該球隊新增球員' }, { status: 403 });
        }
      }

      const { error } = await supabase.from('players').insert(playersList);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    // 2. 批量新增比賽數據（依球員反查所屬球隊，逐一檢查權限）
    if (action === 'addStatsBulk') {
      const { statsList } = body;

      const playerIds = [...new Set(statsList.map((s: any) => s.playerId))];
      const { data: playerRows, error: playerErr } = await supabase
        .from('players')
        .select('id, team_id')
        .in('id', playerIds);

      if (playerErr) {
        return NextResponse.json({ error: playerErr.message }, { status: 400 });
      }

      const teamOfPlayer: Record<string, any> = {};
      (playerRows || []).forEach((p: any) => {
        teamOfPlayer[String(p.id)] = p.team_id;
      });

      const involvedTeamIds = [...new Set(Object.values(teamOfPlayer))];
      for (const teamId of involvedTeamIds) {
        const ok = await hasTeamPermission(email, teamId);
        if (!ok) {
          return NextResponse.json({ error: '您沒有權限為該球隊輸入數據' }, { status: 403 });
        }
      }

      for (const entry of statsList) {
        const { playerId, gameDate, type, ...stats } = entry;

        const table = type === 'pitcher' ? 'pitcher_stats' : 'fielder_stats';

        let payload;

        if (type === 'pitcher') {
          payload = {
            player_id: playerId,
            game_date: gameDate || new Date().toISOString(),
            w: stats.w,
            l: stats.l,
            g: stats.g,
            gs: stats.gs,
            ip: stats.ip,
            h: stats.h,
            r: stats.r,
            er: stats.er,
            bb: stats.bb,
            so: stats.so
          };
        } else {
          payload = {
            player_id: playerId,
            game_date: gameDate || new Date().toISOString(),
            ab: stats.ab,
            h: stats.h,
            single: stats.single,
            double: stats.double,
            triple: stats.triple,
            hr: stats.hr,
            r: stats.r,
            rbi: stats.rbi,
            so: stats.so,
            bb: stats.bb,
            sf: stats.sf,
            sb: stats.sb
          };
        }

        const { error } = await supabase.from(table).insert([payload]);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      }
      return NextResponse.json({ success: true });
    }

    // 3. 刪除球員（原本前端有呼叫，但後端一直沒有實作，這裡補上）
    if (action === 'deletePlayer') {
      const { playerId } = body;

      const { data: player, error: findErr } = await supabase
        .from('players')
        .select('team_id')
        .eq('id', playerId)
        .maybeSingle();

      if (findErr) return NextResponse.json({ error: findErr.message }, { status: 400 });
      if (!player) return NextResponse.json({ error: '找不到該球員' }, { status: 404 });

      const ok = await hasTeamPermission(email, player.team_id);
      if (!ok) {
        return NextResponse.json({ error: '您沒有權限刪除該球隊的球員' }, { status: 403 });
      }

      // 先刪掉這位球員名下的比賽數據，避免外鍵限制擋住刪除
      await supabase.from('fielder_stats').delete().eq('player_id', playerId);
      await supabase.from('pitcher_stats').delete().eq('player_id', playerId);

      const { error } = await supabase.from('players').delete().eq('id', playerId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    // 4. 刪除單筆比賽數據（原本前端有呼叫，但後端一直沒有實作，這裡補上）
    if (action === 'deleteStat') {
      const { statId, type } = body;
      const table = type === 'pitcher' ? 'pitcher_stats' : 'fielder_stats';

      const { data: stat, error: statErr } = await supabase
        .from(table)
        .select('player_id')
        .eq('id', statId)
        .maybeSingle();

      if (statErr) return NextResponse.json({ error: statErr.message }, { status: 400 });
      if (!stat) return NextResponse.json({ error: '找不到該筆資料' }, { status: 404 });

      const { data: player, error: playerErr } = await supabase
        .from('players')
        .select('team_id')
        .eq('id', stat.player_id)
        .maybeSingle();

      if (playerErr) return NextResponse.json({ error: playerErr.message }, { status: 400 });
      if (!player) return NextResponse.json({ error: '找不到對應球員' }, { status: 404 });

      const ok = await hasTeamPermission(email, player.team_id);
      if (!ok) {
        return NextResponse.json({ error: '您沒有權限刪除該球隊的數據' }, { status: 403 });
      }

      const { error } = await supabase.from(table).delete().eq('id', statId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
