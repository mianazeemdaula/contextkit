import { getServerSupabase } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createInvite } from "../actions";

type Params = { params: Promise<{ id: string }> };

export const metadata = { title: "Team — ContextKit" };

type Member = { user_id: string; role: string };
type Invite = {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
};

/**
 * Team workspace page — shows the team name, members, pending invites, and
 * a form to invite a new email. Only owners/admins can read invites (RLS).
 */
export default async function TeamPage({ params }: Params) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  let teamName = id;
  let members: Member[] = [];
  let invites: Invite[] = [];
  let stubbed = false;
  let siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  if (!supabase) {
    stubbed = true;
  } else {
    const { data: team } = await supabase.from("teams").select("id, name").eq("id", id).single();
    if (team) teamName = team.name;
    const { data: m } = await supabase
      .from("team_members")
      .select("user_id, role")
      .eq("team_id", id);
    members = m ?? [];
    const { data: inv } = await supabase
      .from("team_invites")
      .select("id, email, role, token, expires_at")
      .eq("team_id", id)
      .is("accepted_at", null);
    invites = inv ?? [];
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-3xl font-bold text-gray-900">{teamName}</h1>
      {stubbed && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Supabase env not configured — placeholder view.
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Members ({members.length})</h2>
        <ul className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-mono text-gray-700">{m.user_id}</span>
              <span className="text-gray-500">{m.role}</span>
            </li>
          ))}
          {members.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-500">No members yet.</li>
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Invite someone</h2>
        <form action={createInvite} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input type="hidden" name="teamId" value={id} />
          <Input label="Email" name="email" type="email" required placeholder="teammate@example.com" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="invite-role">
              Role
            </label>
            <select
              id="invite-role"
              name="role"
              defaultValue="member"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit">Create invite</Button>
          </div>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Pending invites ({invites.length})</h2>
        <p className="mt-1 text-xs text-gray-500">
          Email sending isn&rsquo;t wired yet — copy the URL and send it manually.
        </p>
        <ul className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
          {invites.map((inv) => {
            const url = `${siteOrigin}/invites/${inv.token}`;
            return (
              <li key={inv.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{inv.email}</span>
                  <span className="text-xs text-gray-500">{inv.role}</span>
                </div>
                <code className="mt-1 block break-all text-xs text-gray-600">{url}</code>
              </li>
            );
          })}
          {invites.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-500">No pending invites.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
