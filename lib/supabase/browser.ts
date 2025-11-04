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
  
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') {
            return [];
          }
          
          // Parse document.cookie (format: "name1=value1; name2=value2")
          return document.cookie.split(';').map(cookie => {
            const trimmed = cookie.trim();
            if (!trimmed) return null;
            
            const [name, ...rest] = trimmed.split('=');
            const value = rest.join('=');
            
            return {
              name: name.trim(),
              value: value ? decodeURIComponent(value) : ''
            };
          }).filter((c): c is { name: string; value: string } => c !== null && !!c.name);
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined' || typeof window === 'undefined') {
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
            
            // Set the cookie
            document.cookie = cookieString;
            
            // Log in development for debugging
            if (process.env.NODE_ENV === 'development') {
              const isVerifier = name.toLowerCase().includes('verifier') || name.toLowerCase().includes('code-verifier');
              if (isVerifier) {
                console.log('[Auth] Set PKCE verifier cookie:', {
                  name,
                  valueLength: value.length,
                  attributes: cookieString.substring(name.length + value.length + 1),
                  cookieString: cookieString.substring(0, 100) + '...'
                });
              }
            }
          });
        },
      },
    }
  );

  // Log OAuth flow in development
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && process.env.NODE_ENV === 'development') {
    const originalAuth = client.auth;
    
    const originalSignInWithOAuth = originalAuth.signInWithOAuth.bind(originalAuth);
    originalAuth.signInWithOAuth = async function(options) {
      console.log('[Auth] Starting OAuth flow:', {
        provider: options.provider,
        redirectTo: options.options?.redirectTo,
        currentOrigin: window.location.origin,
        cookiesBefore: document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(Boolean),
      });
      
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
        
        console.log('[Auth] After OAuth call:', {
          totalCookies: allCookies.length,
          pkceCookies: pkceCookies.map(c => c.name),
          allCookieNames: allCookies.map(c => c.name)
        });
      }, 200);
      
      return result;
    };
  }

  return client;
}

