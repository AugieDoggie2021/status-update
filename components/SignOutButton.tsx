"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { createBrowserClientSupabase } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClientSupabase(), []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("signOut error:", error.message);
      return;
    }
    router.push("/auth/sign-in");
    router.refresh();
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

