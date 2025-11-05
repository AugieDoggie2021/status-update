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
    <div className="grid gap-3 md:grid-cols-4">
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-t-lg">
          <CardTitle className="text-sm font-medium text-white">Overall Status</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <Badge className={getStatusColor(overallStatus)}>
            {overallStatus}
          </Badge>
        </CardContent>
      </Card>
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-t-lg">
          <CardTitle className="text-sm font-medium text-white">% On Track</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{onTrackPercent}%</div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {wsArr.filter((w: any) => w.status === 'GREEN').length} of {wsArr.length} workstreams
          </p>
        </CardContent>
      </Card>
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-t-lg">
          <CardTitle className="text-sm font-medium text-white">Open Risks</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{openRisksCount}</div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Active risks</p>
        </CardContent>
      </Card>
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-t-lg">
          <CardTitle className="text-sm font-medium text-white">Next 7 Days</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{next7DayMilestones}</div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Upcoming milestones</p>
        </CardContent>
      </Card>
    </div>
  );
}

