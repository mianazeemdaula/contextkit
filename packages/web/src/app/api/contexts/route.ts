// Next 15 route handlers — https://nextjs.org/docs/app/api-reference/file-conventions/route-handlers
import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** GET /api/contexts — list the authenticated user's contexts. */
export async function GET() {
  try {
    const supabase = await getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }
    const { data, error } = await supabase
      .from("contexts")
      .select("id, name, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ contexts: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** POST /api/contexts — create a context. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }
    const body = (await request.json()) as { name?: string; body?: string };
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    const { data, error } = await supabase
      .from("contexts")
      .insert({ name: body.name, body: body.body ?? "", user_id: user.user.id })
      .select("id, name, updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ context: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
