'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ViewerBanner } from '@/components/viewer-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { Workstream } from '@/lib/types';
import { apiJson } from '@/lib/fetcher';
import { toArray } from '@/lib/normalize';
import { toast } from 'sonner';
import { WorkstreamTable } from '@/components/workstreams/WorkstreamTable';
import { WorkstreamDialog } from '@/components/workstreams/WorkstreamDialog';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

export default function WorkstreamsClient() {
  const [editingWorkstream, setEditingWorkstream] = useState<Workstream | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: workstreamsResp, isLoading, mutate } = useSWR<Workstream[] | any>(
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

  const handleCreate = () => {
    setEditingWorkstream(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (workstream: Workstream) => {
    setEditingWorkstream(workstream);
    setIsDialogOpen(true);
  };

  const handleDelete = async (workstreamId: string) => {
    if (!confirm('Are you sure you want to delete this workstream? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/workstreams?id=${workstreamId}&programId=${PROGRAM_ID}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete workstream');
      }

      toast.success('Workstream deleted successfully');
      mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete workstream');
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingWorkstream(null);
  };

  const handleDialogSuccess = () => {
    mutate();
    handleDialogClose();
    toast.success(editingWorkstream ? 'Workstream updated successfully' : 'Workstream created successfully');
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workstreams</h1>
          <p className="text-muted-foreground mt-1">Manage program workstreams</p>
        </div>
        {canWrite && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Workstream
          </Button>
        )}
      </div>

      {!canWrite && <ViewerBanner className="mb-4" />}

      <WorkstreamTable
        workstreams={workstreams}
        canWrite={canWrite}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {canWrite && (
        <WorkstreamDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          workstream={editingWorkstream}
          programId={PROGRAM_ID}
          onSuccess={handleDialogSuccess}
        />
      )}
    </div>
  );
}



