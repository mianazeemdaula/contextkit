import Link from "next/link";
import { Button } from "@/components/ui/Button";

/** Friendly empty state with a CTA to create a first context. */
export function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
      <h3 className="text-lg font-semibold text-gray-900">No contexts yet</h3>
      <p className="mt-2 text-gray-600">
        Save your first reusable prompt to drop into any AI in one click.
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/contexts/new">
          <Button>Create your first context</Button>
        </Link>
      </div>
    </div>
  );
}
