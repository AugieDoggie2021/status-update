import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardSplit from '@/components/dashboard/DashboardSplit';

// This route requires authentication and uses cookies, so it must be dynamic
export const dynamic = 'force-dynamic';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <main className="p-4 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 min-h-screen overflow-x-hidden">
      <DashboardSplit programId={PROGRAM_ID || undefined} />
    </main>
  );
}

