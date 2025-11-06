"use client";

import React, { useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KPIs } from "@/components/kpis";
import { getNarrative, type NarrativeResponse } from "@/lib/client/api";
import { apiJson } from "@/lib/fetcher";
import { toArray } from "@/lib/normalize";
import { getStatusColor } from "@/lib/status";
import { WORKSTREAMS_KEY } from "@/lib/client/keys";
import type { Workstream, Risk, ActionItem } from "@/lib/types";

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

interface DashboardSplitProps {
  programId?: string;
}

export default function DashboardSplit({ programId = PROGRAM_ID || "default" }: DashboardSplitProps) {
  const wsKey = WORKSTREAMS_KEY(programId);

  // Fetch workstreams using canonical key
  const { data: workstreamsResp, isLoading: isLoadingWorkstreams } = useSWR<Workstream[] | any>(
    programId ? wsKey : null,
    fetcher
  );

  // Fetch risks to count per workstream
  const { data: risksResp, isLoading: isLoadingRisks } = useSWR<Risk[] | any>(
    programId ? `/api/risks?programId=${encodeURIComponent(programId)}` : null,
    fetcher
  );

  // Fetch actions to count per workstream
  const { data: actionsResp } = useSWR<ActionItem[] | any>(
    programId ? `/api/actions?programId=${encodeURIComponent(programId)}` : null,
    fetcher
  );

  // Fetch overall status
  const { data: overallData, isLoading: isLoadingOverall } = useSWR<{ overall: 'GREEN' | 'YELLOW' | 'RED' } | any>(
    programId ? `/api/overall?programId=${encodeURIComponent(programId)}` : null,
    fetcher
  );

  // Fetch narrative
  const { data: narrative, isLoading: isLoadingNarrative, mutate: mutateNarrative } = useSWR<NarrativeResponse>(
    programId ? `/api/explain-weekly?programId=${encodeURIComponent(programId)}` : null,
    () => getNarrative(programId)
  );

  const workstreams = toArray<Workstream>(workstreamsResp);
  const risks = toArray<Risk>(risksResp, ['data', 'risks']);
  const actions = toArray<ActionItem>(actionsResp, ['data', 'actions']);

  // Compute risk and action counts per workstream
  const workstreamsWithCounts = useMemo(() => {
    return workstreams.map((ws) => {
      const riskCount = risks.filter((r) => r.workstream_id === ws.id && r.status === 'OPEN').length;
      const actionCount = actions.filter((a) => a.workstream_id === ws.id && (a.status === 'OPEN' || a.status === 'IN_PROGRESS')).length;
      
      return {
        id: ws.id,
        name: ws.name,
        statusLabel: ws.status,
        statusColorBg: undefined, // Will use Badge component styling
        statusColorFg: undefined,
        percentComplete: ws.percent_complete,
        nextMilestone: ws.next_milestone || undefined,
        riskCount,
        actionCount,
      };
    });
  }, [workstreams, risks, actions]);

  if (!programId) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-800">Program ID is required.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 space-y-4">
      {/* KPIs Section */}
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

      <div className="grid grid-cols-3 gap-6">
        {/* LEFT: Workstream cards (2/3) */}
        <div className="col-span-3 lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Workstreams</h2>
          <Separator />
          {isLoadingWorkstreams ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : workstreamsWithCounts.length === 0 ? (
            <p className="text-sm text-slate-700">No workstreams found. Apply an update to create workstreams.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workstreamsWithCounts.map((ws) => (
                <Card key={ws.id} className="p-4 flex flex-col gap-2 bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">{ws.name}</h3>
                    <Badge className={getStatusColor(ws.statusLabel as 'GREEN' | 'YELLOW' | 'RED')}>
                      {ws.statusLabel ?? "Status"}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-700 space-y-1">
                    <div>Next milestone: {ws.nextMilestone ?? "—"}</div>
                    <div>% complete: {ws.percentComplete ?? 0}%</div>
                    <div>Risks: {ws.riskCount ?? 0} • Actions: {ws.actionCount ?? 0}</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Narrative (1/3) */}
        <div className="col-span-3 lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">Notes</h2>
            <Button variant="outline" size="sm" onClick={() => mutateNarrative()} disabled={isLoadingNarrative}>
              Refresh
            </Button>
          </div>
          <Separator />
          <Card className="p-4 leading-relaxed text-sm bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 shadow-sm">
            {isLoadingNarrative && <div className="text-slate-700">Summarizing this week…</div>}
            {!isLoadingNarrative && (
              <div className="space-y-3 text-slate-900">
                <p>{narrative?.summary ?? "No narrative available yet."}</p>
                {narrative?.statusSentence && <p className="italic text-slate-700">{narrative.statusSentence}</p>}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

