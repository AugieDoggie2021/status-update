import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireRole, requireAuth } from '@/lib/auth';
import { firstZodMessage } from '@/lib/error-utils';
import { z } from 'zod';

const bulkRevokeSchema = z.object({
  membershipIds: z.array(z.string().uuid()).min(1, 'At least one membership ID is required'),
  reason: z.string().optional(),
  programId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { membershipIds, reason, programId } = bulkRevokeSchema.parse(body);

    // Require OWNER role
    await requireRole(programId, ['OWNER']);

    // Get current user (who is performing the revocation)
    const session = await requireAuth();
    const revokedByUserId = session.user.id;

    const supabase = getAdminClient();

    // Generate bulk_revocation_id for grouping
    const bulkRevocationId = crypto.randomUUID();

    // Fetch all memberships to validate and get user_ids
    const { data: memberships, error: fetchError } = await supabase
      .from('program_memberships')
      .select('id, user_id, program_id')
      .in('id', membershipIds)
      .eq('program_id', programId); // Ensure all memberships belong to the same program

    if (fetchError) {
      throw fetchError;
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No valid memberships found' },
        { status: 404 }
      );
    }

    // Verify all memberships belong to the specified program
    const invalidMemberships = memberships.filter(m => m.program_id !== programId);
    if (invalidMemberships.length > 0) {
      return NextResponse.json(
        { ok: false, error: 'Some memberships do not belong to the specified program' },
        { status: 400 }
      );
    }

    // Prevent revoking OWNERs (check roles before deletion)
    const { data: membershipRoles, error: rolesError } = await supabase
      .from('program_memberships')
      .select('id, role, user_id')
      .in('id', memberships.map(m => m.id));

    if (rolesError) {
      throw rolesError;
    }

    const ownerMemberships = membershipRoles?.filter(m => m.role === 'OWNER') || [];
    if (ownerMemberships.length > 0) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Cannot revoke OWNER role members. Please change their role first.',
          ownerIds: ownerMemberships.map(m => m.id)
        },
        { status: 400 }
      );
    }

    // Prevent self-revocation (safety check)
    const selfRevocation = memberships.find(m => m.user_id === revokedByUserId);
    if (selfRevocation) {
      return NextResponse.json(
        { ok: false, error: 'Cannot revoke your own access. Please ask another owner to remove you.' },
        { status: 400 }
      );
    }

    // Delete all memberships
    const membershipIdsToDelete = memberships.map(m => m.id);
    const { error: deleteError } = await supabase
      .from('program_memberships')
      .delete()
      .in('id', membershipIdsToDelete);

    if (deleteError) throw deleteError;

    // Create audit log entries for each revoked membership
    const auditEntries = memberships.map(membership => ({
      program_id: programId,
      revoked_user_id: membership.user_id,
      revoked_by_user_id: revokedByUserId,
      revocation_reason: reason || null,
      membership_id: membership.id,
      bulk_revocation_id: bulkRevocationId,
    }));

    const { error: auditError } = await supabase
      .from('access_revocations')
      .insert(auditEntries);

    if (auditError) {
      // Log error but don't fail the request - revocations succeeded
      console.error('[POST /api/members/bulk-revoke] Failed to create audit logs:', auditError);
    }

    // Note: Impersonation cleanup is handled via cookies which expire naturally
    // If revoked users have active impersonation sessions, they will be cleared
    // on their next request when the system checks their membership status

    return NextResponse.json({
      ok: true,
      message: `Successfully revoked ${memberships.length} member(s)`,
      revokedCount: memberships.length,
      bulkRevocationId: bulkRevocationId,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json(
          { ok: false, error: 'FORBIDDEN' },
          { status: 403 }
        );
      }
      if (error.message === 'UNAUTHORIZED') {
        return NextResponse.json(
          { ok: false, error: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { ok: false, error: `Invalid request: ${firstZodMessage(error)}` },
          { status: 400 }
        );
      }
    }
    console.error('[POST /api/members/bulk-revoke] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to revoke members' },
      { status: 500 }
    );
  }
}

