"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createBrowserClientSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return document.cookie.split(';').map(cookie => {
            const [name, ...rest] = cookie.trim().split('=');
            return { name, value: decodeURIComponent(rest.join('=')) };
          }).filter(c => c.name && c.value);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Ensure cookies are set with SameSite=None and Secure for cross-site OAuth redirects
            const isProduction = window.location.protocol === 'https:';
            const cookieString = [
              `${name}=${encodeURIComponent(value)}`,
              `path=${options?.path || '/'}`,
              `SameSite=None`, // Required for cross-site redirects
              isProduction ? 'Secure' : '', // Secure only in production (HTTPS)
              options?.maxAge ? `max-age=${options.maxAge}` : '',
            ].filter(Boolean).join('; ');
            document.cookie = cookieString;
          });
        },
      },
    }
  );
}

