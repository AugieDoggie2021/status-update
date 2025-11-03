"use client";

import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out error:", error.message);
      return;
    }
    // Clear session and refresh router to update server components
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

