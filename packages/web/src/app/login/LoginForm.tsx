"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { hasSupabase } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/browser";

/** Magic-link email form. Stubs when Supabase env vars are absent. */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    try {
      if (!hasSupabase()) {
        // Stub flow for dev without Supabase env.
        await new Promise((r) => setTimeout(r, 400));
        setStatus("sent");
        return;
      }
      const supabase = getBrowserSupabase();
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        // Magic-link callback handled by /auth/callback (exchangeCodeForSession).
        // See https://supabase.com/docs/guides/auth/server-side/email-based-auth-with-pkce-flow-for-ssr
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      });
      if (err) throw err;
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send link");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="rounded-xl border border-accent-200 bg-accent-50 p-4 text-accent-900">
        Check your inbox for a sign-in link.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={status === "sending"} className="w-full">
        {status === "sending" ? "Sending…" : "Send magic link"}
      </Button>
      {!hasSupabase() && (
        <p className="text-xs text-gray-500">
          Supabase env not configured — submit is stubbed.
        </p>
      )}
    </form>
  );
}
