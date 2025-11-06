import RequireAuth from '@/components/RequireAuth';
import UpdatePanel from '@/components/update/UpdatePanel';

export const dynamic = 'force-dynamic';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

export default async function UpdatePage() {
  return (
    <RequireAuth>
      <UpdatePanel programId={PROGRAM_ID || undefined} />
    </RequireAuth>
  );
}

