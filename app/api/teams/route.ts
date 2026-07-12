import { NextResponse } from 'next/server';
import { adminDb as supabase } from '@/lib/auth-helpers';

export async function GET() {
  const { data: teams, error: teamsErr } = await supabase.from('teams').select('*');
  const { data: players, error: playersErr } = await supabase.from('players').select('*');

  const firstError = teamsErr || playersErr;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json({ teams: teams || [], players: players || [] });
}
