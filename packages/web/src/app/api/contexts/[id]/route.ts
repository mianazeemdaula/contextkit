// Per-context route handlers — https://nextjs.org/docs/app/api-reference/file-conventions/route-handlers
import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/** GET /api/contexts/[id] — read one context. */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }
    const { data, error } = await supabase
      .from("contexts")
      .select("id, name, body, updated_at")
      .eq("id", id)
      .single();
    if (error) throw error;
    return NextResponse.json({ context: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** PATCH /api/contexts/[id] — update a context. */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }
    const patch = (await request.json()) as { name?: string; body?: string };
    const { data, error } = await supabase
      .from("contexts")
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.body !== undefined ? { body: patch.body } : {}),
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("id, name, body, updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ context: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** DELETE /api/contexts/[id] — delete a context. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }
    const { error } = await supabase.from("contexts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
