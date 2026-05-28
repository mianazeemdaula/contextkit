const steps = [
  {
    title: "Write it once",
    body: "Answer a short guided form about your role, your project, and how you like to sound."
  },
  {
    title: "Save your prompts",
    body: "Your answers turn into clean, reusable cards you can name and edit any time."
  },
  {
    title: "Paste in one click",
    body: "Open any AI tool, click the ContextKit button, and your full setup lands in the chat."
  }
];

/** 3-step "how it works" — copy from landing/COPY.md section 4. */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center font-serif text-3xl font-bold text-gray-900 md:text-4xl">
          How it works
        </h2>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100 font-semibold text-accent-700">
                {i + 1}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-gray-700">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
