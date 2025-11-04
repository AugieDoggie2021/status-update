import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/authz';

/**
 * GET /api/debug/whoami
 * Returns current user info with program memberships
 * Useful for debugging RBAC issues
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { userId: null, email: null, memberships: [] },
        { status: 200 }
      );
    }

    const supabase = getAdminClient();
    
    // Get all memberships for this user
    const { data: memberships, error } = await supabase
      .from('program_memberships')
      .select('program_id, role')
      .eq('user_id', session.user.id);

    if (error) {
      console.error('[GET /api/debug/whoami] Error fetching memberships:', error);
      return NextResponse.json(
        { 
          userId: session.user.id, 
          email: session.user.email,
          memberships: [],
          error: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      userId: session.user.id,
      email: normalizeEmail(session.user.email),
      memberships: (memberships || []).map(m => ({
        programId: m.program_id,
        role: m.role,
      })),
    });
  } catch (error) {
    console.error('[GET /api/debug/whoami] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get user info', userId: null, email: null, memberships: [] },
      { status: 500 }
    );
  }
}

