// Wraps chrome.runtime.connectNative('app.contextkit.bridge').
// If the port disconnects with chrome.runtime.lastError we mark unavailable
// so the caller can fall back to the stub.
//
// Native messaging API cited in:
//   https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
//   (verified 2026-05-28)

import type { ContextProfile, ContextProfileSummary } from "./messages.js";

const HOST_NAME = "app.contextkit.bridge";
const REQUEST_TIMEOUT_MS = 1500;

type NativeRequest =
  | { id: string; method: "list" }
  | { id: string; method: "get"; slug: string };

type NativeResponse =
  | { id: string; ok: true; data: unknown }
  | { id: string; ok: false; error: string };

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function rpc(req: NativeRequest): Promise<NativeResponse> {
  return new Promise((resolve) => {
    let port: chrome.runtime.Port;
    try {
      port = chrome.runtime.connectNative(HOST_NAME);
    } catch (err) {
      resolve({ id: req.id, ok: false, error: String(err) });
      return;
    }

    const timer = setTimeout(() => {
      try {
        port.disconnect();
      } catch {
        /* ignore */
      }
      resolve({ id: req.id, ok: false, error: "timeout" });
    }, REQUEST_TIMEOUT_MS);

    port.onMessage.addListener((msg: unknown) => {
      clearTimeout(timer);
      if (isNativeResponse(msg)) {
        resolve(msg);
      } else {
        resolve({ id: req.id, ok: false, error: "malformed-response" });
      }
      try {
        port.disconnect();
      } catch {
        /* ignore */
      }
    });

    port.onDisconnect.addListener(() => {
      clearTimeout(timer);
      const lastError = chrome.runtime.lastError;
      resolve({
        id: req.id,
        ok: false,
        error: lastError?.message ?? "disconnected",
      });
    });

    try {
      port.postMessage(req);
    } catch (err) {
      clearTimeout(timer);
      resolve({ id: req.id, ok: false, error: String(err) });
    }
  });
}

function isNativeResponse(v: unknown): v is NativeResponse {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o["id"] === "string" && typeof o["ok"] === "boolean";
}

export async function nativePing(): Promise<boolean> {
  const res = await rpc({ id: newId(), method: "list" });
  return res.ok === true;
}

export async function nativeList(): Promise<ContextProfileSummary[] | null> {
  const res = await rpc({ id: newId(), method: "list" });
  if (!res.ok) return null;
  if (!Array.isArray(res.data)) return null;
  const out: ContextProfileSummary[] = [];
  for (const item of res.data) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    if (typeof o["slug"] !== "string" || typeof o["title"] !== "string") continue;
    const summary: ContextProfileSummary = { slug: o["slug"], title: o["title"] };
    if (typeof o["updatedAt"] === "string") summary.updatedAt = o["updatedAt"];
    out.push(summary);
  }
  return out;
}

export async function nativeGet(slug: string): Promise<ContextProfile | null> {
  const res = await rpc({ id: newId(), method: "get", slug });
  if (!res.ok) return null;
  if (typeof res.data !== "object" || res.data === null) return null;
  const o = res.data as Record<string, unknown>;
  if (
    typeof o["slug"] !== "string" ||
    typeof o["title"] !== "string" ||
    typeof o["body"] !== "string"
  ) {
    return null;
  }
  const p: ContextProfile = { slug: o["slug"], title: o["title"], body: o["body"] };
  if (typeof o["updatedAt"] === "string") p.updatedAt = o["updatedAt"];
  return p;
}

export const STUB_CONTEXTS: ContextProfile[] = [
  {
    slug: "work",
    title: "Work — Senior engineer at ContextKit",
    body:
      "I am a senior engineer working on ContextKit, an open-source tool for managing AI context across tools.\n\nPreferences:\n- Be concise and direct.\n- Prefer TypeScript and Rust.\n- Skip apologies and filler.",
  },
  {
    slug: "personal",
    title: "Personal — Writer / hobbyist",
    body:
      "Personal projects context. I journal in Markdown, write essays, and tinker with side projects.",
  },
  {
    slug: "project-x",
    title: "Project X — Stealth product",
    body:
      "Project X is a stealth product. Treat all responses as confidential. Audience: technical founders.",
  },
];

export function stubList(): ContextProfileSummary[] {
  return STUB_CONTEXTS.map((c) => ({ slug: c.slug, title: c.title }));
}

export function stubGet(slug: string): ContextProfile | null {
  return STUB_CONTEXTS.find((c) => c.slug === slug) ?? null;
}
