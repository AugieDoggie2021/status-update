import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';

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

    // Require OWNER role
    await requireRole(programId, ['OWNER']);

    const supabase = getAdminClient();

    // Fetch audit log entries with user details
    const { data: revocations, error } = await supabase
      .from('access_revocations')
      .select(`
        id,
        revoked_user_id,
        revoked_by_user_id,
        revocation_reason,
        membership_id,
        bulk_revocation_id,
        revoked_at,
        program_id
      `)
      .eq('program_id', programId)
      .order('revoked_at', { ascending: false })
      .limit(100); // Limit to most recent 100 entries

    if (error) {
      console.error('[GET /api/members/audit] Error:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch audit log' },
        { status: 500 }
      );
    }

    // Fetch user details for revoked users and revokers
    const revokedUserIds = new Set<string>();
    const revokerUserIds = new Set<string>();
    
    revocations?.forEach(rev => {
      if (rev.revoked_user_id) revokedUserIds.add(rev.revoked_user_id);
      if (rev.revoked_by_user_id) revokerUserIds.add(rev.revoked_by_user_id);
    });

    const allUserIds = Array.from(new Set([...revokedUserIds, ...revokerUserIds]));
    
    let userMap = new Map<string, { email?: string; full_name?: string }>();
    
    if (allUserIds.length > 0) {
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (!usersError && users) {
        users.users.forEach(user => {
          if (allUserIds.includes(user.id)) {
            userMap.set(user.id, {
              email: user.email,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name,
            });
          }
        });
      }
    }

    // Enrich revocation entries with user details
    const enrichedRevocations = revocations?.map(rev => ({
      id: rev.id,
      revoked_user: {
        id: rev.revoked_user_id,
        ...userMap.get(rev.revoked_user_id),
      },
      revoked_by: {
        id: rev.revoked_by_user_id,
        ...userMap.get(rev.revoked_by_user_id),
      },
      revocation_reason: rev.revocation_reason,
      membership_id: rev.membership_id,
      bulk_revocation_id: rev.bulk_revocation_id,
      revoked_at: rev.revoked_at,
    })) || [];

    return NextResponse.json({
      ok: true,
      revocations: enrichedRevocations,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json(
          { ok: false, error: 'FORBIDDEN' },
          { status: 403 }
        );
      }
    }
    console.error('[GET /api/members/audit] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}

