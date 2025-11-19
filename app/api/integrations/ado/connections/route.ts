import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireMembership } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const routePath = '/api/integrations/ado/connections';
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

    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('ado_connections')
      .select('id, organization_url, project_name, created_at, updated_at, token_expires_at')
      .eq('program_id', programId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[${routePath}] Supabase query error:`, error.message);
      return NextResponse.json(
        { ok: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, connections: data || [] });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    console.error(`[${routePath}] Unexpected error:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

