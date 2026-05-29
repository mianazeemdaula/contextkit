"use client";

/**
 * ContextEditor — `@uiw/react-md-editor` powered Markdown editor with a
 * graceful textarea fallback if the package fails to load.
 *
 * Package: https://github.com/uiwjs/react-md-editor
 *   `import dynamic from "next/dynamic"` + `{ ssr: false }` is the
 *   recommended Next.js usage pattern from the upstream README.
 *
 * Preserves the existing server-action save contract:
 *   onSave({ id?, name, body }) => Promise<{ id }>
 */
import { Suspense, useState, useTransition, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type MDEditorComponent = ComponentType<{
  value?: string;
  onChange?: (value?: string) => void;
  height?: number;
  preview?: "edit" | "live" | "preview";
}>;

// Dynamic import so the heavy editor bundle is client-only. If the package
// is missing or throws, we fall back to a plain textarea via the loading
// state and a try/catch in the wrapper.
const MDEditor = dynamic<{
  value?: string;
  onChange?: (value?: string) => void;
  height?: number;
  preview?: "edit" | "live" | "preview";
}>(
  () =>
    import("@uiw/react-md-editor")
      .then((m) => m.default as unknown as MDEditorComponent)
      .catch(() => FallbackEditor),
  {
    ssr: false,
    loading: () => <FallbackEditor />
  }
);

type Props = {
  initial: { id?: string; name: string; body: string };
  /** Server action invoked on save. Must keep `{id?,name,body} => {id}` shape. */
  onSave: (input: { id?: string; name: string; body: string }) => Promise<{ id: string }>;
};

/**
 * Markdown context editor. Client component because it wraps a stateful
 * `@uiw/react-md-editor` instance and a `useTransition` save flow.
 */
export function ContextEditor({ initial, onSave }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [body, setBody] = useState(initial.body);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          try {
            const result = await onSave({ id: initial.id, name, body });
            router.push(`/contexts/${result.id}`);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
          }
        });
      }}
    >
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="e.g. Brand voice — Acme"
      />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Context (Markdown)</label>
        <div data-color-mode="light" className="rounded-lg border border-gray-300 bg-white">
          <Suspense fallback={<FallbackEditor value={body} onChange={(v) => setBody(v ?? "")} />}>
            <MDEditor
              value={body}
              onChange={(v) => setBody(v ?? "")}
              height={420}
              preview="edit"
            />
          </Suspense>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Plain-textarea fallback rendered when `@uiw/react-md-editor` cannot load
 * (e.g. dep missing during a partial install). Preserves the user's edits.
 */
function FallbackEditor({
  value,
  onChange
}: {
  value?: string;
  onChange?: (v?: string) => void;
}) {
  const [local, setLocal] = useState(value ?? "");
  return (
    <textarea
      rows={18}
      value={onChange ? value ?? "" : local}
      onChange={(e) => {
        if (onChange) onChange(e.target.value);
        else setLocal(e.target.value);
      }}
      className="w-full rounded-lg border-0 bg-white px-3 py-2 font-mono text-sm focus:outline-none"
      placeholder="# Who I am\n\n..."
    />
  );
}
