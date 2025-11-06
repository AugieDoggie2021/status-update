import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
export const runtime = 'nodejs';
import { applyUpdateRequestSchema } from '@/lib/zod-schemas';
import { parseNotesToJSON, naiveParseNotes, type Action } from '@/lib/openai';
import { getAdminClient } from '@/lib/supabase';
import { calculateOverallStatus } from '@/lib/status';
import { requireRole } from '@/lib/auth';
import { matchWorkstreamId } from '@/lib/server/utils/matchWorkstream';
import { WORKSTREAMS_TAG } from '@/lib/client/keys';
import type { Workstream } from '@/lib/types';

/**
 * Apply resolved actions (new flow with IDs)
 * Returns diff of changes
 */
async function applyResolvedActions(
  routePath: string,
  supabase: ReturnType<typeof getAdminClient>,
  programId: string,
  actions: Action[],
  appliedBy?: string
): Promise<NextResponse> {
  // Generate correlation ID for logging
  const correlationId = `apply-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  console.log(`[${routePath}] correlationId: ${correlationId}, actions: ${actions.length}`);

  // Reject if any action lacks workstreamId (all actions must be resolved)
  const unresolved = actions.filter((a) => !a.workstreamId);
  if (unresolved.length > 0) {
    return NextResponse.json(
      { ok: false, error: 'Unresolved workstreamId', unresolved: unresolved.map((a) => a.name || 'Unknown') },
      { status: 400 }
    );
  }

  // Load before state for diff
  const ids = actions
    .filter((a) => a.intent !== 'delete' && a.workstreamId)
    .map((a) => a.workstreamId!);

  const { data: beforeData } = await supabase
    .from('workstreams')
    .select('*')
    .in('id', ids)
    .eq('program_id', programId);

  const beforeMap = new Map<string, any>();
  beforeData?.forEach((ws) => beforeMap.set(ws.id, ws));

  let updatedCount = 0;
  const diff: Array<{ id: string; before: any; after: any }> = [];

  // Process actions
  for (const a of actions) {
    if (a.intent === 'delete') {
      const deleteId = a.workstreamId;
      if (!deleteId) {
        console.warn(`[${routePath}] Delete action missing workstreamId: ${a.name}`);
        continue;
      }

      const { error } = await supabase
        .from('workstreams')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', deleteId)
        .eq('program_id', programId);

      if (error) {
        console.error(`[${routePath}] Delete error:`, error);
      } else {
        updatedCount++;
        const before = beforeMap.get(deleteId) || null;
        diff.push({
          id: deleteId,
          before,
          after: { ...before, deleted_at: new Date().toISOString() },
        });
      }
      continue;
    }

    // Update action
    if (!a.workstreamId) continue;

    const patch: any = { updated_at: new Date().toISOString() };

    if (typeof a.percent === 'number') {
      patch.percent_complete = Math.max(0, Math.min(100, a.percent));
    }
    if (a.status) {
      // Status is already normalized to GREEN/YELLOW/RED by parser
      patch.status = a.status;
    }
    if (a.next_milestone !== undefined) {
      patch.next_milestone = a.next_milestone;
    }

    const { error } = await supabase
      .from('workstreams')
      .update(patch)
      .eq('id', a.workstreamId)
      .eq('program_id', programId);

    if (error) {
      console.error(`[${routePath}] Update error:`, error);
    } else {
      updatedCount++;
      const before = beforeMap.get(a.workstreamId) || null;
      const { data: afterData } = await supabase
        .from('workstreams')
        .select('*')
        .eq('id', a.workstreamId)
        .single();

      diff.push({
        id: a.workstreamId,
        before,
        after: afterData || { ...before, ...patch },
      });
    }
  }

  // Revalidate
  try {
    revalidateTag(WORKSTREAMS_TAG(programId));
    revalidatePath('/dashboard');
  } catch (e) {
    console.warn(`[${routePath}] Revalidation failed:`, e);
  }

  console.log(`[${routePath}] correlationId: ${correlationId}, updatedCount: ${updatedCount}, diff entries: ${diff.length}`);

  return NextResponse.json({
    ok: true,
    updatedCount,
    diff,
    correlationId,
  });
}

export async function POST(request: NextRequest) {
  const routePath = '/api/apply-update';
  try {
    const body = await request.json();
    console.log(`[${routePath}] Request keys: ${Object.keys(body).join(', ')}`);
    
    const { programId, notes, appliedBy, actions } = applyUpdateRequestSchema.parse(body);

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

    // NEW FLOW: If actions are provided (from parse endpoint), use resolved IDs
    if (actions && Array.isArray(actions) && actions.length > 0) {
      return await applyResolvedActions(routePath, supabase, programId, actions, appliedBy);
    }

    // OLD FLOW: Parse notes (backward compatibility)
    if (!notes) {
      return NextResponse.json(
        { ok: false, error: 'Either notes or actions must be provided' },
        { status: 400 }
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

    console.log(`[${routePath}] parsed workstreams: ${parsed.workstreams?.length ?? 0}, risks: ${parsed.risks?.length ?? 0}, actions: ${parsed.actions?.length ?? 0}, deletions: ${parsed.deletions?.workstreams?.length ?? 0}`);

    // Fail loudly if nothing was parsed (including deletions)
    if ((parsed.workstreams?.length ?? 0) === 0 &&
        (parsed.risks?.length ?? 0) === 0 &&
        (parsed.actions?.length ?? 0) === 0 &&
        (parsed.deletions?.workstreams?.length ?? 0) === 0) {
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

    // Get all existing workstreams for fuzzy matching (exclude deleted)
    const { data: allWorkstreams } = await supabase
      .from('workstreams')
      .select('id, name')
      .eq('program_id', programId)
      .is('deleted_at', null);

    const workstreamList = (allWorkstreams || []).map((ws) => ({ id: ws.id, name: ws.name }));

    // Process deletions FIRST (before updates)
    let workstreamDeleteCount = 0;
    const deleteUnmatched: string[] = [];
    if (parsed.deletions?.workstreams && parsed.deletions.workstreams.length > 0) {
      console.log(`[${routePath}] Processing ${parsed.deletions.workstreams.length} deletion(s)`);
      for (const deleteName of parsed.deletions.workstreams) {
        // Try to find workstream using exact or fuzzy match
        let existingId: string | null = null;
        const exactMatch = workstreamList.find((w) => w.name.toLowerCase() === deleteName.toLowerCase());
        existingId = exactMatch ? exactMatch.id : matchWorkstreamId(deleteName, workstreamList);

        if (existingId) {
          // Soft delete: set deleted_at timestamp
          const { error: deleteError } = await supabase
            .from('workstreams')
            .update({
              deleted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingId)
            .eq('program_id', programId);

          if (deleteError) {
            console.error(`[${routePath}] Workstream delete error:`, deleteError);
          } else {
            workstreamDeleteCount++;
            console.log(`[${routePath}] Deleted workstream: "${deleteName}" (id: ${existingId})`);
            // Remove from workstreamList so it won't be matched in updates
            const index = workstreamList.findIndex((w) => w.id === existingId);
            if (index >= 0) workstreamList.splice(index, 1);
          }
        } else {
          deleteUnmatched.push(deleteName);
          console.warn(`[${routePath}] No match found for deletion: "${deleteName}"`);
        }
      }
    }

    // Update-only mode: do not create new workstreams unless explicitly allowed
    const allowCreate = false;
    const unmatched: string[] = [];

    // Upsert workstreams using fuzzy matching
    let workstreamUpdateCount = 0;
    for (const ws of parsed.workstreams) {
      // Normalize status synonyms (AMBER → YELLOW)
      let status = (ws.status || 'GREEN').toUpperCase();
      if (status === 'AMBER') status = 'YELLOW';

      // Try to find existing workstream using exact or fuzzy match
      let existingId: string | null = null;
      const exactMatch = workstreamList.find((w) => w.name.toLowerCase() === ws.name.toLowerCase());
      existingId = exactMatch ? exactMatch.id : matchWorkstreamId(ws.name, workstreamList);

      const workstreamData = {
        program_id: programId,
        name: ws.name,
        status: status as 'GREEN' | 'YELLOW' | 'RED',
        percent_complete: ws.percent_complete ?? 0,
        summary: ws.summary ?? '',
        next_milestone: ws.next_milestone ?? null,
        next_milestone_due: ws.next_milestone_due ?? null,
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
      } else if (allowCreate) {
        const { error: insertError } = await supabase.from('workstreams').insert(workstreamData);
        if (insertError) {
          console.error(`[${routePath}] Workstream insert error:`, insertError);
        } else {
          workstreamUpdateCount++;
        }
      } else {
        unmatched.push(ws.name);
        console.warn(`[${routePath}] No match found for workstream: "${ws.name}"`);
      }
    }

    // Fail loudly if nothing was updated/deleted and there are unmatched workstreams
    if (workstreamUpdateCount === 0 && workstreamDeleteCount === 0 && unmatched.length > 0 && deleteUnmatched.length > 0) {
      const candidates = (workstreamList || []).map(w => w.name).sort();
      const allUnmatched = [...unmatched, ...deleteUnmatched];
      return NextResponse.json(
        { ok: false, error: `No matching workstream found for: ${allUnmatched.join(', ')}. Try one of: ${candidates.join(' • ')}` },
        { status: 400 }
      );
    }

    // If only deletions failed, still return error
    if (workstreamDeleteCount === 0 && deleteUnmatched.length > 0 && workstreamUpdateCount === 0) {
      const candidates = (allWorkstreams || []).map(w => w.name).sort();
      return NextResponse.json(
        { ok: false, error: `No matching workstream found to delete: ${deleteUnmatched.join(', ')}. Try one of: ${candidates.join(' • ')}` },
        { status: 400 }
      );
    }

    // Refresh workstream list after updates for risk/action mapping (exclude deleted)
    const { data: workstreams } = await supabase
      .from('workstreams')
      .select('id, name')
      .eq('program_id', programId)
      .is('deleted_at', null);

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

    const updatedCount = workstreamUpdateCount + workstreamDeleteCount + riskUpdateCount + actionUpdateCount;
    console.log(`[${routePath}] updatedCount: ${updatedCount} (workstreams: ${workstreamUpdateCount}, deleted: ${workstreamDeleteCount}, risks: ${riskUpdateCount}, actions: ${actionUpdateCount})`);

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

