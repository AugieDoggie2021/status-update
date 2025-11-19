'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCw, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SyncJob {
  id: string;
  job_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  items_synced: number;
  errors: any[] | null;
  created_at: string;
}

interface AdoSyncPanelProps {
  connectionId: string;
  programId: string;
}

export function AdoSyncPanel({ connectionId, programId }: AdoSyncPanelProps) {
  const [syncType, setSyncType] = useState<'full_sync' | 'incremental_sync' | 'manual_sync'>('manual_sync');
  const [direction, setDirection] = useState<'ado_to_tracker' | 'tracker_to_ado' | 'bidirectional'>('bidirectional');
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: historyData, mutate: mutateHistory } = useSWR<{ ok: boolean; jobs: SyncJob[] }>(
    `/api/integrations/ado/sync/history?connectionId=${connectionId}&limit=10`,
    fetcher
  );

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/integrations/ado/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          syncType,
          direction,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start sync');
      }

      toast.success('Sync started successfully');
      mutateHistory();
      
      // Poll for job status
      if (data.jobId) {
        pollJobStatus(data.jobId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      attempts++;
      try {
        const res = await fetch(`/api/integrations/ado/sync/status?jobId=${jobId}`);
        const data = await res.json();

        if (data.ok && data.job) {
          if (data.job.status === 'completed') {
            toast.success(`Sync completed: ${data.job.items_synced} items synced`);
            mutateHistory();
            return;
          }
          if (data.job.status === 'failed') {
            toast.error('Sync failed. Check sync history for details.');
            mutateHistory();
            return;
          }
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    };

    setTimeout(poll, 2000);
  };

  const jobs = historyData?.jobs || [];
  const lastJob = jobs[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sync Control
        </CardTitle>
        <CardDescription>
          Manually trigger synchronization between Azure DevOps and Status Tracker
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sync Type</label>
            <Select value={syncType} onValueChange={(v: any) => setSyncType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual_sync">Manual Sync</SelectItem>
                <SelectItem value="full_sync">Full Sync</SelectItem>
                <SelectItem value="incremental_sync">Incremental Sync</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Direction</label>
            <Select value={direction} onValueChange={(v: any) => setDirection(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bidirectional">Bidirectional</SelectItem>
                <SelectItem value="ado_to_tracker">ADO → Tracker</SelectItem>
                <SelectItem value="tracker_to_ado">Tracker → ADO</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleSync} disabled={isSyncing} className="w-full">
          {isSyncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Sync
            </>
          )}
        </Button>

        {lastJob && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Last Sync Status</p>
            <div className="flex items-center gap-2 text-sm">
              <span className={`px-2 py-1 rounded text-xs ${
                lastJob.status === 'completed' ? 'bg-green-100 text-green-800' :
                lastJob.status === 'failed' ? 'bg-red-100 text-red-800' :
                lastJob.status === 'running' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {lastJob.status}
              </span>
              {lastJob.items_synced > 0 && (
                <span className="text-muted-foreground">
                  {lastJob.items_synced} items synced
                </span>
              )}
              {lastJob.completed_at && (
                <span className="text-muted-foreground text-xs">
                  {new Date(lastJob.completed_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Sync History</p>
            <div className="max-h-48 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.slice(0, 5).map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="text-xs">{job.job_type}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          job.status === 'completed' ? 'bg-green-100 text-green-800' :
                          job.status === 'failed' ? 'bg-red-100 text-red-800' :
                          job.status === 'running' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status}
                        </span>
                      </TableCell>
                      <TableCell>{job.items_synced}</TableCell>
                      <TableCell className="text-xs">
                        {job.completed_at ? new Date(job.completed_at).toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

