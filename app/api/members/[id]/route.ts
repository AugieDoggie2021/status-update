import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
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
          { ok: false, error: `Invalid request: ${error.errors[0]?.message}` },
          { status: 400 }
        );
      }
    }
    console.error('[PATCH /api/members/:id] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update membership' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Delete membership
    const { error } = await supabase
      .from('program_memberships')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ ok: true, message: 'Member removed successfully' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json(
          { ok: false, error: 'FORBIDDEN' },
          { status: 403 }
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

