import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DeletedWorkstreams from '@/components/admin/DeletedWorkstreams';

// This route requires authentication
export const dynamic = 'force-dynamic';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

export default async function DeletedAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  return (
    <main className="p-4 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 min-h-screen">
      <DeletedWorkstreams programId={PROGRAM_ID || undefined} />
    </main>
  );
}

