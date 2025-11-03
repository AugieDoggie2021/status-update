import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect_to") || "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/sign-in?error=missing_code`);
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(`${origin}${redirectTo}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Force read cookies before exchange - this ensures PKCE verifier is available
  const allCookies = cookieStore.getAll();
  console.log('[auth/callback] Cookies received:', allCookies.map(c => c.name).join(', '));
  
  // Debug: Check for PKCE verifier cookie
  const verifierCookie = allCookies.find(c => c.name.includes('code_verifier') || c.name.includes('verifier'));
  if (!verifierCookie) {
    console.warn('[auth/callback] No PKCE verifier cookie found. Available cookies:', allCookies.map(c => c.name));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] Exchange error:', error.message);
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent(error.message)}`
    );
  }

  return response;
}
