"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

function SignInForm() {
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  // Check for error from callback
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setErr(decodeURIComponent(error));
    }
  }, [searchParams]);

  // Construct redirect URL: prefer NEXT_PUBLIC_BASE_URL (set in Vercel), otherwise use current origin
  // Note: Supabase dashboard must also have this URL in Site URL and Redirect URLs settings
  const getRedirectUrl = () => {
    if (typeof window === "undefined") {
      return `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/auth/callback`;
    }
    // In client: use env var if available, otherwise current origin
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    return `${baseUrl}/auth/callback`;
  };
  const redirectTo = getRedirectUrl();

  async function sendMagic(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  async function signWithGoogle() {
    setErr(null); setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo }
    });
    setLoading(false);
    if (error) setErr(error.message);
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
