import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "ContextKit — Save Once, Paste Into Any AI in One Click",
  description:
    "Stop re-explaining your role, project, and tone to every chat. Save your prompts once and paste them into ChatGPT, Claude, or Gemini in one click.",
  openGraph: {
    title: "Stop re-explaining yourself to every AI.",
    description:
      "Save your role, project, and tone once. Paste them into any chat in two seconds. Free to start."
  }
};

export const viewport: Viewport = { themeColor: "#ffffff" };

/** Root layout — wraps every page with html/body and a top nav. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white antialiased">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Link href="/" className="text-lg font-bold text-gray-900">
              ContextKit
            </Link>
            <div className="flex items-center gap-5 text-sm text-gray-700">
              <Link href="/pricing" className="hover:text-gray-900">
                Pricing
              </Link>
              <Link href="/templates" className="hover:text-gray-900">
                Templates
              </Link>
              <Link href="/docs" className="hover:text-gray-900">
                Docs
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-accent-600 px-3 py-1.5 text-white hover:bg-accent-700"
              >
                Log in
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
