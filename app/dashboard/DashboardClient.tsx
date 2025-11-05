'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { KPIs } from '@/components/kpis';
import { WorkstreamCard } from '@/components/workstream-card';
import { WorkstreamNotes } from '@/components/workstream-notes';
import { UpdateComposer } from '@/components/update-composer';
import { ViewerBanner } from '@/components/viewer-banner';
import { Skeleton } from '@/components/ui/skeleton';
import type { Workstream, Risk } from '@/lib/types';
import { apiJson } from '@/lib/fetcher';
import { toArray } from '@/lib/normalize';
import { Card, CardContent } from '@/components/ui/card';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

export default function DashboardClient() {
  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState<string | null>(null);

  const { data: workstreamsResp, mutate: mutateWorkstreams, isLoading: isLoadingWorkstreams } = useSWR<Workstream[] | any>(
    PROGRAM_ID ? `/api/workstreams?programId=${PROGRAM_ID}` : null,
    apiJson
  );

  const { data: risksResp, mutate: mutateRisks, isLoading: isLoadingRisks } = useSWR<Risk[] | any>(
    PROGRAM_ID ? `/api/risks?programId=${PROGRAM_ID}` : null,
    apiJson
  );

  const { data: overallData, isLoading: isLoadingOverall } = useSWR<{ overall: 'GREEN' | 'YELLOW' | 'RED' } | any>(
    PROGRAM_ID ? `/api/overall?programId=${PROGRAM_ID}` : null,
    apiJson
  );

  const { data: roleData } = useSWR<{ ok: boolean; role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER' | null } | any>(
    PROGRAM_ID ? `/api/role?programId=${PROGRAM_ID}` : null,
    apiJson
  );

  const workstreams = toArray<Workstream>(workstreamsResp);
  const risks = toArray<Risk>(risksResp, ['data', 'risks']);

  const role = (roleData?.role as any) || null;
  const canWrite = role === 'OWNER' || role === 'CONTRIBUTOR';

  const selectedWorkstream = useMemo(() => {
    return workstreams.find((w) => w.id === selectedWorkstreamId) || null;
  }, [workstreams, selectedWorkstreamId]);

  const handleUpdateApplied = () => {
    mutateWorkstreams();
    mutateRisks();
  };

  if (!PROGRAM_ID) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400">Please set NEXT_PUBLIC_PROGRAM_ID in your environment variables.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!canWrite && <ViewerBanner className="mb-2" />}
      <div>
        {isLoadingWorkstreams || isLoadingRisks || isLoadingOverall ? (
          <div className="grid gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <KPIs workstreams={workstreams} risks={risks} overall={overallData?.overall} />
        )}
      </div>

      <div className="space-y-4">
        {selectedWorkstream && (
          <WorkstreamNotes workstream={selectedWorkstream} programId={PROGRAM_ID} />
        )}
        <div>
          <h3 className="text-xl font-display font-bold tracking-tight mb-3 text-slate-900 dark:text-slate-100">Workstreams</h3>
          {isLoadingWorkstreams ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : workstreams.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">No workstreams found. Apply an update to create workstreams.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {workstreams.map((workstream) => (
                <WorkstreamCard
                  key={workstream.id}
                  workstream={workstream}
                  onClick={() =>
                    setSelectedWorkstreamId(selectedWorkstreamId === workstream.id ? null : workstream.id)
                  }
                  isSelected={selectedWorkstreamId === workstream.id}
                />
              ))}
            </div>
          )}
        </div>

        {canWrite ? (
          <UpdateComposer programId={PROGRAM_ID} onUpdateApplied={handleUpdateApplied} />
        ) : (
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md">
            <CardContent className="pt-6">
              <p className="text-slate-600 dark:text-slate-400 text-center">
                You have viewer access to this program. Contact your engagement lead to request edit access.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


