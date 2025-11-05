import RequireAuth from '@/components/RequireAuth';
import ReportClient from './ReportClient';

// This route requires authentication and uses cookies, so it must be dynamic
export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  return (
    <RequireAuth>
      <ReportClient />
    </RequireAuth>
  );
}

