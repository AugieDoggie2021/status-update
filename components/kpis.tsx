'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateOverallStatus, calculateOnTrackPercentage, getStatusColor } from '@/lib/status';
import type { Workstream, Risk } from '@/lib/types';

interface KPIsProps {
  workstreams: Workstream[] | any;
  risks: Risk[] | any;
  overall?: 'GREEN' | 'YELLOW' | 'RED';
}

export function KPIs({ workstreams, risks, overall: overallProp }: KPIsProps) {
  // Defensive normalization
  const wsArr = Array.isArray(workstreams)
    ? workstreams
    : Array.isArray((workstreams as any)?.data)
    ? (workstreams as any).data
    : [];

  const risksArr = Array.isArray(risks)
    ? risks
    : Array.isArray((risks as any)?.data)
    ? (risks as any).data
    : Array.isArray((risks as any)?.risks)
    ? (risks as any).risks
    : [];

  const overallStatus = useMemo(() => {
    return overallProp || calculateOverallStatus(wsArr);
  }, [wsArr, overallProp]);

  const onTrackPercent = useMemo(() => {
    return calculateOnTrackPercentage(wsArr);
  }, [wsArr]);

  const openRisksCount = useMemo(() => {
    return risksArr.filter((r: any) => r.status === 'OPEN').length;
  }, [risksArr]);

  const next7DayMilestones = useMemo(() => {
    return wsArr.filter((ws: any) => {
      if (!ws.next_milestone_due) return false;
      const days = new Date(ws.next_milestone_due).getTime() - new Date().getTime();
      return days >= 0 && days <= 7 * 24 * 60 * 60 * 1000;
    }).length;
  }, [wsArr]);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={getStatusColor(overallStatus)}>
            {overallStatus}
          </Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <CardTitle className="text-sm font-medium">% On Track</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{onTrackPercent}%</div>
          <p className="text-xs text-muted-foreground">
            {wsArr.filter((w: any) => w.status === 'GREEN').length} of {wsArr.length} workstreams
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <CardTitle className="text-sm font-medium">Open Risks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{openRisksCount}</div>
          <p className="text-xs text-muted-foreground">Active risks</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <CardTitle className="text-sm font-medium">Next 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{next7DayMilestones}</div>
          <p className="text-xs text-muted-foreground">Upcoming milestones</p>
        </CardContent>
      </Card>
    </div>
  );
}

