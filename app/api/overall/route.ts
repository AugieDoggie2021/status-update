import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { calculateOverallStatus } from '@/lib/status';
import type { Workstream } from '@/lib/types';

export async function GET(request: NextRequest) {
  const routePath = '/api/overall';
  try {
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');

    if (!programId) {
      return NextResponse.json(
        { ok: false, error: 'programId query parameter is required' },
        { status: 400 }
      );
    }

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
      .eq('program_id', programId);

    if (error) {
      console.error(`[${routePath}] Supabase query error:`, error.message);
      return NextResponse.json(
        { ok: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    const overall = calculateOverallStatus((data as Workstream[]) || []);

    return NextResponse.json({ ok: true, overall });
  } catch (error) {
    console.error(`[${routePath}] Unexpected error:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { ok: false, error: 'Failed to calculate overall status' },
      { status: 500 }
    );
  }
}

