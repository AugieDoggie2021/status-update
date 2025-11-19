import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireMembership } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const routePath = '/api/integrations/ado/sync/history';
  try {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!connectionId) {
      return NextResponse.json(
        { ok: false, error: 'connectionId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Get connection to verify program membership
    const { data: connection, error: connError } = await supabase
      .from('ado_connections')
      .select('program_id')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { ok: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Require membership (any role)
    await requireMembership(connection.program_id);

    const { data, error } = await supabase
      .from('ado_sync_jobs')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(`[${routePath}] Supabase query error:`, error.message);
      return NextResponse.json(
        { ok: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, jobs: data || [] });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    console.error(`[${routePath}] Unexpected error:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch sync history' },
      { status: 500 }
    );
  }
}

