const pains = [
  "I paste the same three paragraphs about my company into every new chat.",
  "My best prompt is buried somewhere in a Google Doc — or was it Notion?",
  "Every AI tool I try forgets who I am the moment I open a new tab."
];

/** Pain agitation section — copy from landing/COPY.md section 3. */
export function Pain() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="font-serif text-3xl font-bold text-gray-900 md:text-4xl">Sound familiar?</h2>
        <ul className="mt-8 space-y-4">
          {pains.map((line) => (
            <li
              key={line}
              className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-lg text-gray-800"
            >
              &ldquo;{line}&rdquo;
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xl font-medium text-accent-700">
          You are not bad at AI. You are missing a place to keep what you already know.
        </p>
      </div>
    </section>
  );
}
