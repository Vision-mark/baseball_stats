import { createClient } from '@supabase/supabase-js';

// ⚠️ 只能在伺服器端的程式（route.ts 等）裡 import 這個檔案。
// SUPABASE_SERVICE_ROLE_KEY 沒有 NEXT_PUBLIC_ 前綴，Next.js 不會把它打包進瀏覽器端程式碼，
// 但還是要小心：千萬不要把這個 client 傳到任何 'use client' 元件裡使用。
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
