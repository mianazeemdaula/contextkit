// Content-script router. Picks an adapter by hostname and answers
// CONTENT_INJECT messages from the background service worker.
//
// Also handles auto-prepend on page load when the user has enabled it
// (chrome.storage.local: { autoPrepend: true, defaultContext: "<slug>" }).
// Uses sessionStorage flag `__contextkit_prepended` so we inject at most
// once per page load — not on every focus/blur cycle.
//
// Storage choice: chrome.storage.local (10 MB) vs sync (~100 KB, 8 KB/item).
// Reference: https://developer.chrome.com/docs/extensions/reference/api/storage
// (verified 2026-05-28).

import type {
  ContentInjectRequest,
  ContentInjectResponse,
  GetContextResponse,
  InjectResult,
} from "../lib/messages.js";
import {
  findChatgptEditor,
  inject as chatgptInject,
} from "./adapters/chatgpt.js";
import {
  findClaudeEditor,
  inject as claudeInject,
} from "./adapters/claude.js";
import {
  findGeminiEditor,
  inject as geminiInject,
} from "./adapters/gemini.js";
import {
  findPerplexityEditor,
  inject as perplexityInject,
} from "./adapters/perplexity.js";
import {
  findEditor as findGenericEditor,
  editorIsEmpty,
  inject as genericInject,
} from "./adapters/generic.js";
import { waitForEditor } from "./lib/wait.js";

type Adapter = (text: string) => Promise<InjectResult>;
type Finder = () => HTMLElement | null;

const SESSION_FLAG = "__contextkit_prepended";

interface Tool {
  adapter: Adapter;
  finder: Finder;
}

function pickTool(hostname: string): Tool {
  if (hostname === "chatgpt.com" || hostname === "chat.openai.com") {
    return { adapter: chatgptInject, finder: findChatgptEditor };
  }
  if (hostname === "claude.ai" || hostname.endsWith(".claude.ai")) {
    return { adapter: claudeInject, finder: findClaudeEditor };
  }
  if (hostname === "gemini.google.com") {
    return { adapter: geminiInject, finder: findGeminiEditor };
  }
  if (hostname === "www.perplexity.ai" || hostname === "perplexity.ai") {
    return { adapter: perplexityInject, finder: findPerplexityEditor };
  }
  return { adapter: genericInject, finder: () => findGenericEditor() };
}

function isContentInjectRequest(v: unknown): v is ContentInjectRequest {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return o["type"] === "CONTENT_INJECT" && typeof o["text"] === "string";
}

const tool = pickTool(window.location.hostname);

chrome.runtime.onMessage.addListener(
  (
    rawMsg: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ContentInjectResponse) => void,
  ): boolean => {
    if (!isContentInjectRequest(rawMsg)) return false;
    void tool.adapter(rawMsg.text).then((result) => {
      sendResponse({ type: "CONTENT_INJECT_RESULT", result });
    });
    return true;
  },
);

interface AutoPrependSettings {
  autoPrepend?: boolean;
  defaultContext?: string | null;
}

async function maybeAutoPrepend(): Promise<void> {
  try {
    if (sessionStorage.getItem(SESSION_FLAG)) return;
  } catch {
    // sessionStorage can throw in some sandboxed iframes; skip silently.
    return;
  }
  const raw = (await chrome.storage.local.get([
    "autoPrepend",
    "defaultContext",
  ])) as AutoPrependSettings;
  if (!raw.autoPrepend) return;
  const slug = raw.defaultContext;
  if (typeof slug !== "string" || slug.length === 0) return;

  const editor = await waitForEditor(tool.finder, 8000);
  if (!editor) return;
  if (!editorIsEmpty(editor)) return;

  const ctx = await new Promise<GetContextResponse | null>((resolve) => {
    chrome.runtime.sendMessage(
      { type: "GET_CONTEXT", slug },
      (resp: GetContextResponse | undefined) => {
        if (chrome.runtime.lastError || !resp) {
          resolve(null);
          return;
        }
        resolve(resp);
      },
    );
  });
  if (!ctx || !ctx.context) return;

  // Re-check emptiness right before insert — the user may have started typing
  // while we were waiting on the IPC round-trip.
  if (!editorIsEmpty(editor)) return;
  try {
    sessionStorage.setItem(SESSION_FLAG, "1");
  } catch {
    /* ignore */
  }
  await tool.adapter(ctx.context.body);
}

void maybeAutoPrepend();
