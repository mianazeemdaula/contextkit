// ChatGPT adapter.
// -----------------------------------------------------------------------------
// Last verified: 2026-05-28
// Source: https://chatgpt.com (live DOM inspection)
//
// Selectors (most specific first). If injection breaks, open ChatGPT in DevTools,
// click the composer, and run `$0.outerHTML` — pick the most stable id/role/class
// and prepend it here. The generic fallback in ./generic catches the rest.
//
//   #prompt-textarea               → stable id used since 2023; primary composer
//                                    (contenteditable div on chatgpt.com).
//   div[contenteditable="true"]#prompt-textarea
//                                  → same as above, more selective in case of dupes.
//   form [contenteditable="true"]  → composer is always inside the submit <form>.
//   main [contenteditable="true"]  → narrowed to main pane to avoid sidebar inputs.
//
// What to update if it breaks:
//   - If OpenAI renames `#prompt-textarea`, capture the new selector with DevTools
//     and add it to the top of CANDIDATES.
//   - If the composer moves into a <textarea>, the generic adapter still handles it.

import type { InjectResult } from "../../lib/messages.js";
import { inject as genericInject, findEditor } from "./generic.js";
import { firstVisible, waitForEditor } from "../lib/wait.js";

const CANDIDATES = [
  "#prompt-textarea",
  'div[contenteditable="true"]#prompt-textarea',
  'form [contenteditable="true"]',
  'main [contenteditable="true"]',
] as const;

export function findChatgptEditor(): HTMLElement | null {
  return firstVisible(CANDIDATES) ?? findEditor();
}

export async function inject(text: string): Promise<InjectResult> {
  const editor =
    findChatgptEditor() ?? (await waitForEditor(findChatgptEditor, 4000));
  if (editor) editor.focus();
  return genericInject(text);
}
