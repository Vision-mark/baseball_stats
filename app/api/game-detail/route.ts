import { NextResponse } from 'next/server';
import { adminDb as supabase } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('id');
  if (!gameId) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

  const [gameRes, teamsRes, playersRes, lineupsRes, scoresRes, fielderRes, pitcherRes] = await Promise.all([
    supabase.from('games').select('*').eq('id', gameId).maybeSingle(),
    supabase.from('teams').select('*'),
    supabase.from('players').select('*'),
    supabase.from('lineups').select('*').eq('game_id', gameId).order('batting_order').order('sub_order'),
    supabase.from('innings_score').select('*').eq('game_id', gameId),
    supabase.from('fielder_stats').select('*').eq('game_id', gameId),
    supabase.from('pitcher_stats').select('*').eq('game_id', gameId),
  ]);

  const firstError = gameRes.error || teamsRes.error || playersRes.error || lineupsRes.error
    || scoresRes.error || fielderRes.error || pitcherRes.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json({
    game: gameRes.data || null,
    teams: teamsRes.data || [],
    players: playersRes.data || [],
    lineups: lineupsRes.data || [],
    scores: scoresRes.data || [],
    fielderStats: fielderRes.data || [],
    pitcherStats: pitcherRes.data || [],
  });
}
