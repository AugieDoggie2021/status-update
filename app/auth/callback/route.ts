import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect_to") || "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(new URL(redirectTo, process.env.NEXT_PUBLIC_BASE_URL || origin));
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: {
            getItem: (key: string) => {
              const cookie = cookieStore.get(key);
              return cookie?.value ?? null;
            },
            setItem: (key: string, value: string) => {
              cookieStore.set(key, value, { 
                path: '/', 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 365
              });
              // Also set in response headers
              response.cookies.set(key, value, {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 365
              });
            },
            removeItem: (key: string) => {
              cookieStore.delete(key);
              response.cookies.delete(key);
            },
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] Error exchanging code:', error.message);
      return NextResponse.redirect(`${origin}/auth/sign-in?error=${encodeURIComponent(error.message)}`);
    }

    // Success - redirect with cookies set
    return response;
  }

  // No code - redirect to sign-in with error
  return NextResponse.redirect(`${origin}/auth/sign-in?error=No%20code%20provided`);
}
