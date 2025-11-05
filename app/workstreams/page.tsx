import RequireAuth from '@/components/RequireAuth';
import WorkstreamsClient from './WorkstreamsClient';

// This route requires authentication and uses cookies, so it must be dynamic
export const dynamic = 'force-dynamic';

export default async function WorkstreamsPage() {
  return (
    <RequireAuth>
      <WorkstreamsClient />
    </RequireAuth>
  );
}



