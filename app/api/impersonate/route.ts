import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRealRole } from '@/lib/auth';
import { z } from 'zod';

const impersonateSchema = z.object({
  programId: z.string().uuid(),
  role: z.enum(['CONTRIBUTOR', 'VIEWER']).nullable().optional(), // null to clear, optional to allow clearing
});

const IMPERSONATION_COOKIE = 'impersonate_role';
const IMPERSONATION_PROGRAM_COOKIE = 'impersonate_program_id';

/**
 * POST /api/impersonate
 * Start impersonating as a different role
 * Only OWNER can do this
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { programId, role } = impersonateSchema.parse(body);

    // Verify user is actually OWNER (check real role, not impersonated)
    const realRole = await getRealRole(programId);
    if (realRole !== 'OWNER') {
      return NextResponse.json(
        { ok: false, error: 'Only owners can impersonate' },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();

    if (role) {
      // Set impersonation cookies
      cookieStore.set(IMPERSONATION_COOKIE, role, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });

      cookieStore.set(IMPERSONATION_PROGRAM_COOKIE, programId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });

      return NextResponse.json({ 
        ok: true, 
        message: `Now impersonating as ${role}`,
        impersonatedRole: role 
      });
    } else {
      // Clear impersonation
      cookieStore.delete(IMPERSONATION_COOKIE);
      cookieStore.delete(IMPERSONATION_PROGRAM_COOKIE);

      return NextResponse.json({ 
        ok: true, 
        message: 'Stopped impersonating' 
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    console.error('[POST /api/impersonate] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to set impersonation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/impersonate
 * Check current impersonation status
 */
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

    const cookieStore = await cookies();
    const impersonateProgramId = cookieStore.get(IMPERSONATION_PROGRAM_COOKIE)?.value;
    const impersonateRole = cookieStore.get(IMPERSONATION_COOKIE)?.value;

    if (impersonateProgramId === programId && impersonateRole) {
      return NextResponse.json({
        ok: true,
        isImpersonating: true,
        impersonatedRole: impersonateRole.toUpperCase(),
      });
    }

    return NextResponse.json({
      ok: true,
      isImpersonating: false,
      impersonatedRole: null,
    });
  } catch (error) {
    console.error('[GET /api/impersonate] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to check impersonation status' },
      { status: 500 }
    );
  }
}

