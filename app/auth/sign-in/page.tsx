"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { createBrowserClientSupabase } from "@/lib/supabase/browser";

function SignInForm() {
  const supabase = useMemo(() => createBrowserClientSupabase(), []);
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  // Check for error from callback
  useEffect(() => {
    const error = searchParams.get("error");
    const details = searchParams.get("details");
    if (error) {
      let errorMsg = decodeURIComponent(error);
      if (details) {
        try {
          const errorDetails = JSON.parse(decodeURIComponent(details));
          errorMsg += `\n\nDebug info:\n- Cookies found: ${errorDetails.cookieCount}\n- Cookie names: ${errorDetails.cookieNames?.join(', ') || 'none'}\n- Has verifier: ${errorDetails.hasVerifier ? 'yes' : 'no'}\n- Error code: ${errorDetails.code || 'unknown'}`;
        } catch (e) {
          // Ignore parse errors
        }
      }
      setErr(errorMsg);
      console.error('[SignIn] Auth error:', error, details ? JSON.parse(decodeURIComponent(details)) : null);
    }
  }, [searchParams]);

  // Use NEXT_PUBLIC_BASE_URL if available (for Vercel), otherwise use current origin
  // CRITICAL: Trim ALL whitespace to prevent Supabase URL parsing errors
  const getRedirectUrl = () => {
    if (typeof window === "undefined") {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const cleanUrl = String(baseUrl).trim().replace(/\s+/g, ''); // Remove ALL whitespace
      return `${cleanUrl}/auth/callback`;
    }
    // Use window.location.origin in browser (most reliable)
    const origin = window.location.origin.trim();
    // Only use env vars if they're explicitly set and different from current origin
    const envUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    const baseUrl = envUrl ? String(envUrl).trim().replace(/\s+/g, '') : origin;
    return `${baseUrl}/auth/callback`;
  };
  const redirectUrl = useMemo(() => getRedirectUrl(), []);
  
  // Log the redirect URL to verify it has no whitespace
  useEffect(() => {
    console.log('[SignIn] Redirect URL constructed:', JSON.stringify(redirectUrl));
    console.log('[SignIn] Redirect URL length:', redirectUrl.length);
    console.log('[SignIn] Redirect URL has whitespace:', /\s/.test(redirectUrl));
  }, [redirectUrl]);

  async function sendMagic(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { 
        emailRedirectTo: `${redirectUrl}?redirect_to=/dashboard`
      }
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      console.error("Magic link error:", error.message);
    } else {
      setSent(true);
    }
  }

  async function signWithGoogle() {
    setErr(null); setLoading(true);
    
    // ALWAYS log before OAuth redirect
    console.log('[SignIn] ===== SIGN IN WITH GOOGLE CLICKED =====');
    console.log('[SignIn] Redirect URL:', redirectUrl);
    console.log('[SignIn] Current origin:', typeof window !== 'undefined' ? window.location.origin : 'SSR');
    
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const cookiesBefore = document.cookie.split(';').map(c => {
        const [name] = c.trim().split('=');
        return name;
      }).filter(Boolean);
      
      console.log('[SignIn] Cookies before OAuth:', cookiesBefore.length, cookiesBefore);
      console.log('[SignIn] Full cookie string before:', document.cookie || '(none)');
      
      const pkceCookiesBefore = document.cookie.split(';').filter(c => 
        c.includes('code-verifier') || c.includes('verifier')
      );
      console.log('[SignIn] PKCE cookies before:', pkceCookiesBefore.length, pkceCookiesBefore);
    }
    
    try {
      // CRITICAL: Ensure redirectTo has NO whitespace - Supabase will fail if it does
      const cleanRedirectTo = `${redirectUrl}?redirect_to=/dashboard`.trim();
      console.log('[SignIn] Final redirectTo passed to Supabase:', JSON.stringify(cleanRedirectTo));
      console.log('[SignIn] redirectTo has whitespace:', /\s/.test(cleanRedirectTo));
      
      const { error, data } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { 
          redirectTo: cleanRedirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) {
        setErr(error.message);
        console.error('[SignIn] ❌ Google OAuth error:', error.message);
        setLoading(false);
      } else {
        console.log('[SignIn] ✅ OAuth call succeeded, redirect initiated');
        console.log('[SignIn] OAuth data:', data);
        
        // Check cookies again after a brief delay
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
          setTimeout(() => {
            console.log('[SignIn] Cookies AFTER OAuth call:', document.cookie || '(none)');
            const cookiesAfter = document.cookie.split(';').map(c => {
              const [name] = c.trim().split('=');
              return name;
            }).filter(Boolean);
            console.log('[SignIn] Cookie names AFTER:', cookiesAfter);
          }, 200);
        }
        
        // Don't set loading to false - redirect will happen
      }
    } catch (error) {
      console.error('[SignIn] ❌ Exception during OAuth:', error);
      setErr(error instanceof Error ? error.message : 'Unknown error');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-emerald-200/40 via-sky-100 to-white">
      <div className="w-full max-w-md rounded-2xl p-8 backdrop-blur-xl bg-white/60 border border-white/30 shadow-xl">
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-slate-600 mt-1">Use a magic link or Google</p>

        <form onSubmit={sendMagic} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-xl border px-4 py-3 bg-white/80 outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send magic link"}
          </button>
        </form>

        <div className="mt-4">
          <button
            onClick={signWithGoogle}
            disabled={loading}
            className="w-full rounded-xl py-3 bg-white text-slate-900 font-medium border hover:bg-slate-50 transition disabled:opacity-60"
          >
            Continue with Google
          </button>
        </div>

        {sent && <p className="mt-4 text-emerald-700">Check your email for a sign-in link.</p>}
        {err && <p className="mt-4 text-rose-700">Error: {err}</p>}
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen grid place-items-center bg-gradient-to-br from-emerald-200/40 via-sky-100 to-white">
        <div className="w-full max-w-md rounded-2xl p-8 backdrop-blur-xl bg-white/60 border border-white/30 shadow-xl">
          <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-slate-600 mt-1">Loading...</p>
        </div>
      </main>
    }>
      <SignInForm />
    </Suspense>
  );
}
