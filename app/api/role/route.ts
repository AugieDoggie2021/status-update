import { NextRequest, NextResponse } from 'next/server';
import { getRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');

    if (!programId) {
      return NextResponse.json(
        { ok: false, error: 'programId query parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[GET /api/role] Checking role for programId: ${programId}`);
    
    const role = await getRole(programId);

    if (!role) {
      console.warn(`[GET /api/role] User does not have access to programId: ${programId}`);
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN', role: null },
        { status: 403 }
      );
    }

    console.log(`[GET /api/role] User role for programId ${programId}: ${role}`);
    return NextResponse.json({ ok: true, role });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      console.warn('[GET /api/role] UNAUTHORIZED');
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED', role: null },
        { status: 401 }
      );
    }
    console.error('[GET /api/role] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch role', role: null },
      { status: 500 }
    );
  }
}

