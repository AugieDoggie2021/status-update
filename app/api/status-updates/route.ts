import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireMembership, requireRole, getServerSession } from '@/lib/auth';
import { z } from 'zod';
import { getCurrentWeekStart } from '@/lib/date-helpers';

const statusUpdateSchema = z.object({
  workstreamId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rag: z.enum(['GREEN', 'YELLOW', 'RED']),
  progressPercent: z.number().int().min(0).max(100),
  accomplishments: z.string(),
  blockers: z.string(),
  planNext: z.string(),
});

const createStatusUpdatesSchema = z.object({
  programId: z.string().uuid(),
  updates: z.array(statusUpdateSchema).min(1),
});

/**
 * GET /api/status-updates
 * Fetch status updates for a program/workstream
 */
export async function GET(request: NextRequest) {
  const routePath = '/api/status-updates';
  try {
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');
    const workstreamId = searchParams.get('workstreamId');
    const weekStart = searchParams.get('weekStart');

    if (!programId) {
      return NextResponse.json(
        { ok: false, error: 'programId query parameter is required' },
        { status: 400 }
      );
    }

    // Require membership (any role)
    await requireMembership(programId);

    const supabase = getAdminClient();
    
    // Build query
    let query = supabase
      .from('status_updates')
      .select(`
        *,
        workstreams!inner(program_id)
      `)
      .eq('workstreams.program_id', programId);

    if (workstreamId) {
      query = query.eq('workstream_id', workstreamId);
    }

    if (weekStart) {
      query = query.eq('week_start', weekStart);
    }

    const { data, error } = await query.order('week_start', { ascending: false });

    if (error) {
      console.error(`[${routePath}] Supabase query error:`, error.message);
      return NextResponse.json(
        { ok: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    console.error(`[${routePath}] Unexpected error:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch status updates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/status-updates
 * Create or update multiple status updates in a transaction
 */
export async function POST(request: NextRequest) {
  const routePath = '/api/status-updates';
  try {
    const body = await request.json();
    const { programId, updates } = createStatusUpdatesSchema.parse(body);

    // Require OWNER or CONTRIBUTOR role
    await requireRole(programId, ['OWNER', 'CONTRIBUTOR']);

    // Get current user
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const supabase = getAdminClient();

    // Verify all workstreams belong to the program
    const workstreamIds = [...new Set(updates.map(u => u.workstreamId))];
    const { data: workstreams, error: wsError } = await supabase
      .from('workstreams')
      .select('id')
      .eq('program_id', programId)
      .in('id', workstreamIds);

    if (wsError || !workstreams || workstreams.length !== workstreamIds.length) {
      return NextResponse.json(
        { ok: false, error: 'One or more workstreams do not belong to this program' },
        { status: 400 }
      );
    }

    // Validate: progress required for non-Green, accomplishments/blockers/plan required for non-Green
    for (const update of updates) {
      if (update.rag !== 'GREEN') {
        if (!update.accomplishments.trim() || !update.blockers.trim() || !update.planNext.trim()) {
          return NextResponse.json(
            { 
              ok: false, 
              error: `Status update for workstream ${update.workstreamId} requires accomplishments, blockers, and plan for non-Green status` 
            },
            { status: 400 }
          );
        }
      }
    }

    // Insert/update status updates (upsert by workstream_id + week_start)
    const statusUpdatesData = updates.map(update => ({
      workstream_id: update.workstreamId,
      week_start: update.weekStart,
      rag: update.rag,
      progress_percent: update.progressPercent,
      accomplishments: update.accomplishments,
      blockers: update.blockers,
      plan_next: update.planNext,
      created_by: session.user.id,
    }));

    // Use upsert with conflict resolution
    const { data: inserted, error: insertError } = await supabase
      .from('status_updates')
      .upsert(statusUpdatesData, {
        onConflict: 'workstream_id,week_start',
      })
      .select();

    if (insertError) {
      console.error(`[${routePath}] Supabase insert error:`, insertError.message);
      return NextResponse.json(
        { ok: false, error: `Database error: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      created: inserted?.length || 0,
      updates: inserted,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: 'Validation error', details: error.errors },
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
      { ok: false, error: 'Failed to create status updates' },
      { status: 500 }
    );
  }
}
