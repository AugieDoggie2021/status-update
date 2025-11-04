'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { UpdateWizard } from '@/components/status/UpdateWizard/UpdateWizard';
import { ViewerBanner } from '@/components/viewer-banner';
import { Skeleton } from '@/components/ui/skeleton';
import type { Workstream } from '@/lib/types';
import { apiJson } from '@/lib/fetcher';
import { toArray } from '@/lib/normalize';
import { useRouter } from 'next/navigation';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

export default function StatusUpdateClient() {
  const router = useRouter();
  const { data: workstreamsResp, isLoading } = useSWR<Workstream[] | any>(
    PROGRAM_ID ? `/api/workstreams?programId=${PROGRAM_ID}` : null,
    apiJson
  );

  const { data: roleData } = useSWR<{ ok: boolean; role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER' | null } | any>(
    PROGRAM_ID ? `/api/role?programId=${PROGRAM_ID}` : null,
    apiJson
  );

  const workstreams = toArray<Workstream>(workstreamsResp);
  const role = roleData?.role || null;
  const canWrite = role === 'OWNER' || role === 'CONTRIBUTOR';

  if (!PROGRAM_ID) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please set NEXT_PUBLIC_PROGRAM_ID in your environment variables.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!canWrite) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Weekly Status Update</h1>
        <ViewerBanner />
        <p className="text-muted-foreground">
          You need Editor or Admin access to submit status updates.
        </p>
      </div>
    );
  }

  return (
    <UpdateWizard
      workstreams={workstreams}
      onComplete={() => {
        router.push('/dashboard');
        router.refresh();
      }}
    />
  );
}
