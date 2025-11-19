import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mappingId: string }> }
) {
  const routePath = '/api/integrations/ado/mappings/[mappingId]';
  try {
    const { mappingId } = await params;

    const supabase = getAdminClient();

    // Get mapping to verify connection and program ownership
    const { data: mapping, error: mappingError } = await supabase
      .from('ado_field_mappings')
      .select('connection_id, ado_connections!inner(program_id)')
      .eq('id', mappingId)
      .single();

    if (mappingError || !mapping) {
      return NextResponse.json(
        { ok: false, error: 'Mapping not found' },
        { status: 404 }
      );
    }

    const programId = (mapping.ado_connections as any).program_id;

    // Require OWNER role
    await requireRole(programId, ['OWNER']);

    const { error: deleteError } = await supabase
      .from('ado_field_mappings')
      .delete()
      .eq('id', mappingId);

    if (deleteError) {
      console.error(`[${routePath}] Delete error:`, deleteError.message);
      return NextResponse.json(
        { ok: false, error: `Database error: ${deleteError.message}` },
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
      { ok: false, error: 'Failed to delete mapping' },
      { status: 500 }
    );
  }
}

