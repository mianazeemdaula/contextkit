// ContextKit MV3 service worker — message router.
//
// Verified live 2026-05-28 against:
//   - https://developer.chrome.com/docs/extensions/reference/manifest
//   - https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
//   - https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers
//
// Per the SW migration guide:
//   * event listeners must be registered at top level (not inside async callbacks)
//   * never trust module-level globals — SW is ephemeral; persist to chrome.storage
//   * no DOM access; use Offscreen API if ever needed
//   * use fetch (not XHR), Alarms (not setTimeout) for long-lived work
//
// Native messaging host name: "app.contextkit.bridge"

import {
  nativeGet,
  nativeList,
  nativePing,
  stubGet,
  stubList,
} from "./lib/nativeHost.js";
import type {
  ContentInjectRequest,
  ContentInjectResponse,
  RuntimeRequest,
  RuntimeResponse,
} from "./lib/messages.js";
import { getLocal, setLocal } from "./lib/storage.js";

const HEALTH_KEY = "nativeHostStatus";

type NativeStatus = "available" | "unavailable" | "unknown";

async function getCachedNativeStatus(): Promise<NativeStatus> {
  const v = await getLocal<NativeStatus>(HEALTH_KEY);
  return v ?? "unknown";
}

async function refreshNativeStatus(): Promise<NativeStatus> {
  const ok = await nativePing();
  const status: NativeStatus = ok ? "available" : "unavailable";
  await setLocal(HEALTH_KEY, status);
  await applyBadge(status);
  return status;
}

async function applyBadge(status: NativeStatus): Promise<void> {
  if (status === "available") {
    await chrome.action.setBadgeText({ text: "" });
  } else {
    await chrome.action.setBadgeText({ text: "?" });
    await chrome.action.setBadgeBackgroundColor({ color: "#cc8800" });
  }
}

// Top-level listener registration — required for SW startup correctness.
chrome.runtime.onInstalled.addListener(() => {
  void refreshNativeStatus();
});

chrome.runtime.onStartup.addListener(() => {
  void refreshNativeStatus();
});

chrome.runtime.onMessage.addListener(
  (
    rawMsg: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: RuntimeResponse) => void,
  ): boolean => {
    if (!isRuntimeRequest(rawMsg)) {
      return false;
    }
    void handle(rawMsg).then(sendResponse);
    return true; // keep the message channel open for async response
  },
);

function isRuntimeRequest(v: unknown): v is RuntimeRequest {
  if (typeof v !== "object" || v === null) return false;
  const t = (v as { type?: unknown }).type;
  return (
    t === "LIST_CONTEXTS" ||
    t === "GET_CONTEXT" ||
    t === "INJECT" ||
    t === "HEALTH"
  );
}

async function handle(msg: RuntimeRequest): Promise<RuntimeResponse> {
  switch (msg.type) {
    case "LIST_CONTEXTS": {
      const native = await nativeList();
      if (native !== null) {
        await setLocal<NativeStatus>(HEALTH_KEY, "available");
        await applyBadge("available");
        return { type: "LIST_CONTEXTS_RESULT", contexts: native, source: "native" };
      }
      await setLocal<NativeStatus>(HEALTH_KEY, "unavailable");
      await applyBadge("unavailable");
      return {
        type: "LIST_CONTEXTS_RESULT",
        contexts: stubList(),
        source: "stub",
      };
    }
    case "GET_CONTEXT": {
      const native = await nativeGet(msg.slug);
      if (native) {
        return { type: "GET_CONTEXT_RESULT", context: native, source: "native" };
      }
      return {
        type: "GET_CONTEXT_RESULT",
        context: stubGet(msg.slug),
        source: "stub",
      };
    }
    case "INJECT": {
      const ctxResp = await handle({ type: "GET_CONTEXT", slug: msg.slug });
      if (ctxResp.type !== "GET_CONTEXT_RESULT" || !ctxResp.context) {
        return {
          type: "INJECT_RESULT",
          result: { ok: false, reason: "context-not-found" },
        };
      }
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab || typeof tab.id !== "number") {
        return {
          type: "INJECT_RESULT",
          result: { ok: false, reason: "no-active-tab" },
        };
      }
      const forward: ContentInjectRequest = {
        type: "CONTENT_INJECT",
        text: ctxResp.context.body,
      };
      try {
        const reply = (await chrome.tabs.sendMessage(
          tab.id,
          forward,
        )) as ContentInjectResponse | undefined;
        if (!reply || reply.type !== "CONTENT_INJECT_RESULT") {
          return {
            type: "INJECT_RESULT",
            result: { ok: false, reason: "no-content-script" },
          };
        }
        return { type: "INJECT_RESULT", result: reply.result };
      } catch (err) {
        return {
          type: "INJECT_RESULT",
          result: { ok: false, reason: `tab-send-failed: ${String(err)}` },
        };
      }
    }
    case "HEALTH": {
      const cached = await getCachedNativeStatus();
      const status =
        cached === "unknown" ? await refreshNativeStatus() : cached;
      return {
        type: "HEALTH_RESULT",
        nativeHost: status === "available" ? "available" : "unavailable",
      };
    }
  }
}
