// /auth/callback — Supabase magic-link / PKCE redirect target.
// Per https://supabase.com/docs/guides/auth/server-side/email-based-auth-with-pkce-flow-for-ssr
// (and the related OAuth PKCE guide
// https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow),
// the email link redirects here with a `?code=...` query param and the server
// exchanges it for a session cookie via supabase.auth.exchangeCodeForSession.
import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** GET /auth/callback?code=... — exchanges code → session cookie, then redirects. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    // Without Supabase env, just push the user to /dashboard — the dashboard
    // page already renders a "configure Supabase" notice.
    return NextResponse.redirect(new URL("/dashboard", url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=callback&reason=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
