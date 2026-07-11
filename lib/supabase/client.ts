import { createBrowserClient } from '@supabase/ssr';

// 給「瀏覽器端」（'use client' 元件）使用，會自動把登入 session 存在 cookie 裡
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
