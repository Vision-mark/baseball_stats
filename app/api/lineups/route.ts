import { NextResponse } from 'next/server';
import { adminDb as supabase, getUserEmail, hasTeamPermission } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('game_id');
  if (!gameId) return NextResponse.json({ error: '缺少 game_id' }, { status: 400 });

  const { data, error } = await supabase
    .from('lineups')
    .select('*')
    .eq('game_id', gameId)
    .order('batting_order', { ascending: true })
    .order('sub_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lineups: data || [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = await getUserEmail();
    if (!email) return NextResponse.json({ error: '請先登入' }, { status: 401 });

    // 整隊儲存：把某場比賽、某隊的簡表整份覆蓋掉重存
    // entries: [{ batting_order, sub_order, player_id }]
    if (body.action === 'saveLineup') {
      const { gameId, teamId, entries } = body;

      const ok = await hasTeamPermission(email, teamId);
      if (!ok) {
        return NextResponse.json({ error: '您沒有權限編輯該球隊的簡表' }, { status: 403 });
      }

      const { error: deleteErr } = await supabase
        .from('lineups')
        .delete()
        .eq('game_id', gameId)
        .eq('team_id', teamId);

      if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 400 });

      const rows = (entries || [])
        .filter((e: any) => e.player_id)
        .map((e: any) => ({
          game_id: gameId,
          team_id: teamId,
          batting_order: e.batting_order,
          sub_order: e.sub_order || 0,
          player_id: e.player_id,
        }));

      if (rows.length > 0) {
        const { error: insertErr } = await supabase.from('lineups').insert(rows);
        if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
