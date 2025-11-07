import { NextResponse } from "next/server";

export async function GET() {
  const present = !!process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const mode = present ? "openai" : "naive";
  return NextResponse.json({ present, mode, model }, { headers: { "Cache-Control": "no-store" }});
}

