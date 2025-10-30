import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { z } from 'zod';

const inviteSchema = z.object({
  programId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['OWNER', 'CONTRIBUTOR', 'VIEWER']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { programId, email, role } = inviteSchema.parse(body);

    // Require OWNER role
    await requireRole(programId, ['OWNER']);

    const supabase = getAdminClient();

    // Find user by email
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      // User doesn't exist yet - store invitation with email (you could create a separate invitations table)
      // For now, we'll return an error suggesting they sign up first
      return NextResponse.json(
        {
          ok: false,
          error: 'User not found. Please ask them to sign up first, or create the membership after they sign up.',
        },
        { status: 404 }
      );
    }

    // Check if membership already exists
    const { data: existing } = await supabase
      .from('program_memberships')
      .select('id')
      .eq('program_id', programId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      // Update existing membership
      const { error } = await supabase
        .from('program_memberships')
        .update({ role })
        .eq('id', existing.id);

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        message: 'Membership updated',
        membershipId: existing.id,
      });
    }

    // Create new membership
    const { data, error } = await supabase
      .from('program_memberships')
      .insert({
        program_id: programId,
        user_id: user.id,
        role,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      message: 'User invited successfully',
      membershipId: data.id,
    });
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
    console.error('[POST /api/members/invite] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to invite user' },
      { status: 500 }
    );
  }
}

