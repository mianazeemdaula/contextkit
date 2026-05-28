import Link from "next/link";
import { Button } from "@/components/ui/Button";

/** Landing-page hero, copy verbatim from landing/COPY.md section 2. */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-accent-50 via-white to-white">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">
          For people who use AI every day
        </p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl font-bold leading-tight text-gray-900 md:text-6xl">
          Stop re-explaining yourself to every AI.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-gray-700 md:text-xl">
          Save your role, project, and tone once — then drop them into ChatGPT, Claude, Gemini, or
          Perplexity with one click.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/login">
            <Button>Start free — no card needed</Button>
          </Link>
          <Link href="#how-it-works">
            <Button variant="secondary">Watch a 60-second demo</Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Free forever for 5 saved prompts. Works in your browser.
        </p>
      </div>
    </section>
  );
}
