'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiJson } from '@/lib/fetcher';
import { formatRelativeWeek } from '@/lib/date-helpers';
import type { Workstream, StatusUpdate } from '@/lib/types';
import { getStatusColor } from '@/lib/status';

interface WorkstreamNotesProps {
  workstream: Workstream | null;
  programId: string;
}

export function WorkstreamNotes({ workstream, programId }: WorkstreamNotesProps) {
  // Fetch latest status update for the selected workstream
  const { data: statusUpdates, isLoading } = useSWR<StatusUpdate[] | any>(
    workstream && programId
      ? `/api/status-updates?programId=${programId}&workstreamId=${workstream.id}`
      : null,
    apiJson
  );

  const latestUpdate = useMemo(() => {
    if (!statusUpdates || !Array.isArray(statusUpdates) || statusUpdates.length === 0) {
      return null;
    }
    // API returns sorted by week_start descending, so first is latest
    return statusUpdates[0] as StatusUpdate;
  }, [statusUpdates]);

  if (!workstream) {
    return (
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100">Workstream Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Select a workstream to view notes from the workstream lead
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-700 border-b border-slate-200 dark:border-slate-600">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-slate-900 dark:text-slate-100">{workstream.name}</CardTitle>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
              Latest notes from {workstream.lead || 'Workstream Lead'}
            </p>
          </div>
          {latestUpdate && (
            <Badge className={getStatusColor(latestUpdate.rag)} variant="outline">
              {latestUpdate.rag}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {isLoading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading notes...</p>
        ) : latestUpdate ? (
          <>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 mb-3">
              <span>Week of {formatRelativeWeek(latestUpdate.week_start)}</span>
              <span>{latestUpdate.created_at ? new Date(latestUpdate.created_at).toLocaleDateString() : ''}</span>
            </div>

            {latestUpdate.accomplishments && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-slate-900 dark:text-slate-100">Accomplishments</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {latestUpdate.accomplishments}
                </p>
              </div>
            )}

            {latestUpdate.blockers && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-slate-900 dark:text-slate-100">Blockers & Issues</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {latestUpdate.blockers}
                </p>
              </div>
            )}

            {latestUpdate.plan_next && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-slate-900 dark:text-slate-100">Plan & Next Steps</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {latestUpdate.plan_next}
                </p>
              </div>
            )}

            {!latestUpdate.accomplishments && !latestUpdate.blockers && !latestUpdate.plan_next && (
              <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                No detailed notes available for this update.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No status updates available yet. The workstream lead can add notes through the Status Update flow.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

