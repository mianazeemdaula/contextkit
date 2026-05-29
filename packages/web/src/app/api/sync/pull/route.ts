// POST /api/sync/pull — CLI fetches the user's contexts updated since a timestamp.
// Shape matches docs/TECHNICAL_SPEC.md §10 (simplified for the v1 web app).
import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

type PullBody = { since?: string };

/** POST /api/sync/pull — returns `{ contexts: [...] }` for the auth'd user. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    let body: PullBody = {};
    try {
      body = (await request.json()) as PullBody;
    } catch {
      // empty body allowed → full pull
    }

    let query = supabase
      .from("contexts")
      .select("id, slug, name, body, version, updated_at, created_at")
      .eq("user_id", user.user.id)
      .order("updated_at", { ascending: false });

    if (body.since) {
      query = query.gt("updated_at", body.since);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      contexts: (data ?? []).map((c) => ({
        id: c.id,
        slug: c.slug ?? c.id,
        name: c.name,
        body: c.body,
        version: c.version,
        updatedAt: c.updated_at,
        createdAt: c.created_at
      })),
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
