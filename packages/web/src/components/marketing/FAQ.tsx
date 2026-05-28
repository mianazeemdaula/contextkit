"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Is it safe to save my prompts here?",
    a: "Yes. Your prompts are encrypted on our servers and only you can see them. You can delete any prompt, or your whole account, at any time."
  },
  {
    q: "Do I have to install anything?",
    a: "You add a small browser extension in about ten seconds. The web app works in any modern browser without a download."
  },
  {
    q: "Which AI tools does it work with?",
    a: "ChatGPT, Claude, Gemini, Perplexity, Poe, and most chat boxes on the web. If you can type in it, you can paste into it."
  },
  {
    q: "If I cancel, do I lose my saved prompts?",
    a: "No. You drop back to the Free plan and keep your first five prompts. The rest stay safe for 90 days in case you come back."
  },
  {
    q: "Is the free plan really free?",
    a: "Yes, forever. No card on signup. You only pay if you want more prompts or sync."
  },
  {
    q: "How is this different from ChatGPT custom instructions?",
    a: "Custom instructions only work inside ChatGPT, and you get one set. ContextKit gives you many named prompts that work in every AI tool you use."
  },
  {
    q: "Can my team share prompts?",
    a: "Yes. The Team plan gives you a shared library, so a new hire can sound on-brand on day one."
  },
  {
    q: "Will you train AI on my data?",
    a: "No. We never sell, share, or use your prompts to train any AI model. Ever."
  }
];

/** Accordion FAQ — copy from landing/COPY.md section 9. */
export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-serif text-3xl font-bold text-gray-900 md:text-4xl">
          Quick answers
        </h2>
        <div className="mt-10 divide-y divide-gray-200 rounded-2xl border border-gray-200">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="text-base font-semibold text-gray-900">{f.q}</span>
                  <span aria-hidden className="text-accent-600">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div id={`faq-${i}`} className="px-5 pb-5 text-gray-700">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
