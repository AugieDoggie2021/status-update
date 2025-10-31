"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function SignOutButton() {
  const supabase = createClientComponentClient();

  async function signOut() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") window.location.href = "/auth/sign-in";
  }

  return (
    <button
      onClick={signOut}
      className="rounded-xl px-3 py-2 bg-white/80 border hover:bg-white transition ml-2"
      aria-label="Sign out"
    >
      Sign out
    </button>
  );
}

