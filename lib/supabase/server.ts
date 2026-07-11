import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 給「伺服器端」（Route Handler / Server Component）使用
// 會讀取 request 帶來的 cookie，藉此知道目前是誰登入的
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 在單純的 Server Component 裡呼叫 setAll 會丟錯，
            // 只要有 middleware.ts 幫忙刷新 session，這裡可以安全忽略
          }
        },
      },
    }
  );
}
