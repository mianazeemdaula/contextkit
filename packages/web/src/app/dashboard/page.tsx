import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ContextList } from "@/components/app/ContextList";
import { EmptyState } from "@/components/app/EmptyState";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard — ContextKit" };

type ContextRow = { id: string; name: string; updated_at: string };

/** Server-rendered dashboard listing the user's contexts. */
export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  let contexts: ContextRow[] = [];
  let stubbed = false;

  if (!supabase) {
    stubbed = true;
  } else {
    try {
      const { data, error } = await supabase
        .from("contexts")
        .select("id, name, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      contexts = data ?? [];
    } catch {
      contexts = [];
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold text-gray-900">Your contexts</h1>
        <Link href="/contexts/new">
          <Button>New context</Button>
        </Link>
      </div>
      {stubbed && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Supabase env not configured — showing empty state. Set keys in <code>.env.local</code>.
        </p>
      )}
      <div className="mt-8">
        {contexts.length === 0 ? <EmptyState /> : <ContextList contexts={contexts} />}
      </div>
    </main>
  );
}
