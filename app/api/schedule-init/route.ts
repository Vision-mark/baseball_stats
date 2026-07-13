import { NextResponse } from 'next/server';
import { adminDb as supabase } from '@/lib/auth-helpers';

export async function GET() {
  const [leaguesRes, teamsRes] = await Promise.all([
    supabase.from('leagues').select('*').order('created_at', { ascending: false }),
    supabase.from('teams').select('*'),
  ]);

  const firstError = leaguesRes.error || teamsRes.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json({
    leagues: leaguesRes.data || [],
    teams: teamsRes.data || [],
  });
}
