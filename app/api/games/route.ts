import { NextResponse } from 'next/server';
import { adminDb as supabase, getUserEmail, isSuperAdmin } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('league_id');
  const id = searchParams.get('id');

  let query = supabase.from('games').select('*').order('game_date', { ascending: true });
  if (leagueId) query = query.eq('league_id', leagueId);
  if (id) query = query.eq('id', id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ games: data || [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = await getUserEmail();

    if (!email || !(await isSuperAdmin(email))) {
      return NextResponse.json({ error: '只有聯盟管理員可以排賽程' }, { status: 403 });
    }

    if (body.action === 'addGame') {
      const { leagueId, stage, gameNumber, gameDate, homeTeamId, awayTeamId } = body;

      if (!leagueId || !stage || !homeTeamId || !awayTeamId) {
        return NextResponse.json({ error: '資料不完整，請確認聯盟、賽段、主客隊都有選' }, { status: 400 });
      }
      if (homeTeamId === awayTeamId) {
        return NextResponse.json({ error: '主隊跟客隊不能是同一支球隊' }, { status: 400 });
      }

      const { error } = await supabase.from('games').insert([{
        league_id: leagueId,
        stage,
        game_number: gameNumber || null,
        game_date: gameDate || null,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
      }]);

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'deleteGame') {
      const { error } = await supabase.from('games').delete().eq('id', body.gameId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
