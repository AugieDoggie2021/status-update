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

    const role = await getRole(programId);

    if (!role) {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN', role: null },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true, role });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
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

