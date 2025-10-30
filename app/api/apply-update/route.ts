import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { applyUpdateRequestSchema } from '@/lib/zod-schemas';
import { parseNotesToJSON, naiveParseNotes } from '@/lib/openai';
import { getAdminClient } from '@/lib/supabase';
import { calculateOverallStatus } from '@/lib/status';
import { requireRole } from '@/lib/auth';
import type { Workstream } from '@/lib/types';

export async function POST(request: NextRequest) {
  const routePath = '/api/apply-update';
  try {
    const body = await request.json();
    console.log(`[${routePath}] Request keys: ${Object.keys(body).join(', ')}`);
    
    const { programId, notes, appliedBy } = applyUpdateRequestSchema.parse(body);

    // Require OWNER or CONTRIBUTOR role
    await requireRole(programId, ['OWNER', 'CONTRIBUTOR']);

    let supabase;
    try {
      supabase = getAdminClient();
    } catch (supabaseError) {
      console.error(`[${routePath}] Supabase client error:`, supabaseError instanceof Error ? supabaseError.message : 'Unknown');
      return NextResponse.json(
        { ok: false, error: 'Database configuration error. Check SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      );
    }
    const todayISO = new Date().toISOString().split('T')[0]!;

    // Parse notes using OpenAI (with fallback)
    let parsed;
    if (!process.env.OPENAI_API_KEY) {
      console.warn(`[${routePath}] OPENAI_API_KEY not set, using naive parser`);
      parsed = naiveParseNotes(notes, todayISO);
    } else {
      try {
        parsed = await parseNotesToJSON(notes, todayISO);
      } catch (error) {
        console.error(`[${routePath}] OpenAI parsing failed:`, error instanceof Error ? error.message : 'Unknown');
        console.warn(`[${routePath}] Falling back to naive parser`);
        parsed = naiveParseNotes(notes, todayISO);
      }
    }

    // Insert into updates table
    const { error: updateError } = await supabase
      .from('updates')
      .insert({
        program_id: programId,
        raw_text: notes,
        parsed_json: parsed,
        applied_by: appliedBy || null,
      });

    if (updateError) {
      console.error('Failed to insert update:', updateError);
      // Continue even if update log fails
    }

    // Upsert workstreams by program_id + lower(name)
    for (const ws of parsed.workstreams) {
      const { data: existing, error: lookupError } = await supabase
        .from('workstreams')
        .select('id')
        .eq('program_id', programId)
        .ilike('name', ws.name)
        .maybeSingle();

      if (lookupError) {
        console.error(`[${routePath}] Workstream lookup error:`, lookupError);
        // Continue with next workstream
        continue;
      }

      const workstreamData = {
        program_id: programId,
        name: ws.name,
        status: ws.status,
        percent_complete: ws.percent_complete,
        summary: ws.summary,
        next_milestone: ws.next_milestone,
        next_milestone_due: ws.next_milestone_due,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from('workstreams')
          .update(workstreamData)
          .eq('id', existing.id);
        if (updateError) {
          console.error(`[${routePath}] Workstream update error:`, updateError);
        }
      } else {
        const { error: insertError } = await supabase.from('workstreams').insert(workstreamData);
        if (insertError) {
          console.error(`[${routePath}] Workstream insert error:`, insertError);
        }
      }
    }

    // Get all workstreams for this program to resolve IDs for risks/actions
    const { data: workstreams } = await supabase
      .from('workstreams')
      .select('id, name')
      .eq('program_id', programId);

    const workstreamMap = new Map<string, string>();
    workstreams?.forEach((ws) => {
      workstreamMap.set(ws.name.toLowerCase(), ws.id);
    });

    // Upsert risks by (program_id + lower(title))
    for (const risk of parsed.risks) {
      const workstreamId = risk.workstream
        ? workstreamMap.get(risk.workstream.toLowerCase()) || null
        : null;

      const { data: existing } = await supabase
        .from('risks')
        .select('id')
        .eq('program_id', programId)
        .ilike('title', risk.title)
        .maybeSingle();

      const riskData = {
        program_id: programId,
        workstream_id: workstreamId,
        title: risk.title,
        severity: risk.severity,
        status: risk.status,
        owner: risk.owner,
        due_date: risk.due_date,
        notes: risk.notes,
      };

      if (existing) {
        await supabase.from('risks').update(riskData).eq('id', existing.id);
      } else {
        await supabase.from('risks').insert(riskData);
      }
    }

    // Upsert actions by (program_id + lower(title))
    for (const action of parsed.actions) {
      const workstreamId = action.workstream
        ? workstreamMap.get(action.workstream.toLowerCase()) || null
        : null;

      const { data: existing } = await supabase
        .from('actions')
        .select('id')
        .eq('program_id', programId)
        .ilike('title', action.title)
        .maybeSingle();

      const actionData = {
        program_id: programId,
        workstream_id: workstreamId,
        title: action.title,
        owner: action.owner,
        due_date: action.due_date,
        status: action.status,
        notes: action.notes,
      };

      if (existing) {
        await supabase.from('actions').update(actionData).eq('id', existing.id);
      } else {
        await supabase.from('actions').insert(actionData);
      }
    }

    // Compute overall status
    const { data: allWorkstreams } = await supabase
      .from('workstreams')
      .select('*')
      .eq('program_id', programId);

    const overall = calculateOverallStatus(
      (allWorkstreams as Workstream[]) || []
    );

    return NextResponse.json({
      ok: true,
      parsed,
      overall,
    });
  } catch (error) {
    console.error(`[${routePath}] Error:`, error instanceof Error ? error.message : 'Unknown error');
    
    if (error instanceof Error) {
      // Zod validation errors
      if (error.message.includes('Required') || error.message.includes('Expected')) {
        return NextResponse.json(
          { ok: false, error: `Invalid request: ${error.message}` },
          { status: 400 }
        );
      }
      // Supabase enum errors
      if (error.message.includes('enum') || error.message.includes('invalid input')) {
        return NextResponse.json(
          { ok: false, error: `Data validation error: ${error.message}. Check status enum values (GREEN/YELLOW/RED, etc.).` },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Failed to apply update' },
      { status: 500 }
    );
  }
}

