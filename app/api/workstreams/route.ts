import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireMembership } from '@/lib/auth';

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
      .order('updated_at', { ascending: false });

    if (error) {
      console.error(`[${routePath}] Supabase query error:`, error.message);
      return NextResponse.json(
        { ok: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error(`[${routePath}] Unexpected error:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch workstreams' },
      { status: 500 }
    );
  }
}

