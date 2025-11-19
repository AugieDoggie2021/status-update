import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { initiateOAuthFlow } from '@/lib/integrations/ado/auth';
import { z } from 'zod';

const connectSchema = z.object({
  programId: z.string().uuid(),
  organizationUrl: z.string().url(),
  projectName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const routePath = '/api/integrations/ado/connect';
  try {
    const body = await request.json();
    const validated = connectSchema.parse(body);

    // Require OWNER role
    await requireRole(validated.programId, ['OWNER']);

    // Generate OAuth URL
    const authUrl = initiateOAuthFlow(
      validated.organizationUrl,
      validated.projectName,
      validated.programId
    );

    return NextResponse.json({ ok: true, authUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    console.error(`[${routePath}] Unexpected error:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}

