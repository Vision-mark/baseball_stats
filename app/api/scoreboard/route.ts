import { NextResponse } from 'next/server';
import { adminDb as supabase, getUserEmail, hasTeamPermission } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('game_id');
  if (!gameId) return NextResponse.json({ error: '缺少 game_id' }, { status: 400 });

  const { data, error } = await supabase.from('innings_score').select('*').eq('game_id', gameId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scores: data || [] });
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

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
