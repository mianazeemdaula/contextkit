// GET /api/cli/auth — mints a short-lived bearer token for the local CLI.
// The /cli/auth page in the browser POSTs here once the user is signed in,
// then redirects the user back to the CLI's local loopback callback.
// NB: this is a minimal stub — production would use a real session-binding
// or device-code flow. For now we hand the CLI the user's current Supabase
// access token (already short-lived; the CLI can refresh via Supabase).
import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** GET /api/cli/auth?callback=<loopback> → 302 to `<callback>?token=...` */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const callback = url.searchParams.get("callback");
  if (!callback) {
    return NextResponse.json({ error: "callback param required" }, { status: 400 });
  }
  // Only allow 127.0.0.1 / localhost loopback callbacks — the CLI binds an
  // ephemeral port and we never want to send tokens off-device.
  let cb: URL;
  try {
    cb = new URL(callback);
  } catch {
    return NextResponse.json({ error: "invalid callback URL" }, { status: 400 });
  }
  if (cb.hostname !== "127.0.0.1" && cb.hostname !== "localhost") {
    return NextResponse.json({ error: "callback must be loopback" }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) {
    // Send the user to /cli/auth so they can sign in, then come back here.
    return NextResponse.redirect(
      new URL(`/cli/auth?callback=${encodeURIComponent(callback)}`, url.origin)
    );
  }

  cb.searchParams.set("token", token);
  return NextResponse.redirect(cb.toString());
}
