const features = [
  {
    headline: "One-click paste into any chat",
    body: "Send your saved setup to ChatGPT, Claude, Gemini, or Perplexity without retyping a word."
  },
  {
    headline: "Guided form writes the prompt",
    body: "Answer plain-English questions and we shape the wording for you."
  },
  {
    headline: "Group prompts by project",
    body: "Keep a separate stack for each client, course, or launch so nothing gets mixed up."
  },
  {
    headline: "Sync across every device",
    body: "Start a prompt on your laptop and finish it on your phone the same minute."
  },
  {
    headline: "Undo any edit later",
    body: "Every change is saved, so you can roll back to last week's version in two clicks."
  },
  {
    headline: "Your words stay yours",
    body: "Prompts are encrypted, never sold, and never used to train any AI."
  }
];

/** 6 feature cards — copy from landing/COPY.md section 5. */
export function Features() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center font-serif text-3xl font-bold text-gray-900 md:text-4xl">
          Built for daily AI users
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.headline}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900">{f.headline}</h3>
              <p className="mt-2 text-gray-700">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
