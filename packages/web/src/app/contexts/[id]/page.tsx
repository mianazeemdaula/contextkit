import { notFound } from "next/navigation";
import { ContextEditor } from "@/components/app/ContextEditor";
import { getServerSupabase } from "@/lib/supabase/server";
import { saveContext } from "../actions";

export const metadata = { title: "Edit context — ContextKit" };

type Params = { params: Promise<{ id: string }> };

/** View/edit a single context. */
export default async function ContextPage({ params }: Params) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  let initial = { id, name: "", body: "" };
  if (supabase) {
    const { data, error } = await supabase
      .from("contexts")
      .select("id, name, body")
      .eq("id", id)
      .single();
    if (error || !data) notFound();
    initial = { id: data.id, name: data.name, body: data.body ?? "" };
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-3xl font-bold text-gray-900">{initial.name || "Context"}</h1>
      <div className="mt-8">
        <ContextEditor initial={initial} onSave={saveContext} />
      </div>
    </main>
  );
}
