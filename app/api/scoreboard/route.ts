import { NextResponse } from 'next/server';
import { adminDb as supabase, getUserEmail, hasTeamPermission } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('game_id');
  if (!gameId) return NextResponse.json({ error: '缺少 game_id' }, { status: 400 });

  const [{ data: scores, error: scoreErr }, { data: totals, error: totalErr }] = await Promise.all([
    supabase.from('innings_score').select('*').eq('game_id', gameId),
    supabase.from('game_team_totals').select('*').eq('game_id', gameId),
  ]);

  if (scoreErr) return NextResponse.json({ error: scoreErr.message }, { status: 500 });
  if (totalErr) return NextResponse.json({ error: totalErr.message }, { status: 500 });

  return NextResponse.json({ scores: scores || [], totals: totals || [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = await getUserEmail();
    if (!email) return NextResponse.json({ error: '請先登入' }, { status: 401 });

    if (body.action === 'saveInning') {
      const { gameId, teamId, inning, runs } = body;

      const ok = await hasTeamPermission(email, teamId);
      if (!ok) {
        return NextResponse.json({ error: '您沒有權限填寫該球隊的記分板' }, { status: 403 });
      }

      const { error } = await supabase
        .from('innings_score')
        .upsert(
          [{ game_id: gameId, team_id: teamId, inning, runs: runs || 0 }],
          { onConflict: 'game_id,team_id,inning' }
        );

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    // 總安打數：存在 games 表的 home_hits / away_hits 欄位
    if (body.action === 'saveHits') {
      const { gameId, teamId, hits } = body;

      const ok = await hasTeamPermission(email, teamId);
      if (!ok) {
        return NextResponse.json({ error: '您沒有權限填寫該球隊的安打數' }, { status: 403 });
      }

      const { data: game, error: gameErr } = await supabase
        .from('games')
        .select('home_team_id, away_team_id')
        .eq('id', gameId)
        .maybeSingle();

      if (gameErr) return NextResponse.json({ error: gameErr.message }, { status: 400 });
      if (!game) return NextResponse.json({ error: '找不到該場比賽' }, { status: 404 });

      const column = String(game.home_team_id) === String(teamId) ? 'home_hits' : 'away_hits';

      const { error } = await supabase.from('games').update({ [column]: hits || 0 }).eq('id', gameId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'saveHits') {
      const { gameId, teamId, hits } = body;

      const ok = await hasTeamPermission(email, teamId);
      if (!ok) {
        return NextResponse.json({ error: '您沒有權限填寫該球隊的安打數' }, { status: 403 });
      }

      const { error } = await supabase
        .from('game_team_totals')
        .upsert(
          [{ game_id: gameId, team_id: teamId, hits: hits || 0 }],
          { onConflict: 'game_id,team_id' }
        );

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
