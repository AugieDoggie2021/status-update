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

  // Get cookies from request headers directly
  const requestHeaders = new Headers(request.headers);
  const cookieHeader = requestHeaders.get('cookie') || '';
  console.log('[auth/callback] Raw cookie header:', cookieHeader.substring(0, 200));

  const cookieStore = await cookies();
  const response = NextResponse.redirect(`${origin}${redirectTo}`);

  // Force read cookies immediately to ensure they're available
  const allCookies = cookieStore.getAll();
  console.log('[auth/callback] Cookies from cookieStore:', allCookies.map(c => c.name).join(', '));
  
  // Debug: Check for PKCE verifier cookie - Supabase SSR uses this format
  const verifierCookie = allCookies.find(c => 
    c.name.includes('code_verifier') || 
    c.name.includes('verifier') ||
    (c.name.startsWith('sb-') && c.name.includes('code-verifier'))
  );
  
  if (!verifierCookie) {
    console.warn('[auth/callback] No PKCE verifier cookie found in cookieStore');
    console.warn('[auth/callback] All cookies:', JSON.stringify(allCookies.map(c => ({ name: c.name, valueLength: c.value?.length || 0 })), null, 2));
    
    // Try to find it in raw cookie header
    const verifierInHeader = cookieHeader.match(/sb-[^=]+code-verifier[^=]*=([^;]+)/);
    if (verifierInHeader) {
      console.log('[auth/callback] Found verifier in raw cookie header (but not in cookieStore)');
    }
  } else {
    console.log('[auth/callback] Found PKCE verifier cookie:', verifierCookie.name, 'value length:', verifierCookie.value?.length || 0);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Return all cookies from the store
          const cookies = cookieStore.getAll();
          console.log('[auth/callback] createServerClient.getAll() called, returning', cookies.length, 'cookies');
          return cookies;
        },
        setAll(cookiesToSet) {
          console.log('[auth/callback] createServerClient.setAll() called with', cookiesToSet.length, 'cookies');
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] Exchange error:', {
      message: error.message,
      status: error.status,
      code: error.code,
      name: error.name,
      availableCookies: allCookies.map(c => c.name),
      hasVerifier: !!verifierCookie
    });
    
    // Return detailed error for debugging
    const errorDetails = {
      message: error.message,
      status: error.status,
      code: error.code,
      cookieCount: allCookies.length,
      cookieNames: allCookies.map(c => c.name),
      hasVerifier: !!verifierCookie
    };
    
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent(error.message)}&details=${encodeURIComponent(JSON.stringify(errorDetails))}`
    );
  }

  if (!data?.session) {
    console.error('[auth/callback] No session returned from exchange');
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent('No session returned from authentication')}`
    );
  }

  console.log('[auth/callback] Successfully exchanged code for session');
  return response;
}
