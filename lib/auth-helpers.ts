import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// 所有新功能的資料庫讀寫都走這個 service role client
export const adminDb = createAdminClient();

// 取得目前登入者的 email（未登入回傳 null）
export async function getUserEmail(): Promise<string | null> {
  const authClient = await createServerSupabase();
  const { data: { user } } = await authClient.auth.getUser();
  return user?.email ? user.email.toLowerCase() : null;
}

// 是否為超級管理員（可以排賽程、管理所有球隊）
export async function isSuperAdmin(email: string | null): Promise<boolean> {
  if (!email) return false;
  const { data } = await adminDb.from('super_admins').select('email').eq('email', email).maybeSingle();
  return !!data;
}

// 是否對指定球隊有權限（超級管理員對所有球隊都算有權限）
export async function hasTeamPermission(email: string | null, teamId: any): Promise<boolean> {
  if (!email || teamId === undefined || teamId === null || teamId === '') return false;
  if (await isSuperAdmin(email)) return true;

  const { data } = await adminDb
    .from('team_permissions')
    .select('id')
    .eq('email', email)
    .eq('team_id', teamId)
    .maybeSingle();

  return !!data;
}
