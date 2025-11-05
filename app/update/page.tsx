import RequireAuth from '@/components/RequireAuth';
import { UpdatePanel } from '@/components/update/UpdatePanel';

export const dynamic = 'force-dynamic';

export default async function UpdatePage() {
  return (
    <RequireAuth>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <UpdatePanel />
      </div>
    </RequireAuth>
  );
}

