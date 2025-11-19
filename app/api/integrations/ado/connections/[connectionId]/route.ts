import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  const routePath = '/api/integrations/ado/connections/[connectionId]';
  try {
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');
    const { connectionId } = await params;

    if (!programId) {
      return NextResponse.json(
        { ok: false, error: 'programId query parameter is required' },
        { status: 400 }
      );
    }

    // Require OWNER role
    await requireRole(programId, ['OWNER']);

    const supabase = getAdminClient();

    // Verify connection belongs to program
    const { data: connection, error: checkError } = await supabase
      .from('ado_connections')
      .select('program_id')
      .eq('id', connectionId)
      .single();

    if (checkError || !connection) {
      return NextResponse.json(
        { ok: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    if (connection.program_id !== programId) {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Delete connection (cascade will delete mappings and sync mappings)
    const { error: deleteError } = await supabase
      .from('ado_connections')
      .delete()
      .eq('id', connectionId);

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
      { ok: false, error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
}

