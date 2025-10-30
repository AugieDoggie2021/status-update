import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { parseNotesToJSON, naiveParseNotes } from '@/lib/openai';
import { parseRequestSchema } from '@/lib/zod-schemas';

export async function POST(request: NextRequest) {
  const routePath = '/api/parse';
  try {
    const body = await request.json();
    
    // Log request keys (not secrets)
    console.log(`[${routePath}] Request keys: ${Object.keys(body).join(', ')}`);

    const { notes } = parseRequestSchema.parse(body);

    if (!process.env.OPENAI_API_KEY) {
      console.warn(`[${routePath}] OPENAI_API_KEY not set, using naive parser`);
      const todayISO = new Date().toISOString().split('T')[0]!;
      const parsed = naiveParseNotes(notes, todayISO);
      return NextResponse.json({ ...parsed, _fallback: true });
    }

    const todayISO = new Date().toISOString().split('T')[0]!;
    let parsed;
    
    try {
      parsed = await parseNotesToJSON(notes, todayISO);
    } catch (openaiError) {
      console.error(`[${routePath}] OpenAI error:`, openaiError instanceof Error ? openaiError.message : 'Unknown');
      // Fallback to naive parser
      console.warn(`[${routePath}] Falling back to naive parser`);
      parsed = naiveParseNotes(notes, todayISO);
      return NextResponse.json({ ...parsed, _fallback: true });
    }

    return NextResponse.json(parsed);
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

