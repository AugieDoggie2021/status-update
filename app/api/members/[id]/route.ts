import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireRole, requireAuth } from '@/lib/auth';
import { firstZodMessage } from '@/lib/error-utils';
import { z } from 'zod';

const updateSchema = z.object({
  role: z.enum(['OWNER', 'CONTRIBUTOR', 'VIEWER']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role } = updateSchema.parse(body);

    if (!role) {
      return NextResponse.json(
        { ok: false, error: 'role is required' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Get membership to find program_id
    const { data: membership, error: membershipError } = await supabase
      .from('program_memberships')
      .select('program_id')
      .eq('id', id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { ok: false, error: 'Membership not found' },
        { status: 404 }
      );
    }

    // Require OWNER role
    await requireRole(membership.program_id, ['OWNER']);

    // Update membership
    const { error } = await supabase
      .from('program_memberships')
      .update({ role })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ ok: true, message: 'Role updated successfully' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json(
          { ok: false, error: 'FORBIDDEN' },
          { status: 403 }
        );
      }
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { ok: false, error: `Invalid request: ${firstZodMessage(error)}` },
          { status: 400 }
        );
      }
    }
    console.error('[PATCH /api/members/:id] Error:', error);
    return NextResponse.json(
      { ok: false, error: String((error as any)?.message ?? "Unexpected error") },
      { status: 500 }
    );
  }
}

const deleteSchema = z.object({
  reason: z.string().optional(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getAdminClient();

    // Parse request body for optional reason
    let reason: string | undefined;
    try {
      // Check if request has a body
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const body = await request.json();
        const parsed = deleteSchema.parse(body);
        reason = parsed.reason;
      }
    } catch {
      // Body is optional, continue without reason
    }

    // Get membership details before deletion (need user_id and program_id for audit log)
    const { data: membership, error: membershipError } = await supabase
      .from('program_memberships')
      .select('program_id, user_id')
      .eq('id', id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { ok: false, error: 'Membership not found' },
        { status: 404 }
      );
    }

    // Require OWNER role
    await requireRole(membership.program_id, ['OWNER']);

    // Get current user (who is performing the revocation)
    const session = await requireAuth();
    const revokedByUserId = session.user.id;

    // Prevent self-revocation (safety check)
    if (membership.user_id === revokedByUserId) {
      return NextResponse.json(
        { ok: false, error: 'Cannot revoke your own access. Please ask another owner to remove you.' },
        { status: 400 }
      );
    }

    // Delete membership
    const { error: deleteError } = await supabase
      .from('program_memberships')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('access_revocations')
      .insert({
        program_id: membership.program_id,
        revoked_user_id: membership.user_id,
        revoked_by_user_id: revokedByUserId,
        revocation_reason: reason || null,
        membership_id: id, // Store the membership ID for reference (even though it's deleted)
      });

    if (auditError) {
      // Log error but don't fail the request - revocation succeeded
      console.error('[DELETE /api/members/:id] Failed to create audit log:', auditError);
    }

    // Note: Impersonation cleanup is handled via cookies which expire naturally
    // If the revoked user has active impersonation sessions, they will be cleared
    // on their next request when the system checks their membership status

    return NextResponse.json({ 
      ok: true, 
      message: 'Member removed successfully',
      auditLogId: auditError ? null : 'created'
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
    }
    console.error('[DELETE /api/members/:id] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}

