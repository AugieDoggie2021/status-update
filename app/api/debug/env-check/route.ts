import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint to verify environment configuration
 * Visit /api/debug/env-check to see environment variable status
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check if URLs match
  const baseUrlHost = baseUrl ? new URL(baseUrl).host : null;
  const supabaseUrlHost = supabaseUrl ? new URL(supabaseUrl).host : null;

  return NextResponse.json({
    environment: {
      baseUrl: baseUrl ? `${baseUrl.substring(0, 30)}...` : 'NOT SET',
      baseUrlHost,
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET',
      supabaseKey: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET',
      nodeEnv: process.env.NODE_ENV,
    },
    checks: {
      baseUrlSet: !!baseUrl,
      supabaseUrlSet: !!supabaseUrl,
      supabaseKeySet: !!supabaseKey,
      baseUrlHasProtocol: baseUrl ? baseUrl.startsWith('http://') || baseUrl.startsWith('https://') : false,
      baseUrlIsHttps: baseUrl ? baseUrl.startsWith('https://') : false,
    },
    expectedCallbackUrl: baseUrl ? `${baseUrl.trim()}/auth/callback` : 'CANNOT DETERMINE',
    timestamp: new Date().toISOString(),
  });
}

