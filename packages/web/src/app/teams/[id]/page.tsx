type Params = { params: Promise<{ id: string }> };

export const metadata = { title: "Team — ContextKit" };

/** Placeholder team page. */
export default async function TeamPage({ params }: Params) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-3xl font-bold text-gray-900">Team</h1>
      <p className="mt-2 text-gray-700">Team workspace for {id} — coming soon.</p>
    </main>
  );
}
