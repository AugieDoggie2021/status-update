import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardSplit from '@/components/dashboard/DashboardSplit';

// This route requires authentication and uses cookies, so it must be dynamic
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <main className="p-4 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 min-h-screen">
      <DashboardSplit />
    </main>
  );
}

