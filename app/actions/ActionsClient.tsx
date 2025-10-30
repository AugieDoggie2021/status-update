'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { ActionsTable } from '@/components/actions-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActionItem, Workstream } from '@/lib/types';
import { apiJson } from '@/lib/fetcher';
import { toArray } from '@/lib/normalize';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

export default function ActionsClient() {
  const { data: actionsResp, mutate } = useSWR<ActionItem[] | any>(
    PROGRAM_ID ? `/api/actions?programId=${PROGRAM_ID}` : null,
    apiJson
  );

  const { data: workstreamsResp } = useSWR<Workstream[] | any>(
    PROGRAM_ID ? `/api/workstreams?programId=${PROGRAM_ID}` : null,
    apiJson
  );

  const { data: roleData } = useSWR<{ ok: boolean; role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER' | null } | any>(
    PROGRAM_ID ? `/api/role?programId=${PROGRAM_ID}` : null,
    apiJson
  );

  const actions = toArray<ActionItem>(actionsResp, ['data', 'actions']);
  const workstreams = toArray<Workstream>(workstreamsResp);

  const canWrite = roleData?.role === 'OWNER' || roleData?.role === 'CONTRIBUTOR';

  const workstreamNames = useMemo(() => {
    const map = new Map<string, string>();
    workstreams.forEach((ws) => {
      map.set(ws.id, ws.name);
    });
    return map;
  }, [workstreams]);

  if (!PROGRAM_ID) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please set NEXT_PUBLIC_PROGRAM_ID in your environment variables.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Actions</h2>
        <Card>
          <CardHeader>
            <CardTitle>All Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionsTable
              actions={actions}
              workstreamNames={workstreamNames}
              onUpdate={() => mutate()}
              canWrite={canWrite}
              programId={PROGRAM_ID}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


