import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect_to") || "/dashboard";
  
  // Trim any whitespace from origin (fixes Supabase URL parsing error)
  const cleanOrigin = origin.trim();

  if (!code) {
    return NextResponse.redirect(`${cleanOrigin}/auth/sign-in?error=missing_code`);
  }

  // Get cookies from request headers directly
  const requestHeaders = new Headers(request.headers);
  const cookieHeader = requestHeaders.get('cookie') || '';
  console.log('[auth/callback] Raw cookie header:', cookieHeader.substring(0, 200));

  const cookieStore = await cookies();
  
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
  } else {
    console.log('[auth/callback] Found PKCE verifier cookie:', verifierCookie.name, 'value length:', verifierCookie.value?.length || 0);
  }

  // Create response AFTER reading cookies but BEFORE creating supabase client
  // Use cleanOrigin to avoid URL parsing errors from leading spaces
  const response = NextResponse.redirect(`${cleanOrigin}${redirectTo}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Return all cookies from the store - ensure we're returning the actual cookie objects
          const cookies = cookieStore.getAll();
          console.log('[auth/callback] createServerClient.getAll() called, returning', cookies.length, 'cookies:', cookies.map(c => c.name).join(', '));
          return cookies;
        },
        setAll(cookiesToSet) {
          console.log('[auth/callback] createServerClient.setAll() called with', cookiesToSet.length, 'cookies');
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
              response.cookies.set(name, value, options);
            } catch (err) {
              // Ignore errors in route handlers
              console.warn('[auth/callback] Error setting cookie:', name, err);
            }
          });
        },
      },
    }
  );

  // Call exchangeCodeForSession - Supabase SSR should handle PKCE automatically
  // The createServerClient should read the code verifier from cookies automatically
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
      `${cleanOrigin}/auth/sign-in?error=${encodeURIComponent(error.message)}&details=${encodeURIComponent(JSON.stringify(errorDetails))}`
    );
  }

  if (!data?.session) {
    console.error('[auth/callback] No session returned from exchange');
    return NextResponse.redirect(
      `${cleanOrigin}/auth/sign-in?error=${encodeURIComponent('No session returned from authentication')}`
    );
  }

  console.log('[auth/callback] Successfully exchanged code for session');
  return response;
}
