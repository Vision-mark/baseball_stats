import { NextResponse } from 'next/server';
import { adminDb as supabase, getUserEmail, isSuperAdmin } from '@/lib/auth-helpers';

export async function GET() {
  const { data, error } = await supabase.from('leagues').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leagues: data || [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = await getUserEmail();

    if (!email || !(await isSuperAdmin(email))) {
      return NextResponse.json({ error: '只有聯盟管理員可以管理聯盟' }, { status: 403 });
    }

    if (body.action === 'addLeague') {
      const name = (body.name || '').trim();
      if (!name) return NextResponse.json({ error: '請輸入聯盟名稱' }, { status: 400 });

      const { error } = await supabase.from('leagues').insert([{ name }]);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'deleteLeague') {
      const { error } = await supabase.from('leagues').delete().eq('id', body.leagueId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
