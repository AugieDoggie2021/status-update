import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { parseNotesSmart, type Action } from '@/lib/openai';
import { parseRequestSchema } from '@/lib/zod-schemas';
import { resolveSingle, type Candidate } from '@/lib/server/resolve';
import { getAliasMap } from '@/lib/server/aliases';
import { getAdminClient } from '@/lib/supabase';
import { requireMembership } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const routePath = '/api/parse';
  try {
    const body = await request.json();
    
    // Log request keys (not secrets)
    console.log(`[${routePath}] Request keys: ${Object.keys(body).join(', ')}`);

    const { notes, programId = 'default' } = parseRequestSchema.parse(body);

    // Require membership (any role) to parse
    await requireMembership(programId);

    // Parse notes into actions
    const parsed = await parseNotesSmart({ notes, programId });

    // Get all workstreams for resolution
    const supabase = getAdminClient();
    const { data: allWorkstreams, error: wsError } = await supabase
      .from('workstreams')
      .select('id, name')
      .eq('program_id', programId)
      .is('deleted_at', null);

    if (wsError) {
      console.error(`[${routePath}] Error fetching workstreams:`, wsError);
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch workstreams' },
        { status: 500 }
      );
    }

    const all = (allWorkstreams || []).map((ws) => ({
      id: ws.id,
      name: ws.name,
      slug: undefined, // slug not in schema yet
    }));

    // Get aliases for better matching
    const aliases = await getAliasMap(programId);

    // Resolve names to IDs
    const candidates: Record<number, Candidate[]> = {};
    let confident = true;

    parsed.actions.forEach((a, idx) => {
      // Only resolve update/delete actions (create/noop don't need workstreamId)
      if (a.intent === 'update' || a.intent === 'delete') {
        // Skip if already resolved
        if (a.workstreamId) return;

        // Skip if no name to resolve
        if (!a.name) {
          confident = false;
          return;
        }

        const { chosen, candidates: list } = resolveSingle(a.name, all, aliases);

        candidates[idx] = list;

        if (chosen) {
          parsed.actions[idx].workstreamId = chosen.id;
        } else {
          confident = false;
        }

        // Confidence drops if multiple plausible candidates (gap < 0.2)
        if (!chosen || (list.length > 1 && list[0].score - (list[1]?.score ?? 0) < 0.2)) {
          confident = false;
        }
      }
      // create/noop intents are skipped (no resolution needed)
    });

    return NextResponse.json(
      {
        actions: parsed.actions,
        candidates,
        confidence: confident ? 'confident' : 'ambiguous',
        raw_text: parsed.raw_text,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
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
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Failed to parse notes' },
      { status: 500 }
    );
  }
}

