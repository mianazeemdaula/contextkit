// Browser Supabase client for client components.
// https://supabase.com/docs/guides/auth/server-side/nextjs
"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublic } from "@/lib/env";

/** Build a singleton-ish browser Supabase client. */
export function getBrowserSupabase() {
  const { url, anonKey } = requireSupabasePublic();
  return createBrowserClient(url, anonKey);
}
