// Session-refresh helper invoked from src/middleware.ts.
// Pattern from https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabase, requireSupabasePublic } from "@/lib/env";

/**
 * Refresh the Supabase auth cookie so server components see a valid session.
 * No-ops when env vars are missing.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  if (!hasSupabase()) return response;
  const { url, anonKey } = requireSupabasePublic();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      }
    }
  });

  // Touch the session — refreshes when near expiry.
  await supabase.auth.getUser();
  return response;
}
