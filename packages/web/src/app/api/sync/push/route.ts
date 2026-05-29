// POST /api/sync/push — CLI uploads local edits, with simple version-based
// conflict detection. Shape per docs/TECHNICAL_SPEC.md §10.
//
// For each incoming context: if no server row exists, insert. If server
// row's `version` <= incoming `version`, upsert (incoming wins). Otherwise
// mark as a conflict and skip the write. Returns `accepted` slugs and
// `conflicts` with reasons + serverVersion so the CLI can deep-link the
// user into `/contexts/<id>?conflict=1&serverVersion=N`.
import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

type IncomingContext = {
  id?: string;
  slug: string;
  name: string;
  body: string;
  version: number;
};

type PushBody = { contexts: IncomingContext[] };

/** POST /api/sync/push */
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

    const body = (await request.json()) as PushBody;
    if (!body?.contexts || !Array.isArray(body.contexts)) {
      return NextResponse.json({ error: "contexts array required" }, { status: 400 });
    }

    const accepted: string[] = [];
    const conflicts: Array<{ slug: string; reason: string; serverVersion: number }> = [];

    for (const incoming of body.contexts) {
      if (!incoming.slug) {
        conflicts.push({ slug: incoming.slug ?? "?", reason: "missing slug", serverVersion: 0 });
        continue;
      }

      const { data: existing } = await supabase
        .from("contexts")
        .select("id, version")
        .eq("user_id", user.user.id)
        .eq("slug", incoming.slug)
        .maybeSingle();

      if (!existing) {
        const { error: insErr } = await supabase.from("contexts").insert({
          user_id: user.user.id,
          slug: incoming.slug,
          name: incoming.name,
          body: incoming.body,
          version: Math.max(1, incoming.version | 0),
          updated_at: new Date().toISOString()
        });
        if (insErr) {
          conflicts.push({
            slug: incoming.slug,
            reason: `insert failed: ${insErr.message}`,
            serverVersion: 0
          });
          continue;
        }
        accepted.push(incoming.slug);
        continue;
      }

      if (existing.version > incoming.version) {
        conflicts.push({
          slug: incoming.slug,
          reason: "server is ahead",
          serverVersion: existing.version
        });
        continue;
      }

      const newVersion = Math.max(incoming.version, existing.version) + 1;
      const { error: updErr } = await supabase
        .from("contexts")
        .update({
          name: incoming.name,
          body: incoming.body,
          version: newVersion,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
      if (updErr) {
        conflicts.push({
          slug: incoming.slug,
          reason: `update failed: ${updErr.message}`,
          serverVersion: existing.version
        });
        continue;
      }

      try {
        await supabase.from("context_versions").insert({
          context_id: existing.id,
          body: incoming.body,
          version: newVersion,
          created_by: user.user.id
        });
      } catch {
        // best-effort
      }

      accepted.push(incoming.slug);
    }

    return NextResponse.json({ accepted, conflicts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
