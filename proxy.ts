import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    // 嘗試刷新登入 token；如果 refresh token 已經失效（例如過期、被撤銷、或殘留舊的無效 cookie），
    // Supabase 會丟出 AuthApiError，這裡接住它，順便把壞掉的登入 cookie 清掉，
    // 避免每次請求都重複噴一樣的錯誤、也讓使用者能正常重新登入。
    const { error } = await supabase.auth.getUser();
    if (error) {
      supabase.auth.signOut().catch(() => {});
    }
  } catch {
    // 忽略非預期的例外，不要讓 proxy 整個掛掉
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
