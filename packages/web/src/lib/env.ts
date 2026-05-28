/**
 * Validated env access. Throws in production when required Supabase keys are
 * missing; returns undefined in development so marketing pages still render.
 */
type EnvSnapshot = {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  supabaseServiceRole: string | undefined;
  isProd: boolean;
};

/** Read and validate the runtime env once. */
export function readEnv(): EnvSnapshot {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;
  const isProd = process.env.NODE_ENV === "production";

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRole, isProd };
}

/** Returns true when Supabase is fully configured. */
export function hasSupabase(): boolean {
  const env = readEnv();
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** Throws a clear error if Supabase URL/anon key are not set. */
export function requireSupabasePublic(): { url: string; anonKey: string } {
  const env = readEnv();
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return { url: env.supabaseUrl, anonKey: env.supabaseAnonKey };
}
