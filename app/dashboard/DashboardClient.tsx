'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { KPIs } from '@/components/kpis';
import { WorkstreamCard } from '@/components/workstream-card';
import { DetailsPane } from '@/components/details-pane';
import { UpdateComposer } from '@/components/update-composer';
import { Skeleton } from '@/components/ui/skeleton';
import type { Workstream, Risk, ActionItem } from '@/lib/types';
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

  const { data: actionsResp, mutate: mutateActions, isLoading: isLoadingActions } = useSWR<ActionItem[] | any>(
    PROGRAM_ID ? `/api/actions?programId=${PROGRAM_ID}` : null,
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
  const actions = toArray<ActionItem>(actionsResp, ['data', 'actions']);

  const role = (roleData?.role as any) || null;
  const canWrite = role === 'OWNER' || role === 'CONTRIBUTOR';

  const selectedWorkstream = useMemo(() => {
    return workstreams.find((w) => w.id === selectedWorkstreamId) || null;
  }, [workstreams, selectedWorkstreamId]);

  const workstreamNames = useMemo(() => {
    const map = new Map<string, string>();
    workstreams.forEach((ws) => {
      map.set(ws.id, ws.name);
    });
    return map;
  }, [workstreams]);

  const handleUpdateApplied = () => {
    mutateWorkstreams();
    mutateRisks();
    mutateActions();
  };

  const handleActionToggle = async (actionId: string, newStatus: 'OPEN' | 'IN_PROGRESS' | 'DONE') => {
    if (!canWrite) return;
    try {
      const res = await fetch('/api/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: actionId, programId: PROGRAM_ID, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      mutateActions();
    } catch (error) {
      console.error('Failed to update action:', error);
    }
  };

  if (!PROGRAM_ID) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please set NEXT_PUBLIC_PROGRAM_ID in your environment variables.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-500/30 via-emerald-300/20 to-sky-400/30 rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-xl">
        <h2 className="text-4xl font-display font-bold tracking-tight mb-2">Dashboard</h2>
        <p className="text-muted-foreground">Program overview and status updates</p>
      </div>
      <div>
        {isLoadingWorkstreams || isLoadingRisks || isLoadingOverall ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <KPIs workstreams={workstreams} risks={risks} overall={overallData?.overall} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h3 className="text-2xl font-display font-bold tracking-tight mb-4">Workstreams</h3>
            {isLoadingWorkstreams ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : workstreams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workstreams found. Apply an update to create workstreams.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Card className="backdrop-blur-xl bg-white/50 dark:bg-slate-900/40 border border-white/20 rounded-2xl shadow-xl">
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  You have viewer access to this program. Contact your engagement lead to request edit access.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <DetailsPane
            workstream={selectedWorkstream}
            risks={risks}
            actions={actions}
            onActionToggle={canWrite ? handleActionToggle : undefined}
            canWrite={canWrite}
          />
        </div>
      </div>
    </div>
  );
}


