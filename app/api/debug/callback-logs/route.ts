import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Debug endpoint to check what cookies are available
 * Visit /api/debug/callback-logs to see cookie information
 */
export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  const cookieInfo = allCookies.map(c => ({
    name: c.name,
    valueLength: c.value?.length || 0,
    hasValue: !!c.value,
    valuePreview: c.value?.substring(0, 50) || 'empty'
  }));
  
  const verifierCookie = allCookies.find(c => 
    c.name.includes('code_verifier') || 
    c.name.includes('verifier') ||
    (c.name.startsWith('sb-') && c.name.includes('code-verifier'))
  );
  
  return NextResponse.json({
    cookieCount: allCookies.length,
    cookies: cookieInfo,
    hasVerifier: !!verifierCookie,
    verifierCookie: verifierCookie ? {
      name: verifierCookie.name,
      valueLength: verifierCookie.value?.length || 0
    } : null,
    timestamp: new Date().toISOString()
  });
}

