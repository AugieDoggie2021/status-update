import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireMembership, requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const routePath = '/api/risks';
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
      .from('risks')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: false });

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
      { ok: false, error: 'Failed to fetch risks' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const routePath = '/api/risks';
  try {
    const body = await request.json();
    console.log(`[${routePath}] Update request keys: ${Object.keys(body).join(', ')}`);
    
    const { id, programId, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'id is required' },
        { status: 400 }
      );
    }

    if (!programId) {
      return NextResponse.json(
        { ok: false, error: 'programId is required in request body' },
        { status: 400 }
      );
    }

    // Require OWNER or CONTRIBUTOR role
    await requireRole(programId, ['OWNER', 'CONTRIBUTOR']);

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
      .from('risks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[${routePath}] Supabase update error:`, error.message);
      // Check for enum validation errors
      if (error.message.includes('enum') || error.message.includes('invalid input')) {
        return NextResponse.json(
          { ok: false, error: `Invalid status or severity value. Use: OPEN/MITIGATED/CLOSED for status, LOW/MEDIUM/HIGH for severity.` },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { ok: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(`[${routePath}] Unexpected error:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { ok: false, error: 'Failed to update risk' },
      { status: 500 }
    );
  }
}

