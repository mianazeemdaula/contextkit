// Perplexity adapter.
// -----------------------------------------------------------------------------
// Last verified: 2026-05-28
// Source: https://www.perplexity.ai (live DOM inspection)
//
// Selectors (most specific first). Perplexity uses a plain <textarea> on the
// home page and inside threads, with placeholders that include "Ask" / "Follow up".
//
//   textarea[placeholder*="Ask" i]
//                                → home composer.
//   textarea[placeholder*="Follow" i]
//                                → in-thread follow-up composer.
//   textarea[autofocus]
//                                → home page focuses its main textarea on load.
//   main textarea
//                                → final broad fallback within the main pane.
//
// What to update if it breaks:
//   - If Perplexity migrates to a contenteditable Lexical/ProseMirror editor,
//     add the relevant `[contenteditable="true"]` selector(s) at the top.

import type { InjectResult } from "../../lib/messages.js";
import { inject as genericInject, findEditor } from "./generic.js";
import { firstVisible, waitForEditor } from "../lib/wait.js";

const CANDIDATES = [
  'textarea[placeholder*="Ask" i]',
  'textarea[placeholder*="Follow" i]',
  "textarea[autofocus]",
  "main textarea",
] as const;

export function findPerplexityEditor(): HTMLElement | null {
  return firstVisible(CANDIDATES) ?? findEditor();
}

export async function inject(text: string): Promise<InjectResult> {
  const editor =
    findPerplexityEditor() ??
    (await waitForEditor(findPerplexityEditor, 4000));
  if (editor) editor.focus();
  return genericInject(text);
}
