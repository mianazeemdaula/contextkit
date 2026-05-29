import fs from "node:fs";
import path from "node:path";
import { Button } from "@/components/ui/Button";
import { importTemplate } from "../contexts/actions";

export const metadata = { title: "Templates — ContextKit" };

type Template = { slug: string; title: string; body: string };

/** Load bundled templates from the repo's /templates folder at build time. */
function loadTemplates(): Template[] {
  const candidates = [
    path.resolve(process.cwd(), "../../templates"),
    path.resolve(process.cwd(), "templates")
  ];
  for (const dir of candidates) {
    try {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
      return files.map((f) => {
        const body = fs.readFileSync(path.join(dir, f), "utf8");
        const slug = f.replace(/\.md$/, "");
        return { slug, title: slug.replace(/-/g, " "), body };
      });
    } catch {
      // try next
    }
  }
  // Fallback: three hardcoded templates so the page renders standalone.
  return [
    { slug: "developer", title: "developer", body: "# Developer context\n\n..." },
    { slug: "writer", title: "writer", body: "# Writer context\n\n..." },
    { slug: "marketer", title: "marketer", body: "# Marketer context\n\n..." }
  ];
}

/**
 * Templates gallery — reads from /templates/*.md at build time. Each card has
 * an "Add to my contexts" form that posts the template slug to the
 * `importTemplate` server action, which creates a new context for the
 * signed-in user and redirects to `/contexts/<id>`. Anonymous users get sent
 * to `/login?next=/templates` by the action.
 */
export default function TemplatesPage() {
  const templates = loadTemplates();

  /** Bound server action wrapper — needed because forms must call a function. */
  async function importAction(formData: FormData): Promise<void> {
    "use server";
    const slug = String(formData.get("slug") ?? "");
    if (!slug) throw new Error("Missing template slug");
    await importTemplate(slug);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-serif text-3xl font-bold text-gray-900">Templates</h1>
      <p className="mt-2 text-gray-700">
        Start from a community-built context. Copy, edit, make it yours.
      </p>
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <li
            key={t.slug}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold capitalize text-gray-900">{t.title}</h2>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
              {t.body.slice(0, 400)}
              {t.body.length > 400 ? "…" : ""}
            </pre>
            <form action={importAction} className="mt-4">
              <input type="hidden" name="slug" value={t.slug} />
              <Button type="submit">Add to my contexts</Button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
