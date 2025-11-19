import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireRole, requireAuth } from '@/lib/auth';
import { syncWorkstreams, syncRisks, syncActions, createSyncJob, updateSyncJob } from '@/lib/integrations/ado/sync';
import { z } from 'zod';

const syncSchema = z.object({
  connectionId: z.string().uuid(),
  syncType: z.enum(['full_sync', 'incremental_sync', 'manual_sync']),
  direction: z.enum(['ado_to_tracker', 'tracker_to_ado', 'bidirectional']).optional(),
});

export async function POST(request: NextRequest) {
  const routePath = '/api/integrations/ado/sync';
  try {
    const body = await request.json();
    const validated = syncSchema.parse(body);

    const supabase = getAdminClient();

    // Get connection to verify program membership
    const { data: connection, error: connError } = await supabase
      .from('ado_connections')
      .select('program_id')
      .eq('id', validated.connectionId)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { ok: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Require OWNER or CONTRIBUTOR role
    await requireRole(connection.program_id, ['OWNER', 'CONTRIBUTOR']);

    const session = await requireAuth();
    const direction = validated.direction || 'bidirectional';

    // Create sync job
    const jobId = await createSyncJob(validated.connectionId, validated.syncType, session.user.id);

    // Start sync asynchronously (in production, use a job queue)
    // For now, run synchronously but update job status
    updateSyncJob(jobId, 'running').catch(console.error);

    try {
      // Sync all entity types
      const [workstreamsResult, risksResult, actionsResult] = await Promise.all([
        syncWorkstreams(validated.connectionId, direction, connection.program_id),
        syncRisks(validated.connectionId, direction, connection.program_id),
        syncActions(validated.connectionId, direction, connection.program_id),
      ]);

      // Combine results
      const totalResult = {
        itemsSynced: workstreamsResult.itemsSynced + risksResult.itemsSynced + actionsResult.itemsSynced,
        errors: [
          ...workstreamsResult.errors,
          ...risksResult.errors,
          ...actionsResult.errors,
        ],
      };

      await updateSyncJob(jobId, 'completed', totalResult);

      return NextResponse.json({
        ok: true,
        jobId,
        result: totalResult,
      });
    } catch (syncError) {
      await updateSyncJob(jobId, 'failed', {
        itemsSynced: 0,
        errors: [{ error: syncError instanceof Error ? syncError.message : 'Unknown error' }],
      });

      throw syncError;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    console.error(`[${routePath}] Unexpected error:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to sync' },
      { status: 500 }
    );
  }
}

