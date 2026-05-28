// ChatGPT adapter. Phase 2 stub: delegates to the generic adapter, which
// finds the visible composer (#prompt-textarea contenteditable on chatgpt.com).
// SELECTOR: brittle — update if tool's DOM changes (last verified: 2026-05-28)

import type { InjectResult } from "../../lib/messages.js";
import { inject as genericInject, findEditor } from "./generic.js";

export async function inject(text: string): Promise<InjectResult> {
  // SELECTOR: brittle — update if tool's DOM changes (last verified: 2026-05-28)
  const specific =
    document.querySelector<HTMLElement>("#prompt-textarea") ??
    findEditor();
  if (specific) {
    specific.focus();
  }
  return genericInject(text);
}
