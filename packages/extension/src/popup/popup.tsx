// Popup UI. Lists context profiles fetched via the background worker
// (which uses native messaging or the stub fallback). Clicking a context
// copies the body to the clipboard and attempts injection into the active
// tab. Shows a toast on success/failure.

import { useCallback, useEffect, useState } from "react";
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

function App(): JSX.Element {
  const [contexts, setContexts] = useState<ContextProfileSummary[]>([]);
  const [source, setSource] = useState<"native" | "stub" | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

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
        const resp = await sendMessage<ListContextsResponse>({
          type: "LIST_CONTEXTS",
        });
        setContexts(resp.contexts);
        setSource(resp.source);
      } catch (err) {
        showToast(`Load failed: ${String(err)}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

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
        {source && (
          <span className={`ck-source-pill ${source}`}>{source}</span>
        )}
      </div>
      {loading ? (
        <div className="ck-empty">Loading…</div>
      ) : contexts.length === 0 ? (
        <div className="ck-empty">No contexts yet.</div>
      ) : (
        <ul className="ck-list">
          {contexts.map((c) => (
            <li
              key={c.slug}
              className="ck-item"
              onClick={() => {
                void onPick(c.slug);
              }}
            >
              <span className="ck-item-title">{c.title}</span>
              <span className="ck-item-slug">{c.slug}</span>
            </li>
          ))}
        </ul>
      )}
      {toast && <div className={`ck-toast show`}>{toast.text}</div>}
    </>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
