// Supabase server client for RSC + route handlers.
// Pattern from https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabasePublic, hasSupabase } from "@/lib/env";

/**
 * Build a Supabase server client bound to the current request's cookies.
 * Returns null when env vars are missing so caller pages can render in dev.
 */
export async function getServerSupabase() {
  if (!hasSupabase()) return null;
  const { url, anonKey } = requireSupabasePublic();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll called from a Server Component — safe to ignore when
          // middleware refreshes the session.
        }
      }
    }
  });
}
