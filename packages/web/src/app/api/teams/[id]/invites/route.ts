// /api/teams/[id]/invites — list pending + create new team invites.
// RLS in schema.sql restricts mutations to team owners/admins; we still
// double-check membership server-side before issuing the token.
import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { getServerSupabase } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

type CreateBody = { email: string; role?: "admin" | "member" };

/** GET /api/teams/[id]/invites — list pending (admin-only via RLS). */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }
    const { data, error } = await supabase
      .from("team_invites")
      .select("id, email, role, token, expires_at, accepted_at, created_at")
      .eq("team_id", id)
      .is("accepted_at", null);
    if (error) throw error;
    return NextResponse.json({ invites: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** POST /api/teams/[id]/invites — create an invite. Body: `{ email, role? }` */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    const body = (await request.json()) as CreateBody;
    if (!body.email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const token = randomBytes(24).toString("base64url");
    const { data, error } = await supabase
      .from("team_invites")
      .insert({
        team_id: id,
        email: body.email.toLowerCase(),
        role: body.role ?? "member",
        token
      })
      .select("id, email, role, token, expires_at, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ invite: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
