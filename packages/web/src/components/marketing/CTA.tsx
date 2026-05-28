import Link from "next/link";
import { Button } from "@/components/ui/Button";

/** Final CTA — copy from landing/COPY.md section 10. */
export function CTA() {
  return (
    <section className="bg-accent-700 py-20 text-white">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-serif text-3xl font-bold md:text-4xl">Write it once. Reuse forever.</h2>
        <p className="mt-4 text-lg text-accent-100">
          Join thousands of writers, founders, and consultants who stopped retyping themselves.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/login">
            <Button variant="secondary">Start free — no card needed</Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-accent-200">
          5 saved prompts free. Upgrade only when you love it.
        </p>
      </div>
    </section>
  );
}
