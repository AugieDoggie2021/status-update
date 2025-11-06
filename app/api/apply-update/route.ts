import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
export const runtime = 'nodejs';
import { applyUpdateRequestSchema } from '@/lib/zod-schemas';
import { parseNotesToJSON, naiveParseNotes } from '@/lib/openai';
import { getAdminClient } from '@/lib/supabase';
import { calculateOverallStatus } from '@/lib/status';
import { requireRole } from '@/lib/auth';
import { matchWorkstreamId } from '@/lib/server/utils/matchWorkstream';
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

    console.log(`[${routePath}] programId: ${programId}`);
    console.log(`[${routePath}] notes length: ${notes.length}`);

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

    console.log(`[${routePath}] parsed workstreams: ${parsed.workstreams?.length ?? 0}, risks: ${parsed.risks?.length ?? 0}, actions: ${parsed.actions?.length ?? 0}`);

    // Fail loudly if nothing was parsed
    if ((parsed.workstreams?.length ?? 0) === 0 &&
        (parsed.risks?.length ?? 0) === 0 &&
        (parsed.actions?.length ?? 0) === 0) {
      console.warn(`[${routePath}] No actionable items parsed from notes.`);
      return NextResponse.json(
        { ok: false, error: 'No workstreams recognized. Try "<Workstream Name>: now at 70%, status Red" or include the word "workstream".' },
        { status: 400 }
      );
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

    // Get all existing workstreams for fuzzy matching
    const { data: allWorkstreams } = await supabase
      .from('workstreams')
      .select('id, name')
      .eq('program_id', programId);

    const workstreamList = (allWorkstreams || []).map((ws) => ({ id: ws.id, name: ws.name }));

    // Upsert workstreams using fuzzy matching
    let workstreamUpdateCount = 0;
    for (const ws of parsed.workstreams) {
      // Try to find existing workstream using fuzzy match
      let existingId: string | null = null;
      
      // First try exact match (case-insensitive)
      const exactMatch = workstreamList.find((w) => w.name.toLowerCase() === ws.name.toLowerCase());
      if (exactMatch) {
        existingId = exactMatch.id;
      } else {
        // Use fuzzy matcher
        existingId = matchWorkstreamId(ws.name, workstreamList);
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

      if (existingId) {
        const { error: updateError } = await supabase
          .from('workstreams')
          .update(workstreamData)
          .eq('id', existingId);
        if (updateError) {
          console.error(`[${routePath}] Workstream update error:`, updateError);
        } else {
          workstreamUpdateCount++;
        }
      } else {
        const { error: insertError } = await supabase.from('workstreams').insert(workstreamData);
        if (insertError) {
          console.error(`[${routePath}] Workstream insert error:`, insertError);
        } else {
          workstreamUpdateCount++;
        }
      }
    }

    // Refresh workstream list after updates for risk/action mapping
    const { data: workstreams } = await supabase
      .from('workstreams')
      .select('id, name')
      .eq('program_id', programId);

    const workstreamMap = new Map<string, string>();
    workstreams?.forEach((ws) => {
      workstreamMap.set(ws.name.toLowerCase(), ws.id);
    });

    // Upsert risks by (program_id + lower(title)) with fuzzy workstream matching
    let riskUpdateCount = 0;
    for (const risk of parsed.risks) {
      let workstreamId: string | null = null;
      if (risk.workstream) {
        // Try exact match first
        workstreamId = workstreamMap.get(risk.workstream.toLowerCase()) || null;
        // If no exact match, try fuzzy match
        if (!workstreamId && workstreams) {
          workstreamId = matchWorkstreamId(risk.workstream, workstreams.map((ws) => ({ id: ws.id, name: ws.name })));
        }
      }

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
        const { error } = await supabase.from('risks').update(riskData).eq('id', existing.id);
        if (!error) riskUpdateCount++;
      } else {
        const { error } = await supabase.from('risks').insert(riskData);
        if (!error) riskUpdateCount++;
      }
    }

    // Upsert actions by (program_id + lower(title)) with fuzzy workstream matching
    let actionUpdateCount = 0;
    for (const action of parsed.actions) {
      let workstreamId: string | null = null;
      if (action.workstream) {
        // Try exact match first
        workstreamId = workstreamMap.get(action.workstream.toLowerCase()) || null;
        // If no exact match, try fuzzy match
        if (!workstreamId && workstreams) {
          workstreamId = matchWorkstreamId(action.workstream, workstreams.map((ws) => ({ id: ws.id, name: ws.name })));
        }
      }

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
        const { error } = await supabase.from('actions').update(actionData).eq('id', existing.id);
        if (!error) actionUpdateCount++;
      } else {
        const { error } = await supabase.from('actions').insert(actionData);
        if (!error) actionUpdateCount++;
      }
    }

    const updatedCount = workstreamUpdateCount + riskUpdateCount + actionUpdateCount;
    console.log(`[${routePath}] updatedCount: ${updatedCount} (workstreams: ${workstreamUpdateCount}, risks: ${riskUpdateCount}, actions: ${actionUpdateCount})`);

    // Compute overall status
    const { data: finalWorkstreams } = await supabase
      .from('workstreams')
      .select('*')
      .eq('program_id', programId);

    const overall = calculateOverallStatus(
      (finalWorkstreams as Workstream[]) || []
    );

    // Revalidate server caches
    try {
      revalidatePath('/dashboard');
      console.log(`[${routePath}] Revalidated path: /dashboard`);
    } catch (e) {
      console.warn(`[${routePath}] Revalidation failed:`, e);
    }

    return NextResponse.json({
      ok: true,
      updatedCount,
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

