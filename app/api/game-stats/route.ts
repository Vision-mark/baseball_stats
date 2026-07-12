import { NextResponse } from 'next/server';
import { adminDb as supabase } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('game_id');
  if (!gameId) return NextResponse.json({ error: '缺少 game_id' }, { status: 400 });

  const { data: fielderStats, error: fielderErr } = await supabase
    .from('fielder_stats').select('*').eq('game_id', gameId);
  const { data: pitcherStats, error: pitcherErr } = await supabase
    .from('pitcher_stats').select('*').eq('game_id', gameId);

  const firstError = fielderErr || pitcherErr;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json({
    fielderStats: fielderStats || [],
    pitcherStats: pitcherStats || [],
  });
}
