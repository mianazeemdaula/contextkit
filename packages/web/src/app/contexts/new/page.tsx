import { ContextEditor } from "@/components/app/ContextEditor";
import { saveContext } from "../actions";

export const metadata = { title: "New context — ContextKit" };

/** Create a new context. */
export default function NewContextPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-3xl font-bold text-gray-900">New context</h1>
      <p className="mt-2 text-gray-700">Give it a clear name, then write your reusable prompt.</p>
      <div className="mt-8">
        <ContextEditor initial={{ name: "", body: "" }} onSave={saveContext} />
      </div>
    </main>
  );
}
