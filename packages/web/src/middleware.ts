// Top-level middleware — refreshes Supabase auth cookies on every request.
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Next.js middleware entry. */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip Next internals, static files, and favicon
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
