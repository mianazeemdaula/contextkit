"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Create a team invite from the team page form. Returns nothing — caller
 * relies on a refreshed server-component list.
 */
export async function createInvite(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const email = String(formData.get("email") ?? "").toLowerCase();
  const role = (String(formData.get("role") ?? "member") as "admin" | "member") || "member";
  if (!teamId || !email) throw new Error("Missing teamId or email");

  const supabase = await getServerSupabase();
  if (!supabase) return;
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");

  const token = randomBytes(24).toString("base64url");
  const { error } = await supabase.from("team_invites").insert({
    team_id: teamId,
    email,
    role,
    token
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/teams/${teamId}`);
}

/**
 * Accept an invite by token. Inserts a `team_members` row and stamps
 * `accepted_at`. The RLS policy `team_invites_invitee_update` requires the
 * acting user's email to match the invite.
 */
export async function acceptInvite(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!token) throw new Error("Missing token");

  const supabase = await getServerSupabase();
  if (!supabase) redirect("/login");
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect(`/login?next=/invites/${token}`);

  const { data: invite, error } = await supabase
    .from("team_invites")
    .select("id, team_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .single();
  if (error || !invite) throw new Error("Invite not found");
  if (invite.accepted_at) throw new Error("Invite already accepted");
  if (new Date(invite.expires_at) < new Date()) throw new Error("Invite expired");

  const { error: memErr } = await supabase.from("team_members").insert({
    team_id: invite.team_id,
    user_id: user.user.id,
    role: invite.role
  });
  if (memErr && !/duplicate/i.test(memErr.message)) {
    throw new Error(memErr.message);
  }

  await supabase
    .from("team_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  redirect(`/teams/${invite.team_id}`);
}
