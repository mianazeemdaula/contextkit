/**
 * Validated env access. Throws in production when required Supabase keys are
 * missing; returns undefined in development so marketing pages still render.
 */
type EnvSnapshot = {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  supabaseServiceRole: string | undefined;
  siteUrl: string;
  stripeSecret: string | undefined;
  stripeWebhookSecret: string | undefined;
  stripePricePersonal: string | undefined;
  stripePriceTeam: string | undefined;
  isProd: boolean;
};

/** Read and validate the runtime env once. */
export function readEnv(): EnvSnapshot {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripePricePersonal = process.env.STRIPE_PRICE_PERSONAL;
  const stripePriceTeam = process.env.STRIPE_PRICE_TEAM;
  const isProd = process.env.NODE_ENV === "production";

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRole,
    siteUrl,
    stripeSecret,
    stripeWebhookSecret,
    stripePricePersonal,
    stripePriceTeam,
    isProd
  };
}

/** Returns true when Supabase is fully configured. */
export function hasSupabase(): boolean {
  const env = readEnv();
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** Returns true when Stripe is fully configured for checkout + webhooks. */
export function hasStripe(): boolean {
  const env = readEnv();
  return Boolean(env.stripeSecret && env.stripeWebhookSecret);
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
