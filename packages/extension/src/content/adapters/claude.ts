// Claude.ai adapter.
// -----------------------------------------------------------------------------
// Last verified: 2026-05-28
// Source: https://claude.ai (live DOM inspection)
//
// Selectors (most specific first). Claude's composer is a ProseMirror
// contenteditable. If selectors break, inspect the chat input and look for the
// `.ProseMirror` class or `[data-testid]` attributes Anthropic ships.
//
//   div[contenteditable="true"].ProseMirror
//                                 → primary, ProseMirror-rendered composer.
//   .ProseMirror[contenteditable="true"]
//                                 → variant ordering of the same selector.
//   [data-testid="chat-input"] [contenteditable="true"]
//                                 → defensive: if Anthropic adds a testid wrapper.
//   form [contenteditable="true"]
//                                 → broad fallback inside the chat form.
//
// What to update if it breaks:
//   - If `.ProseMirror` is renamed, add the new editor wrapper class first.
//   - Confirm the composer is the *visible* one — Claude sometimes mounts a
//     hidden detached editor; the visibility filter in firstVisible() handles it.

import type { InjectResult } from "../../lib/messages.js";
import { inject as genericInject, findEditor } from "./generic.js";
import { firstVisible, waitForEditor } from "../lib/wait.js";

const CANDIDATES = [
  'div[contenteditable="true"].ProseMirror',
  '.ProseMirror[contenteditable="true"]',
  '[data-testid="chat-input"] [contenteditable="true"]',
  'form [contenteditable="true"]',
] as const;

export function findClaudeEditor(): HTMLElement | null {
  return firstVisible(CANDIDATES) ?? findEditor();
}

export async function inject(text: string): Promise<InjectResult> {
  const editor =
    findClaudeEditor() ?? (await waitForEditor(findClaudeEditor, 4000));
  if (editor) editor.focus();
  return genericInject(text);
}
