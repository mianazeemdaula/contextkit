import Link from "next/link";

const columns: Array<{ title: string; items: string[] }> = [
  {
    title: "Product",
    items: ["How it works", "Features", "Pricing", "Browser extension", "Changelog"]
  },
  {
    title: "Resources",
    items: ["Prompt templates", "Help center", "Blog", "Video tutorials", "Community"]
  },
  {
    title: "Company",
    items: ["About", "Customers", "Careers", "Press kit", "Contact"]
  },
  {
    title: "Legal",
    items: ["Privacy", "Terms", "Security", "Cookie settings", "DPA"]
  }
];

/** Site footer — copy from landing/COPY.md section 11. */
export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-1">
            <Link href="/" className="text-xl font-bold text-white">
              ContextKit
            </Link>
            <p className="mt-3 text-sm text-gray-400">
              One short email a month with new prompt ideas. No spam, ever.
            </p>
            <form className="mt-4 flex gap-2">
              <label htmlFor="footer-newsletter" className="sr-only">
                Email address
              </label>
              <input
                id="footer-newsletter"
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-accent-600 px-3 py-2 text-sm font-medium text-white hover:bg-accent-700"
              >
                Send me ideas
              </button>
            </form>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2 text-sm">
                {col.items.map((item) => (
                  <li key={item}>
                    <a href="#" className="hover:text-white">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-10 border-t border-gray-800 pt-6 text-xs text-gray-500">
          © 2026 ContextKit, Inc. Made for people who use AI every day.
        </p>
      </div>
    </footer>
  );
}
