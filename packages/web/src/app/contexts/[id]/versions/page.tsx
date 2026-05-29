import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { restoreVersion } from "../../actions";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Version history — ContextKit" };

type Params = { params: Promise<{ id: string }> };

type VersionRow = {
  id: string;
  version: number;
  body: string;
  created_at: string;
};

/**
 * Version-history page for a single context. Lists every snapshot in
 * `context_versions` for the parent context with timestamp, version number,
 * a raw-markdown view, and a "Restore" form posting to a server action.
 */
export default async function VersionsPage({ params }: Params) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  let context: { id: string; name: string } | null = null;
  let versions: VersionRow[] = [];

  if (supabase) {
    const { data: ctx, error } = await supabase
      .from("contexts")
      .select("id, name")
      .eq("id", id)
      .single();
    if (error || !ctx) notFound();
    context = ctx;

    const { data: rows } = await supabase
      .from("context_versions")
      .select("id, version, body, created_at")
      .eq("context_id", id)
      .order("created_at", { ascending: false });
    versions = rows ?? [];
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/contexts/${id}`} className="text-sm text-accent-700 hover:underline">
        ← Back to editor
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-bold text-gray-900">
        Version history{context ? ` — ${context.name}` : ""}
      </h1>
      {!supabase && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Supabase env not configured — no snapshots to show.
        </p>
      )}
      {supabase && versions.length === 0 && (
        <p className="mt-6 text-sm text-gray-700">No snapshots yet. Save the context to create one.</p>
      )}
      <ul className="mt-8 space-y-4">
        {versions.map((v) => (
          <li
            key={v.id}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Version {v.version}</p>
                <p className="text-xs text-gray-500">
                  {new Date(v.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <details>
                  <summary className="cursor-pointer text-sm text-accent-700 hover:underline">
                    View
                  </summary>
                  <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-800">
                    {v.body}
                  </pre>
                </details>
                <form action={restoreVersion}>
                  <input type="hidden" name="contextId" value={id} />
                  <input type="hidden" name="versionId" value={v.id} />
                  <Button type="submit" variant="secondary">
                    Restore
                  </Button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
