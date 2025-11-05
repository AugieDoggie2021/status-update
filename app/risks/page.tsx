import RequireAuth from '@/components/RequireAuth';
import RisksClient from './RisksClient';

// This route requires authentication and uses cookies, so it must be dynamic
export const dynamic = 'force-dynamic';

export default async function RisksPage() {
  return (
    <RequireAuth>
      <RisksClient />
    </RequireAuth>
  );
}

