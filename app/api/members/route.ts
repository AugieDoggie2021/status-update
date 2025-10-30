import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

interface MemberResponse {
  id: string;
  user_id: string;
  role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';
  email?: string;
  full_name?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId');

    if (!programId) {
      return NextResponse.json(
        { ok: false, error: 'programId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Check if user is a member of this program
    const { data: membership } = await supabase
      .from('program_memberships')
      .select('role')
      .eq('program_id', programId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Fetch all memberships for this program with user info
    const { data: memberships, error } = await supabase
      .from('program_memberships')
      .select('id, user_id, role')
      .eq('program_id', programId);

    if (error) {
      console.error('[GET /api/members] Error fetching memberships:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch members' },
        { status: 500 }
      );
    }

    // Fetch user details from auth.users
    const userIds = memberships?.map((m) => m.user_id) || [];
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('[GET /api/members] Error fetching users:', usersError);
      // Continue without user details
    }

    const members: MemberResponse[] =
      memberships?.map((m) => {
        const user = users?.users.find((u) => u.id === m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role as 'OWNER' | 'CONTRIBUTOR' | 'VIEWER',
          email: user?.email,
          full_name: user?.user_metadata?.full_name,
        };
      }) || [];

    return NextResponse.json({ ok: true, members });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    console.error('[GET /api/members] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

