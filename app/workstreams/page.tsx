import RequireAuth from '@/components/RequireAuth';
import WorkstreamsClient from './WorkstreamsClient';

export default async function WorkstreamsPage() {
  return (
    <RequireAuth>
      <WorkstreamsClient />
    </RequireAuth>
  );
}

