"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for browser usage.
 * Uses @supabase/ssr's default cookie handling which automatically:
 * - Sets cookies with correct attributes for cross-site OAuth
 * - Handles PKCE code verifier storage
 * - Manages session cookies
 * 
 * We use defaults because @supabase/ssr is specifically designed
 * to handle OAuth redirects and PKCE flow correctly.
 */
export function createBrowserClientSupabase() {
  // Use @supabase/ssr defaults - it handles cookies correctly for OAuth
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Log cookie operations for debugging (only in development)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const originalAuth = client.auth;
    
    // Wrap signInWithOAuth to log before redirect
    const originalSignInWithOAuth = originalAuth.signInWithOAuth.bind(originalAuth);
    originalAuth.signInWithOAuth = async function(options) {
      console.log('[Auth] Starting OAuth flow:', {
        provider: options.provider,
        redirectTo: options.options?.redirectTo,
        currentCookies: document.cookie.split(';').map(c => c.trim().split('=')[0]),
        pkceCookies: document.cookie.split(';').filter(c => c.includes('code-verifier') || c.includes('verifier'))
      });
      
      const result = await originalSignInWithOAuth(options);
      
      // Log after redirect is initiated
      setTimeout(() => {
        console.log('[Auth] After OAuth redirect initiated, cookies:', {
          allCookies: document.cookie.split(';').map(c => {
            const [name, ...rest] = c.trim().split('=');
            return { name, value: rest.join('=').substring(0, 20) + '...' };
          }),
          pkceCookies: document.cookie.split(';').filter(c => c.includes('code-verifier') || c.includes('verifier'))
        });
      }, 100);
      
      return result;
    };
  }

  return client;
}

