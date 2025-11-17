import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireRole, requireMembership } from '@/lib/auth';
import { firstZodMessage } from '@/lib/error-utils';
import { z } from 'zod';

// Default theme values
const DEFAULT_APP_NAME = 'Status Tracker';
const DEFAULT_PRIMARY_COLOR = '#10b981'; // emerald-600
const DEFAULT_SECONDARY_COLOR = '#0284c7'; // sky-600
const DEFAULT_ACCENT_COLOR = '#10b981'; // emerald-600

// Hex color validation regex
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const updateThemeSchema = z.object({
  app_name: z.string().min(1).max(50).optional(),
  primary_color: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
  secondary_color: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
  accent_color: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
  logo_url: z.string().url().nullable().optional(),
});

/**
 * GET /api/theme?programId={id}
 * Fetch program theme configuration
 * Requires membership (any role)
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

    // Require membership (any role)
    await requireMembership(programId);

    const supabase = getAdminClient();

    // Fetch program with theme columns
    const { data: program, error } = await supabase
      .from('programs')
      .select('logo_url, app_name, primary_color, secondary_color, accent_color')
      .eq('id', programId)
      .single();

    if (error || !program) {
      console.error('[GET /api/theme] Error:', error);
      return NextResponse.json(
        { ok: false, error: 'Program not found' },
        { status: 404 }
      );
    }

    // Return theme with defaults applied
    return NextResponse.json({
      ok: true,
      theme: {
        logo_url: program.logo_url || null,
        app_name: program.app_name || DEFAULT_APP_NAME,
        primary_color: program.primary_color || DEFAULT_PRIMARY_COLOR,
        secondary_color: program.secondary_color || DEFAULT_SECONDARY_COLOR,
        accent_color: program.accent_color || DEFAULT_ACCENT_COLOR,
      },
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
    console.error('[GET /api/theme] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch theme' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/theme?programId={id}
 * Update program theme configuration
 * Requires OWNER role
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const parsed = updateThemeSchema.parse(body);

    // Build update object (only include provided fields)
    const updateData: Record<string, any> = {};
    if (parsed.app_name !== undefined) {
      updateData.app_name = parsed.app_name || null;
    }
    if (parsed.primary_color !== undefined) {
      updateData.primary_color = parsed.primary_color || null;
    }
    if (parsed.secondary_color !== undefined) {
      updateData.secondary_color = parsed.secondary_color || null;
    }
    if (parsed.accent_color !== undefined) {
      updateData.accent_color = parsed.accent_color || null;
    }
    if (parsed.logo_url !== undefined) {
      updateData.logo_url = parsed.logo_url;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Update program theme
    const { data: program, error } = await supabase
      .from('programs')
      .update(updateData)
      .eq('id', programId)
      .select('logo_url, app_name, primary_color, secondary_color, accent_color')
      .single();

    if (error) {
      console.error('[PATCH /api/theme] Error:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to update theme' },
        { status: 500 }
      );
    }

    // Return updated theme with defaults applied
    return NextResponse.json({
      ok: true,
      theme: {
        logo_url: program.logo_url || null,
        app_name: program.app_name || DEFAULT_APP_NAME,
        primary_color: program.primary_color || DEFAULT_PRIMARY_COLOR,
        secondary_color: program.secondary_color || DEFAULT_SECONDARY_COLOR,
        accent_color: program.accent_color || DEFAULT_ACCENT_COLOR,
      },
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
          { ok: false, error: `Invalid request: ${firstZodMessage(error)}` },
          { status: 400 }
        );
      }
    }
    console.error('[PATCH /api/theme] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update theme' },
      { status: 500 }
    );
  }
}

