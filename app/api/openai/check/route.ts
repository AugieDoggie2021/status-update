import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

export async function GET() {
  const present = !!process.env.OPENAI_API_KEY;

  if (!present) {
    return NextResponse.json(
      { present, mode: 'naive' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    // Very small call: list models to verify permissions
    const res = await client.models.list();

    return NextResponse.json(
      {
        present: true,
        mode: 'openai',
        models_count: res.data?.length ?? 0,
        model_preference: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        present: true,
        mode: 'openai',
        error: e?.message || String(e),
        verified: false,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

