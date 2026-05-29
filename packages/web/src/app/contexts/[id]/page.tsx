import Link from "next/link";
import { notFound } from "next/navigation";
import { ContextEditor } from "@/components/app/ContextEditor";
import { getServerSupabase } from "@/lib/supabase/server";
import { saveContext } from "../actions";

export const metadata = { title: "Edit context — ContextKit" };

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ conflict?: string; serverVersion?: string }>;
};

/**
 * View/edit a single context. When the URL carries `?conflict=1` we show a
 * banner — minimal MVP that the CLI can deep-link users into when a push
 * detects divergence. See `/api/sync/push`.
 */
export default async function ContextPage({ params, searchParams }: Params) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await getServerSupabase();

  let initial: { id: string; name: string; body: string; version?: number } = {
    id,
    name: "",
    body: ""
  };
  if (supabase) {
    const { data, error } = await supabase
      .from("contexts")
      .select("id, name, body, version")
      .eq("id", id)
      .single();
    if (error || !data) notFound();
    initial = { id: data.id, name: data.name, body: data.body ?? "", version: data.version };
  }

  const inConflict = sp.conflict === "1";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold text-gray-900">
          {initial.name || "Context"}
        </h1>
        <Link
          href={`/contexts/${id}/versions`}
          className="text-sm text-accent-700 hover:underline"
        >
          Version history →
        </Link>
      </div>
      {inConflict && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Conflict.</strong> The server version
          {sp.serverVersion ? ` (v${sp.serverVersion})` : ""} differs from your local copy.
          Showing the server-side view —{" "}
          <Link href={`/contexts/${id}/versions`} className="underline">
            view server history
          </Link>{" "}
          to merge manually.
        </div>
      )}
      <div className="mt-8">
        <ContextEditor initial={initial} onSave={saveContext} />
      </div>
    </main>
  );
}
