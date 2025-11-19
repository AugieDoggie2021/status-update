import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { exchangeCodeForToken, encryptToken } from '@/lib/integrations/ado/auth';

export async function GET(request: NextRequest) {
  const routePath = '/api/integrations/ado/callback';
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error(`[${routePath}] OAuth error:`, error);
      return NextResponse.redirect(
        new URL(`/admin/integrations?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/admin/integrations?error=missing_code_or_state', request.url)
      );
    }

    // Decode state to get programId and connection info
    let stateData: { programId: string; organizationUrl: string; projectName: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    } catch (e) {
      return NextResponse.redirect(
        new URL('/admin/integrations?error=invalid_state', request.url)
      );
    }

    // Verify user is authenticated and is OWNER
    const session = await requireAuth();
    const supabase = getAdminClient();

    // Check if user is OWNER
    const { data: membership } = await supabase
      .from('program_memberships')
      .select('role')
      .eq('program_id', stateData.programId)
      .eq('user_id', session.user.id)
      .single();

    if (!membership || membership.role !== 'OWNER') {
      return NextResponse.redirect(
        new URL('/admin/integrations?error=unauthorized', request.url)
      );
    }

    // Exchange code for token
    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForToken(code, state);

    // Calculate expiration time
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    // Store connection
    const { data: connection, error: insertError } = await supabase
      .from('ado_connections')
      .insert({
        program_id: stateData.programId,
        organization_url: stateData.organizationUrl,
        project_name: stateData.projectName,
        access_token_encrypted: encryptToken(accessToken),
        refresh_token_encrypted: refreshToken ? encryptToken(refreshToken) : null,
        token_expires_at: expiresAt,
        created_by: session.user.id,
      })
      .select('id')
      .single();

    if (insertError || !connection) {
      console.error(`[${routePath}] Failed to store connection:`, insertError?.message);
      return NextResponse.redirect(
        new URL('/admin/integrations?error=storage_failed', request.url)
      );
    }

    // Redirect to integrations page with success
    return NextResponse.redirect(
      new URL(`/admin/integrations?success=true&connectionId=${connection.id}`, request.url)
    );
  } catch (error) {
    console.error(`[${routePath}] Unexpected error:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.redirect(
      new URL(`/admin/integrations?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`, request.url)
    );
  }
}

