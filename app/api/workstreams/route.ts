import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireMembership, requireRole } from '@/lib/auth';
import { z } from 'zod';

const createWorkstreamSchema = z.object({
  programId: z.string().uuid(),
  name: z.string().min(1),
  lead: z.string().nullable().optional(),
  status: z.enum(['GREEN', 'YELLOW', 'RED']).optional(),
  percent_complete: z.number().int().min(0).max(100).optional(),
  summary: z.string().optional(),
  description: z.string().nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  tags: z.array(z.string()).optional(),
  next_milestone: z.string().nullable().optional(),
  next_milestone_due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const updateWorkstreamSchema = createWorkstreamSchema.extend({
  id: z.string().uuid(),
}).partial().required({ id: true, programId: true });

export async function GET(request: NextRequest) {
  const routePath = '/api/workstreams';
  try {
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');

    if (!programId) {
      return NextResponse.json(
        { ok: false, error: 'programId query parameter is required' },
        { status: 400 }
      );
    }

    // Require membership (any role)
    await requireMembership(programId);

    let supabase;
    try {
      supabase = getAdminClient();
    } catch (supabaseError) {
      console.error(`[${routePath}] Supabase client error:`, supabaseError instanceof Error ? supabaseError.message : 'Unknown');
      return NextResponse.json(
        { ok: false, error: 'Database configuration error. Check SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('workstreams')
      .select('*')
      .eq('program_id', programId)
      .is('deleted_at', null) // Exclude soft-deleted items
      .order('updated_at', { ascending: false });

    if (error) {
      console.error(`[${routePath}] Supabase query error:`, error.message);
      return NextResponse.json(
        { ok: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`[${routePath}] programId: ${programId}, rows: ${data?.length ?? 0}`);

    return new Response(JSON.stringify(data || []), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error(`[${routePath}] Unexpected error:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch workstreams' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workstreams
 * Create a new workstream
 */
export async function POST(request: NextRequest) {
  const routePath = '/api/workstreams';
  try {
    const body = await request.json();
    const validated = createWorkstreamSchema.parse(body);

    // Require OWNER or CONTRIBUTOR role
    await requireRole(validated.programId, ['OWNER', 'CONTRIBUTOR']);

    const supabase = getAdminClient();

    const workstreamData: any = {
      program_id: validated.programId,
      name: validated.name,
      lead: validated.lead || null,
      status: validated.status || 'GREEN',
      percent_complete: validated.percent_complete ?? 0,
      summary: validated.summary || '',
      description: validated.description || null,
      start_date: validated.start_date || null,
      end_date: validated.end_date || null,
      tags: validated.tags ? JSON.stringify(validated.tags) : null,
      next_milestone: validated.next_milestone || null,
      next_milestone_due: validated.next_milestone_due || null,
    };

    const { data, error } = await supabase
      .from('workstreams')
      .insert(workstreamData)
      .select()
      .single();

    if (error) {
      console.error(`[${routePath}] Supabase insert error:`, error.message);
      return NextResponse.json(
        { ok: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
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
      { ok: false, error: 'Failed to create workstream' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workstreams
 * Update an existing workstream
 */
export async function PATCH(request: NextRequest) {
  const routePath = '/api/workstreams';
  try {
    const body = await request.json();
    const validated = updateWorkstreamSchema.parse(body);

    if (!validated.id || !validated.programId) {
      return NextResponse.json(
        { ok: false, error: 'id and programId are required' },
        { status: 400 }
      );
    }

    // Require OWNER or CONTRIBUTOR role
    await requireRole(validated.programId, ['OWNER', 'CONTRIBUTOR']);

    const supabase = getAdminClient();

    // Build update object (only include provided fields)
    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.lead !== undefined) updateData.lead = validated.lead;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.percent_complete !== undefined) updateData.percent_complete = validated.percent_complete;
    if (validated.summary !== undefined) updateData.summary = validated.summary;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.start_date !== undefined) updateData.start_date = validated.start_date;
    if (validated.end_date !== undefined) updateData.end_date = validated.end_date;
    if (validated.tags !== undefined) updateData.tags = validated.tags ? JSON.stringify(validated.tags) : null;
    if (validated.next_milestone !== undefined) updateData.next_milestone = validated.next_milestone;
    if (validated.next_milestone_due !== undefined) updateData.next_milestone_due = validated.next_milestone_due;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('workstreams')
      .update(updateData)
      .eq('id', validated.id)
      .eq('program_id', validated.programId)
      .select()
      .single();

    if (error) {
      console.error(`[${routePath}] Supabase update error:`, error.message);
      return NextResponse.json(
        { ok: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
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
      { ok: false, error: 'Failed to update workstream' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workstreams
 * Delete a workstream
 */
export async function DELETE(request: NextRequest) {
  const routePath = '/api/workstreams';
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const programId = searchParams.get('programId');

    if (!id || !programId) {
      return NextResponse.json(
        { ok: false, error: 'id and programId query parameters are required' },
        { status: 400 }
      );
    }

    // Require OWNER or CONTRIBUTOR role
    await requireRole(programId, ['OWNER', 'CONTRIBUTOR']);

    const supabase = getAdminClient();

    // Soft delete: set deleted_at timestamp
    const { error } = await supabase
      .from('workstreams')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('program_id', programId);

    if (error) {
      console.error(`[${routePath}] Supabase delete error:`, error.message);
      return NextResponse.json(
        { ok: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    console.error(`[${routePath}] Unexpected error:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { ok: false, error: 'Failed to delete workstream' },
      { status: 500 }
    );
  }
}

