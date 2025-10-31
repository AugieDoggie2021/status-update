import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // Cookie is set by Supabase on redirect; just bounce to dashboard
  return NextResponse.redirect(new URL("/dashboard", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
}
