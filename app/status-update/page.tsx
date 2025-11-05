import RequireAuth from '@/components/RequireAuth';
import StatusUpdateClient from './StatusUpdateClient';

// This route requires authentication and uses cookies, so it must be dynamic
export const dynamic = 'force-dynamic';

export default async function StatusUpdatePage() {
  return (
    <RequireAuth>
      <div className="container mx-auto px-4 py-8">
        <StatusUpdateClient />
      </div>
    </RequireAuth>
  );
}
