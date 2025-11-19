import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireRole, requireMembership } from '@/lib/auth';
import { z } from 'zod';

const createMappingSchema = z.object({
  connectionId: z.string().uuid(),
  entityType: z.enum(['workstream', 'risk', 'action']),
  adoFieldName: z.string().min(1),
  trackerFieldName: z.string().min(1),
  mappingType: z.enum(['direct', 'transform', 'custom']),
  transformFunction: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const routePath = '/api/integrations/ado/mappings';
  try {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { ok: false, error: 'connectionId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Get connection to verify program membership
    const { data: connection, error: connError } = await supabase
      .from('ado_connections')
      .select('program_id')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { ok: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Require membership (any role)
    await requireMembership(connection.program_id);

    const { data, error } = await supabase
      .from('ado_field_mappings')
      .select('*')
      .eq('connection_id', connectionId)
      .order('entity_type', { ascending: true });

    if (error) {
      console.error(`[${routePath}] Supabase query error:`, error.message);
      return NextResponse.json(
        { ok: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, mappings: data || [] });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    console.error(`[${routePath}] Unexpected error:`, error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch mappings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const routePath = '/api/integrations/ado/mappings';
  try {
    const body = await request.json();
    const validated = createMappingSchema.parse(body);

    const supabase = getAdminClient();

    // Get connection to verify program ownership
    const { data: connection, error: connError } = await supabase
      .from('ado_connections')
      .select('program_id')
      .eq('id', validated.connectionId)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { ok: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Require OWNER role
    await requireRole(connection.program_id, ['OWNER']);

    // Upsert mapping (unique constraint handles duplicates)
    const { data, error } = await supabase
      .from('ado_field_mappings')
      .upsert({
        connection_id: validated.connectionId,
        entity_type: validated.entityType,
        ado_field_name: validated.adoFieldName,
        tracker_field_name: validated.trackerFieldName,
        mapping_type: validated.mappingType,
        transform_function: validated.transformFunction || null,
      }, {
        onConflict: 'connection_id,entity_type,ado_field_name',
      })
      .select()
      .single();

    if (error) {
      console.error(`[${routePath}] Supabase upsert error:`, error.message);
      return NextResponse.json(
        { ok: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, mapping: data });
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
      { ok: false, error: 'Failed to create mapping' },
      { status: 500 }
    );
  }
}

