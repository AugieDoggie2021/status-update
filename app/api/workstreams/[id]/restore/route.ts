import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { WORKSTREAMS_TAG } from '@/lib/client/keys';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const routePath = '/api/workstreams/[id]/restore';
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { programId = 'default' } = body;

    if (!programId) {
      return NextResponse.json(
        { ok: false, error: 'programId is required' },
        { status: 400 }
      );
    }

    // Require OWNER or CONTRIBUTOR role
    await requireRole(programId, ['OWNER', 'CONTRIBUTOR']);

    const supabase = getAdminClient();

    const { error } = await supabase
      .from('workstreams')
      .update({ 
        deleted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('program_id', programId);

    if (error) {
      console.error(`[${routePath}] Supabase restore error:`, error.message);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    // Revalidate server caches
    try {
      revalidatePath('/dashboard');
      console.log(`[${routePath}] Revalidated cache for program: ${programId}`);
    } catch (e) {
      console.warn(`[${routePath}] Revalidation failed:`, e);
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
      { ok: false, error: 'Failed to restore workstream' },
      { status: 500 }
    );
  }
}

