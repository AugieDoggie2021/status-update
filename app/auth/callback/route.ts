import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // Supabase handles the cookie on redirect automatically in the browser.
  // Just bounce to the dashboard.
  return NextResponse.redirect(new URL("/dashboard", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
}
