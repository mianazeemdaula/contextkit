import Link from "next/link";

type ContextRow = { id: string; name: string; updated_at: string };

type Props = { contexts: ContextRow[] };

/** Renders a clickable list of the user's saved contexts. */
export function ContextList({ contexts }: Props) {
  return (
    <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
      {contexts.map((c) => (
        <li key={c.id}>
          <Link
            href={`/contexts/${c.id}`}
            className="flex items-center justify-between p-5 hover:bg-gray-50"
          >
            <span className="font-medium text-gray-900">{c.name}</span>
            <span className="text-xs text-gray-500">
              {new Date(c.updated_at).toLocaleDateString()}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
