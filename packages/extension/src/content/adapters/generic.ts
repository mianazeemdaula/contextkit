// Generic adapter: finds the visible textarea / contenteditable, focuses it,
// and inserts text at the caret. Used directly as the fallback and indirectly
// by each per-tool adapter at Phase 2.

import type { InjectResult } from "../../lib/messages.js";

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
}

export function findEditor(root: ParentNode = document): HTMLElement | null {
  // SELECTOR: brittle — update if tool's DOM changes (last verified: 2026-05-28)
  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>(
      'textarea, [contenteditable="true"], [contenteditable=""], [role="textbox"]',
    ),
  );
  const visible = candidates.filter(isVisible);
  if (visible.length === 0) return null;
  // Prefer the largest by area — usually the main composer.
  visible.sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    return br.width * br.height - ar.width * ar.height;
  });
  return visible[0] ?? null;
}

function insertIntoTextarea(el: HTMLTextAreaElement, text: string): void {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  const newVal = `${before}${text}${after}`;
  // React-controlled inputs need the native setter so the React state updates.
  const proto = Object.getPrototypeOf(el) as object;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) {
    setter.call(el, newVal);
  } else {
    el.value = newVal;
  }
  const caret = start + text.length;
  el.setSelectionRange(caret, caret);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function insertIntoContentEditable(el: HTMLElement, text: string): void {
  el.focus();
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    if (el.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      el.appendChild(document.createTextNode(text));
    }
  } else {
    el.appendChild(document.createTextNode(text));
  }
  el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text }));
}

export async function inject(text: string): Promise<InjectResult> {
  const editor = findEditor();
  if (!editor) {
    return { ok: false, reason: "no-editor-found" };
  }
  editor.focus();
  try {
    if (editor instanceof HTMLTextAreaElement) {
      insertIntoTextarea(editor, text);
    } else {
      insertIntoContentEditable(editor, text);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `insert-failed: ${String(err)}` };
  }
}
