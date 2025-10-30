import RequireAuth from '@/components/RequireAuth';
import ActionsClient from './ActionsClient';

export default async function ActionsPage() {
  return (
    <RequireAuth>
      <ActionsClient />
    </RequireAuth>
  );
}

