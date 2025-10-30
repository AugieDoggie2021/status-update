import RequireAuth from '@/components/RequireAuth';
import RisksClient from './RisksClient';

export default async function RisksPage() {
  return (
    <RequireAuth>
      <RisksClient />
    </RequireAuth>
  );
}

