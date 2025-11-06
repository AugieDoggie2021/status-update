import RequireAuth from '@/components/RequireAuth';
import UpdatePanel from '@/components/update/UpdatePanel';

export const dynamic = 'force-dynamic';

export default async function UpdatePage() {
  return (
    <RequireAuth>
      <UpdatePanel />
    </RequireAuth>
  );
}

