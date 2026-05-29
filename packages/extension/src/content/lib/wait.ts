// MutationObserver-based waiter for the chat composer element.
//
// Most modern AI tools mount their composer asynchronously via React/Svelte
// after document_idle, so the content script can race the editor. This helper
// polls for `predicate()` to return a non-null element, first synchronously
// then on every DOM mutation, until `timeoutMs` elapses.

export function waitForEditor(
  predicate: () => HTMLElement | null,
  timeoutMs = 8000,
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const immediate = predicate();
    if (immediate) {
      resolve(immediate);
      return;
    }
    let settled = false;
    const finish = (el: HTMLElement | null): void => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve(el);
    };
    const observer = new MutationObserver(() => {
      const found = predicate();
      if (found) finish(found);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["contenteditable", "role", "placeholder", "id"],
    });
    const timer = setTimeout(() => finish(null), timeoutMs);
  });
}

export function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
}

export function firstVisible(
  selectors: readonly string[],
  root: ParentNode = document,
): HTMLElement | null {
  for (const sel of selectors) {
    const matches = root.querySelectorAll<HTMLElement>(sel);
    for (const el of Array.from(matches)) {
      if (isVisible(el)) return el;
    }
  }
  return null;
}
