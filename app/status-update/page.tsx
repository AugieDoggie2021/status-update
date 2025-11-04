import RequireAuth from '@/components/RequireAuth';
import StatusUpdateClient from './StatusUpdateClient';

export default async function StatusUpdatePage() {
  return (
    <RequireAuth>
      <div className="container mx-auto px-4 py-8">
        <StatusUpdateClient />
      </div>
    </RequireAuth>
  );
}
