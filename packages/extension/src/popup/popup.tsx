// Popup UI. Lists context profiles fetched via the background worker
// (which uses native messaging or the stub fallback). Clicking a context
// copies the body to the clipboard and attempts injection into the active
// tab. Shows a toast on success/failure.
//
// Settings panel (gear button) toggles auto-prepend on new chat and selects
// the default context (used by both auto-prepend AND the Ctrl+Shift+I
// keyboard shortcut). Persisted to chrome.storage.local under keys
// `autoPrepend` (boolean) and `defaultContext` (string | null).
// Storage rationale: chrome.storage.local (10 MB) vs. sync (~100 KB,
// 8 KB/item, 120 writes/minute). See:
//   https://developer.chrome.com/docs/extensions/reference/api/storage
//   (verified 2026-05-28).

import { useCallback, useEffect, useId, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  ContextProfileSummary,
  GetContextResponse,
  InjectResponse,
  ListContextsResponse,
} from "../lib/messages.js";

function sendMessage<TResp>(msg: unknown): Promise<TResp> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (resp: TResp) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(resp);
    });
  });
}

interface Toast {
  text: string;
  id: number;
}

interface Settings {
  autoPrepend: boolean;
  defaultContext: string | null;
}

async function loadSettings(): Promise<Settings> {
  const raw = (await chrome.storage.local.get([
    "autoPrepend",
    "defaultContext",
  ])) as { autoPrepend?: unknown; defaultContext?: unknown };
  return {
    autoPrepend: raw.autoPrepend === true,
    defaultContext:
      typeof raw.defaultContext === "string" ? raw.defaultContext : null,
  };
}

async function saveSettings(s: Settings): Promise<void> {
  await chrome.storage.local.set({
    autoPrepend: s.autoPrepend,
    defaultContext: s.defaultContext,
  });
}

function App(): JSX.Element {
  const [contexts, setContexts] = useState<ContextProfileSummary[]>([]);
  const [source, setSource] = useState<"native" | "stub" | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [settings, setSettings] = useState<Settings>({
    autoPrepend: false,
    defaultContext: null,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const autoPrependId = useId();
  const defaultContextId = useId();

  const showToast = useCallback((text: string) => {
    const id = Date.now();
    setToast({ text, id });
    setTimeout(() => {
      setToast((cur) => (cur && cur.id === id ? null : cur));
    }, 1800);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [resp, s] = await Promise.all([
          sendMessage<ListContextsResponse>({ type: "LIST_CONTEXTS" }),
          loadSettings(),
        ]);
        setContexts(resp.contexts);
        setSource(resp.source);
        setSettings(s);
      } catch (err) {
        showToast(`Load failed: ${String(err)}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((cur) => {
        const next = { ...cur, ...patch };
        void saveSettings(next).catch((err: unknown) => {
          showToast(`Save failed: ${String(err)}`);
        });
        return next;
      });
    },
    [showToast],
  );

  const onPick = useCallback(
    async (slug: string) => {
      try {
        const ctx = await sendMessage<GetContextResponse>({
          type: "GET_CONTEXT",
          slug,
        });
        if (!ctx.context) {
          showToast("Context not found");
          return;
        }
        try {
          await navigator.clipboard.writeText(ctx.context.body);
        } catch (err) {
          showToast(`Clipboard failed: ${String(err)}`);
        }
        const inj = await sendMessage<InjectResponse>({ type: "INJECT", slug });
        if (inj.result.ok) {
          showToast("Copied + injected");
        } else if (inj.result.reason === "no-content-script") {
          showToast("Copied (not an AI host)");
        } else {
          showToast(`Copied — inject: ${inj.result.reason}`);
        }
      } catch (err) {
        showToast(`Error: ${String(err)}`);
      }
    },
    [showToast],
  );

  return (
    <>
      <div className="ck-header">
        <div className="ck-title">ContextKit</div>
        <div className="ck-header-right">
          {source && (
            <span className={`ck-source-pill ${source}`}>{source}</span>
          )}
          <button
            type="button"
            className="ck-gear"
            aria-label={
              settingsOpen ? "Hide settings" : "Show settings"
            }
            aria-expanded={settingsOpen}
            aria-controls="ck-settings-panel"
            onClick={() => setSettingsOpen((v) => !v)}
          >
            {/* Inline gear glyph keeps the popup zero-asset. */}
            <span aria-hidden="true">⚙</span>
          </button>
        </div>
      </div>

      {settingsOpen && (
        <div
          id="ck-settings-panel"
          className="ck-settings"
          role="region"
          aria-label="ContextKit settings"
        >
          <div className="ck-setting-row">
            <label htmlFor={autoPrependId} className="ck-setting-label">
              Auto-prepend default context on new chat
            </label>
            <input
              id={autoPrependId}
              type="checkbox"
              checked={settings.autoPrepend}
              aria-describedby={`${autoPrependId}-hint`}
              onChange={(e) =>
                updateSettings({ autoPrepend: e.currentTarget.checked })
              }
            />
          </div>
          <div id={`${autoPrependId}-hint`} className="ck-setting-hint">
            Inserts the default context once per page load when the composer is
            empty.
          </div>
          <div className="ck-setting-row">
            <label
              htmlFor={defaultContextId}
              className="ck-setting-label"
            >
              Default context
            </label>
            <select
              id={defaultContextId}
              className="ck-select"
              value={settings.defaultContext ?? ""}
              onChange={(e) =>
                updateSettings({
                  defaultContext: e.currentTarget.value || null,
                })
              }
            >
              <option value="">— none —</option>
              {contexts.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="ck-setting-hint">
            Also used by the <kbd>Ctrl+Shift+I</kbd> (<kbd>⌘⇧I</kbd>) shortcut.
          </div>
        </div>
      )}

      {loading ? (
        <div className="ck-empty">Loading…</div>
      ) : contexts.length === 0 ? (
        <div className="ck-empty">No contexts yet.</div>
      ) : (
        <ul className="ck-list" role="list">
          {contexts.map((c) => (
            <li key={c.slug} className="ck-item">
              <button
                type="button"
                className="ck-item-btn"
                onClick={() => {
                  void onPick(c.slug);
                }}
                aria-label={`Inject context ${c.title}`}
              >
                <span className="ck-item-title">{c.title}</span>
                <span className="ck-item-slug">{c.slug}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {toast && (
        <div className="ck-toast show" role="status" aria-live="polite">
          {toast.text}
        </div>
      )}
    </>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
