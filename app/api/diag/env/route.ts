import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasProgramId: !!process.env.NEXT_PUBLIC_PROGRAM_ID,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL ? true : false,
  });
}


