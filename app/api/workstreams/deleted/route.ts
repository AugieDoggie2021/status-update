import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireMembership } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const routePath = '/api/workstreams/deleted';
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
      .from('workstreams')
      .select('id, name, status, percent_complete, deleted_at')
      .eq('program_id', programId)
      .not('deleted_at', 'is', null) // Only deleted items
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error(`[${routePath}] Supabase query error:`, error.message);
      return NextResponse.json(
        { ok: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data || [], {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error(`[${routePath}] Unexpected error:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch deleted workstreams' },
      { status: 500 }
    );
  }
}

