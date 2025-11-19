import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireMembership } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const routePath = '/api/integrations/ado/sync/status';
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { ok: false, error: 'jobId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Get job and connection to verify program membership
    const { data: job, error: jobError } = await supabase
      .from('ado_sync_jobs')
      .select(`
        *,
        ado_connections!inner(program_id)
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { ok: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    const programId = (job.ado_connections as any).program_id;

    // Require membership (any role)
    await requireMembership(programId);

    // Remove connection data from response
    const { ado_connections, ...jobData } = job;

    return NextResponse.json({ ok: true, job: jobData });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    console.error(`[${routePath}] Unexpected error:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}

