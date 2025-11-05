import RequireAuth from '@/components/RequireAuth';
import ActionsClient from './ActionsClient';

// This route requires authentication and uses cookies, so it must be dynamic
export const dynamic = 'force-dynamic';

export default async function ActionsPage() {
  return (
    <RequireAuth>
      <ActionsClient />
    </RequireAuth>
  );
}

