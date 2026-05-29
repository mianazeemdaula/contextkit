import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata = { title: "Connect the CLI — ContextKit" };

type Search = { searchParams: Promise<{ callback?: string }> };

/**
 * Browser page the CLI opens during `ck login`. The CLI binds a loopback
 * server (e.g. http://127.0.0.1:53111/cb) and passes its URL as `?callback=`.
 * The user signs in (or is already signed in), confirms, and we redirect
 * back to that callback with `?token=<jwt>` for the CLI to capture.
 */
export default async function CliAuthPage({ searchParams }: Search) {
  const sp = await searchParams;
  const callback = sp.callback ?? "";
  const supabase = await getServerSupabase();
  const signedIn = supabase ? Boolean((await supabase.auth.getUser()).data.user) : false;

  const grantHref = callback
    ? `/api/cli/auth?callback=${encodeURIComponent(callback)}`
    : "";

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="font-serif text-3xl font-bold text-gray-900">Connect the CLI</h1>
      <p className="mt-2 text-gray-700">
        The ContextKit CLI is asking for a short-lived token tied to your account.
      </p>

      {!callback && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Missing <code>?callback</code> parameter. Start the flow from <code>ck login</code>.
        </p>
      )}

      {callback && !signedIn && (
        <div className="mt-6 space-y-4">
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            You need to be signed in first.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/cli/auth?callback=${callback}`)}`}
          >
            <Button>Sign in</Button>
          </Link>
        </div>
      )}

      {callback && signedIn && (
        <form action={grantHref} method="get" className="mt-6 space-y-4">
          <input type="hidden" name="callback" value={callback} />
          <p className="text-sm text-gray-700">
            Grant access? The token will be sent only to <code>{callback}</code>.
          </p>
          <Button type="submit">Grant access</Button>
        </form>
      )}
    </main>
  );
}
