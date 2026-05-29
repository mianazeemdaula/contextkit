import { Button } from "@/components/ui/Button";
import { getServerSupabase } from "@/lib/supabase/server";
import { acceptInvite } from "../../teams/actions";

type Params = { params: Promise<{ token: string }> };

export const metadata = { title: "Accept invite — ContextKit" };

/**
 * Accept-invite landing page. Requires the user to be signed in (the action
 * redirects to /login?next=… if not). On submit, inserts a team_members
 * row and redirects to the team page.
 */
export default async function InvitePage({ params }: Params) {
  const { token } = await params;
  const supabase = await getServerSupabase();

  let invite: { email: string; role: string; team_id: string } | null = null;
  let signedIn = false;
  if (supabase) {
    signedIn = Boolean((await supabase.auth.getUser()).data.user);
    const { data } = await supabase
      .from("team_invites")
      .select("email, role, team_id, accepted_at, expires_at")
      .eq("token", token)
      .maybeSingle();
    if (data && !data.accepted_at && new Date(data.expires_at) > new Date()) {
      invite = { email: data.email, role: data.role, team_id: data.team_id };
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="font-serif text-3xl font-bold text-gray-900">Team invite</h1>
      {!invite && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          This invite is invalid, expired, or already accepted.
        </p>
      )}
      {invite && !signedIn && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-gray-700">
            Sign in as <strong>{invite.email}</strong> to accept this invite.
          </p>
          <a href={`/login?next=/invites/${token}`}>
            <Button>Sign in</Button>
          </a>
        </div>
      )}
      {invite && signedIn && (
        <form action={acceptInvite} className="mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm text-gray-700">
            You&rsquo;ve been invited as a <strong>{invite.role}</strong>.
          </p>
          <Button type="submit">Accept invite</Button>
        </form>
      )}
    </main>
  );
}
