import RequireAuth from '@/components/RequireAuth';
import ReportClient from './ReportClient';

export default async function ReportPage() {
  return (
    <RequireAuth>
      <ReportClient />
    </RequireAuth>
  );
}

