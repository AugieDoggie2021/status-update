"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for browser usage.
 * 
 * CRITICAL: We MUST provide cookie handlers because @supabase/ssr needs them
 * to store PKCE code verifier cookies for cross-site OAuth redirects.
 * Without explicit cookie handlers, it may use localStorage which won't work
 * for cross-site redirects (Your App → Google → Supabase → Your Callback).
 * 
 * Cookie attributes must be:
 * - SameSite=None (required for cross-site redirects)
 * - Secure=true (required when SameSite=None, only in production/HTTPS)
 * - Path=/ (to ensure cookie is accessible everywhere)
 */
export function createBrowserClientSupabase() {
  const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:';
  
  // ALWAYS log initialization (not just in development)
  if (typeof window !== 'undefined') {
    console.log('[Auth] Initializing Supabase browser client:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      isProduction,
      currentOrigin: window.location.origin,
      hasDocument: typeof document !== 'undefined'
    });
  }
  
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') {
            console.warn('[Auth] getAll() called but document is undefined');
            return [];
          }
          
          // Parse document.cookie (format: "name1=value1; name2=value2")
          const cookies = document.cookie.split(';').map(cookie => {
            const trimmed = cookie.trim();
            if (!trimmed) return null;
            
            const [name, ...rest] = trimmed.split('=');
            const value = rest.join('=');
            
            return {
              name: name.trim(),
              value: value ? decodeURIComponent(value) : ''
            };
          }).filter((c): c is { name: string; value: string } => c !== null && !!c.name);
          
          // ALWAYS log when getAll is called (for debugging)
          console.log('[Auth] getAll() called, returning', cookies.length, 'cookies:', cookies.map(c => c.name));
          
          return cookies;
        },
        setAll(cookiesToSet) {
          console.log('[Auth] setAll() called with', cookiesToSet.length, 'cookies to set');
          
          if (typeof document === 'undefined' || typeof window === 'undefined') {
            console.error('[Auth] setAll() called but document/window is undefined!');
            return;
          }
          
          cookiesToSet.forEach(({ name, value, options }) => {
            // Build cookie string with required attributes for cross-site OAuth
            const cookieParts = [
              `${name}=${encodeURIComponent(value)}`,
              `Path=${options?.path || '/'}`,
              `SameSite=None`, // CRITICAL: Required for cross-site redirects
              isProduction ? 'Secure' : '', // Required when SameSite=None in production
            ];
            
            // Add maxAge if provided
            if (options?.maxAge) {
              cookieParts.push(`Max-Age=${options.maxAge}`);
            }
            
            // Add expires if provided (as fallback)
            if (options?.expires) {
              cookieParts.push(`Expires=${options.expires.toUTCString()}`);
            }
            
            // Filter out empty parts and join
            const cookieString = cookieParts.filter(Boolean).join('; ');
            
            // ALWAYS log cookie setting (not just in development)
            const isVerifier = name.toLowerCase().includes('verifier') || name.toLowerCase().includes('code-verifier');
            console.log(`[Auth] Setting cookie: ${name}`, {
              isVerifier,
              valueLength: value.length,
              attributes: cookieString.substring(name.length + value.length + 1),
              cookieString: cookieString.substring(0, 150)
            });
            
            // Set the cookie
            try {
              document.cookie = cookieString;
              
              // Verify it was set
              setTimeout(() => {
                const verifyCookie = document.cookie.split(';').find(c => c.trim().startsWith(name + '='));
                if (verifyCookie) {
                  console.log(`[Auth] ✅ Cookie ${name} verified as set`);
                } else {
                  console.error(`[Auth] ❌ Cookie ${name} was NOT set! Browser may have rejected it.`);
                  console.error(`[Auth] Cookie string was: ${cookieString.substring(0, 200)}`);
                }
              }, 50);
            } catch (error) {
              console.error(`[Auth] ❌ Error setting cookie ${name}:`, error);
            }
          });
        },
      },
    }
  );

  // ALWAYS log OAuth flow (not just in development)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const originalAuth = client.auth;
    
    const originalSignInWithOAuth = originalAuth.signInWithOAuth.bind(originalAuth);
    originalAuth.signInWithOAuth = async function(options) {
      console.log('[Auth] ===== STARTING OAUTH FLOW =====');
      console.log('[Auth] Provider:', options.provider);
      console.log('[Auth] RedirectTo:', options.options?.redirectTo);
      console.log('[Auth] Current origin:', window.location.origin);
      console.log('[Auth] Cookies BEFORE OAuth call:', document.cookie || '(none)');
      console.log('[Auth] Cookie names BEFORE:', document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(Boolean));
      
      const result = await originalSignInWithOAuth(options);
      
      // Log after a brief delay to see if cookie was set
      setTimeout(() => {
        const allCookies = document.cookie.split(';').map(c => {
          const [name, ...rest] = c.trim().split('=');
          return { name, hasValue: rest.length > 0 && rest.join('=').length > 0 };
        }).filter(c => c.name);
        
        const pkceCookies = allCookies.filter(c => 
          c.name.toLowerCase().includes('verifier') || 
          c.name.toLowerCase().includes('code-verifier')
        );
        
        console.log('[Auth] ===== AFTER OAUTH CALL =====');
        console.log('[Auth] Total cookies:', allCookies.length);
        console.log('[Auth] All cookie names:', allCookies.map(c => c.name));
        console.log('[Auth] PKCE cookies found:', pkceCookies.length, pkceCookies.map(c => c.name));
        console.log('[Auth] Full cookie string:', document.cookie || '(none)');
        
        if (pkceCookies.length === 0) {
          console.error('[Auth] ❌ NO PKCE COOKIES FOUND! This will cause authentication to fail.');
        }
      }, 300);
      
      return result;
    };
  }

  return client;
}

