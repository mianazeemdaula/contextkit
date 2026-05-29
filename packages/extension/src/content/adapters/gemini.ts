// Gemini adapter.
// -----------------------------------------------------------------------------
// Last verified: 2026-05-28
// Source: https://gemini.google.com (live DOM inspection)
//
// Selectors (most specific first). Gemini wraps the composer in a custom
// `<rich-textarea>` web component containing a contenteditable.
//
//   rich-textarea div[contenteditable="true"]
//                                → primary; Gemini's web component composer.
//   div.ql-editor[contenteditable="true"]
//                                → legacy Quill-based editor still seen in some
//                                  experimental UIs.
//   [aria-label*="prompt" i][contenteditable="true"]
//                                → aria-based fallback if Google rebrands tags.
//   form [contenteditable="true"]
//                                → final broad fallback.
//
// What to update if it breaks:
//   - If `<rich-textarea>` is replaced by a different shadow-DOM component,
//     selectors that pierce shadow roots may be needed (querySelectorAll does
//     not cross open shadow boundaries — switch to manual recursion).

import type { InjectResult } from "../../lib/messages.js";
import { inject as genericInject, findEditor } from "./generic.js";
import { firstVisible, waitForEditor } from "../lib/wait.js";

const CANDIDATES = [
  'rich-textarea div[contenteditable="true"]',
  'div.ql-editor[contenteditable="true"]',
  '[aria-label*="prompt" i][contenteditable="true"]',
  'form [contenteditable="true"]',
] as const;

export function findGeminiEditor(): HTMLElement | null {
  return firstVisible(CANDIDATES) ?? findEditor();
}

export async function inject(text: string): Promise<InjectResult> {
  const editor =
    findGeminiEditor() ?? (await waitForEditor(findGeminiEditor, 4000));
  if (editor) editor.focus();
  return genericInject(text);
}
