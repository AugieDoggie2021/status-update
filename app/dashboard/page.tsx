import RequireAuth from '@/components/RequireAuth';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardClient />
    </RequireAuth>
  );
}

