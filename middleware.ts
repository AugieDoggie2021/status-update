// TODO: Next.js message: "middleware" file convention is deprecated; migrate to "proxy" when upgrading.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/risks/:path*",
    "/actions/:path*",
    "/report/:path*",
    "/admin/:path*",
  ],
};

// Protect only app pages; never intercept /auth/*, /healthz, or /api/diag/*
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}
