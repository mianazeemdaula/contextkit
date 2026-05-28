// Content-script router. Picks an adapter by hostname and answers
// CONTENT_INJECT messages from the background service worker.

import type {
  ContentInjectRequest,
  ContentInjectResponse,
  InjectResult,
} from "../lib/messages.js";
import { inject as chatgptInject } from "./adapters/chatgpt.js";
import { inject as claudeInject } from "./adapters/claude.js";
import { inject as geminiInject } from "./adapters/gemini.js";
import { inject as perplexityInject } from "./adapters/perplexity.js";
import { inject as genericInject } from "./adapters/generic.js";

type Adapter = (text: string) => Promise<InjectResult>;

function pickAdapter(hostname: string): Adapter {
  if (hostname === "chatgpt.com" || hostname === "chat.openai.com") {
    return chatgptInject;
  }
  if (hostname === "claude.ai" || hostname.endsWith(".claude.ai")) {
    return claudeInject;
  }
  if (hostname === "gemini.google.com") {
    return geminiInject;
  }
  if (hostname === "www.perplexity.ai" || hostname === "perplexity.ai") {
    return perplexityInject;
  }
  return genericInject;
}

function isContentInjectRequest(v: unknown): v is ContentInjectRequest {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return o["type"] === "CONTENT_INJECT" && typeof o["text"] === "string";
}

chrome.runtime.onMessage.addListener(
  (
    rawMsg: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ContentInjectResponse) => void,
  ): boolean => {
    if (!isContentInjectRequest(rawMsg)) return false;
    const adapter = pickAdapter(window.location.hostname);
    void adapter(rawMsg.text).then((result) => {
      sendResponse({ type: "CONTENT_INJECT_RESULT", result });
    });
    return true;
  },
);
