import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { explainWeeklyRequestSchema } from '@/lib/zod-schemas';
import { getAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { getOpenAI } from '@/lib/openai';

export async function POST(request: NextRequest) {
  const routePath = '/api/explain-weekly';
  try {
    const body = await request.json();
    console.log(`[${routePath}] Request keys: ${Object.keys(body).join(', ')}`);
    
    const { programId } = explainWeeklyRequestSchema.parse(body);

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

    // Fetch program details
    const { data: program } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .single();

    // Fetch workstreams
    const { data: workstreams } = await supabase
      .from('workstreams')
      .select('*')
      .eq('program_id', programId)
      .order('updated_at', { ascending: false });

    // Fetch open risks
    const { data: risks } = await supabase
      .from('risks')
      .select('*')
      .eq('program_id', programId)
      .in('status', ['OPEN', 'MITIGATED'])
      .order('severity', { ascending: false });

    // Fetch open actions
    const { data: actions } = await supabase
      .from('actions')
      .select('*')
      .eq('program_id', programId)
      .in('status', ['OPEN', 'IN_PROGRESS'])
      .order('due_date', { ascending: true });

    if (!workstreams || workstreams.length === 0) {
      return NextResponse.json({
        ok: true,
        text: 'No workstreams found for this program.',
      });
    }

    // Build prompt for OpenAI
    const prompt = `Generate a concise executive weekly summary (max 180 words) for the following program status:

Program: ${program?.name || 'N/A'}

Workstreams:
${workstreams
  .map(
    (ws) =>
      `- ${ws.name}: ${ws.status} status, ${ws.percent_complete}% complete. ${ws.summary}. Next milestone: ${ws.next_milestone || 'N/A'}`
  )
  .join('\n')}

Open Risks:
${
  risks && risks.length > 0
    ? risks
        .map(
          (r) =>
            `- ${r.title} (${r.severity} severity, owner: ${r.owner || 'Unassigned'})`
        )
        .join('\n')
    : 'None'
}

Open Actions:
${
  actions && actions.length > 0
    ? actions
        .map(
          (a) =>
            `- ${a.title} (owner: ${a.owner || 'Unassigned'}, due: ${a.due_date || 'TBD'})`
        )
        .join('\n')
    : 'None'
}

Generate a professional, concise summary suitable for executive review. Focus on status, key risks, and next steps.`;

    if (!process.env.OPENAI_API_KEY) {
      console.warn(`[${routePath}] OPENAI_API_KEY not set, using fallback summary`);
      const fallbackText = `Program: ${program?.name || 'N/A'}\n\nStatus: ${
        workstreams.length
      } workstream(s) active. ${workstreams.filter((w) => w.status === 'GREEN').length} on track, ${
        workstreams.filter((w) => w.status === 'RED').length
      } at risk.\n\nOpen Risks: ${risks?.length || 0}\nOpen Actions: ${
        actions?.length || 0
      }`;

      return NextResponse.json({
        ok: true,
        text: fallbackText,
        _fallback: true,
      });
    }

    try {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      });

      const text = completion.choices[0]?.message?.content || 'Failed to generate summary.';

      // Save to reports table
      try {
        await supabase.from('reports').insert({
          program_id: programId,
          text,
        });
      } catch (saveError) {
        // Log but don't fail - reports table might not exist yet
        console.warn(`[${routePath}] Failed to save report (table may not exist):`, saveError instanceof Error ? saveError.message : 'Unknown');
      }

      return NextResponse.json({
        ok: true,
        text,
      });
    } catch (error) {
      console.error(`[${routePath}] OpenAI error:`, error instanceof Error ? error.message : 'Unknown');
      // Fallback if OpenAI fails
      const fallbackText = `Program: ${program?.name || 'N/A'}\n\nStatus: ${
        workstreams.length
      } workstream(s) active. ${workstreams.filter((w) => w.status === 'GREEN').length} on track, ${
        workstreams.filter((w) => w.status === 'RED').length
      } at risk.\n\nOpen Risks: ${risks?.length || 0}\nOpen Actions: ${
        actions?.length || 0
      }`;

      // Save fallback report too
      try {
        await supabase.from('reports').insert({
          program_id: programId,
          text: fallbackText,
        });
      } catch (saveError) {
        console.warn(`[${routePath}] Failed to save fallback report:`, saveError instanceof Error ? saveError.message : 'Unknown');
      }

      return NextResponse.json({
        ok: true,
        text: fallbackText,
        _fallback: true,
      });
    }
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
      { ok: false, error: 'Failed to generate weekly summary' },
      { status: 500 }
    );
  }
}

