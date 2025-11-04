import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ensureAdminMembership, normalizeEmail, getDefaultProgramId } from "@/lib/authz";
import { getAdminClient } from "@/lib/supabase";

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
  
  // Parse raw cookie header manually to see ALL cookies
  const rawCookies = cookieHeader.split(';').map(c => c.trim()).filter(Boolean);
  console.log('[auth/callback] ===== CALLBACK STARTED =====');
  console.log('[auth/callback] Request URL:', request.url);
  console.log('[auth/callback] Origin:', cleanOrigin);
  console.log('[auth/callback] Code:', code ? `${code.substring(0, 20)}...` : 'MISSING');
  console.log('[auth/callback] Raw cookie header length:', cookieHeader.length);
  console.log('[auth/callback] Raw cookie count (parsed):', rawCookies.length);
  console.log('[auth/callback] Raw cookie names:', rawCookies.map(c => {
    const [name] = c.split('=');
    return name;
  }).join(', ') || 'NONE');
  
  // Check for PKCE verifier in raw header
  const verifierInHeader = rawCookies.find(c => 
    c.includes('code_verifier') || 
    c.includes('verifier') ||
    c.includes('code-verifier')
  );
  console.log('[auth/callback] PKCE verifier in raw header:', verifierInHeader ? 'YES' : 'NO');

  const cookieStore = await cookies();
  
  // Force read cookies immediately to ensure they're available
  const allCookies = cookieStore.getAll();
  console.log('[auth/callback] CookieStore cookie count:', allCookies.length);
  console.log('[auth/callback] CookieStore cookie names:', allCookies.map(c => c.name).join(', ') || 'NONE');
  
  // Debug: Check for PKCE verifier cookie - Supabase SSR uses this format
  // Try multiple patterns
  const verifierCookie = allCookies.find(c => {
    const name = c.name.toLowerCase();
    return name.includes('code_verifier') || 
           name.includes('verifier') ||
           name.includes('code-verifier') ||
           (name.startsWith('sb-') && name.includes('verifier'));
  });
  
  if (!verifierCookie) {
    console.error('[auth/callback] ❌ NO PKCE VERIFIER COOKIE FOUND');
    console.error('[auth/callback] All cookies from cookieStore:', JSON.stringify(
      allCookies.map(c => ({ 
        name: c.name, 
        valueLength: c.value?.length || 0,
        hasValue: !!c.value && c.value.length > 0
      })), 
      null, 
      2
    ));
    console.error('[auth/callback] This is the root cause - cookie not received by server');
  } else {
    console.log('[auth/callback] ✅ Found PKCE verifier cookie:', verifierCookie.name);
    console.log('[auth/callback] Verifier value length:', verifierCookie.value?.length || 0);
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

  // Admin bootstrap logic
  try {
    const user = data.session.user;
    const userEmail = normalizeEmail(user.email);
    const userId = user.id;

    if (!userEmail || !userId) {
      console.warn('[auth/callback] Missing user email or ID, skipping bootstrap');
    } else {
      // Check if this is the first user (fresh DB)
      // If no memberships exist, this is the first user to get access
      const supabaseAdmin = getAdminClient();
      const { count } = await supabaseAdmin
        .from('program_memberships')
        .select('*', { count: 'exact', head: true });
      const isFirstUser = (count || 0) === 0;

      // Check if user is in ADMIN_EMAILS
      const adminEmails = process.env.ADMIN_EMAILS
        ? process.env.ADMIN_EMAILS.split(',').map(e => normalizeEmail(e.trim())).filter(Boolean)
        : [];
      const isAdminEmail = adminEmails.includes(userEmail);

      if (isFirstUser || isAdminEmail) {
        try {
          const programId = getDefaultProgramId();
          await ensureAdminMembership(userEmail, userId, programId);
          console.log(`[auth/callback] Bootstrap: Granted OWNER role to ${userEmail} (first user: ${isFirstUser}, admin email: ${isAdminEmail})`);
        } catch (bootstrapError) {
          // Log but don't fail the auth flow
          console.error('[auth/callback] Bootstrap error (non-fatal):', bootstrapError);
        }
      }
    }
  } catch (bootstrapError) {
    // Log but don't fail the auth flow
    console.error('[auth/callback] Bootstrap check error (non-fatal):', bootstrapError);
  }

  return response;
}
