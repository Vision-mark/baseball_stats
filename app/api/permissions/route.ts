import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const supabase = createAdminClient();

export async function GET() {
  const authClient = await createServerSupabase();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ email: null, teamIds: [] });
  }

  const email = user.email.toLowerCase();

  // 先看是不是超級管理員：是的話直接回傳「所有球隊」
  const { data: admin } = await supabase
    .from('super_admins')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  if (admin) {
    const { data: allTeams, error: teamsErr } = await supabase.from('teams').select('id');
    if (teamsErr) {
      return NextResponse.json({ email, teamIds: [], error: teamsErr.message });
    }
    return NextResponse.json({
      email,
      teamIds: (allTeams || []).map((t: any) => String(t.id)),
      isSuperAdmin: true,
    });
  }

  const { data: perms, error } = await supabase
    .from('team_permissions')
    .select('team_id')
    .eq('email', email);

  if (error) {
    return NextResponse.json({ email, teamIds: [], error: error.message });
  }

  return NextResponse.json({
    email,
    teamIds: (perms || []).map((p: any) => String(p.team_id)),
  });
}
