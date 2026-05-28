"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Props = {
  initial: { id?: string; name: string; body: string };
  /** Server action invoked on save. */
  onSave: (input: { id?: string; name: string; body: string }) => Promise<{ id: string }>;
};

/** Textarea-based markdown editor with name field and Save button. TODO: replace with proper editor. */
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
        <label htmlFor="ctx-body" className="text-sm font-medium text-gray-700">
          Context (Markdown)
        </label>
        <textarea
          id="ctx-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={20}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          placeholder="# Who I am\n\n..."
        />
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
