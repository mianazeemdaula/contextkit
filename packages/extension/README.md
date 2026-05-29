# @contextkit/extension

ContextKit's Chrome/Firefox MV3 browser extension. One-click inject your saved
context profiles into ChatGPT, Claude, Gemini, or Perplexity.

## Verified docs (Phase 2 — retrieved 2026-05-28)

The manifest, service worker, native messaging host, and Firefox compat were
validated against the live docs below on 2026-05-28:

- MV3 manifest keys — <https://developer.chrome.com/docs/extensions/reference/manifest>
- Native messaging — <https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging>
- Service worker pattern — <https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers>
- Commands API — <https://developer.chrome.com/docs/extensions/reference/api/commands>
- Storage API — <https://developer.chrome.com/docs/extensions/reference/api/storage>
- Firefox `browser_specific_settings` — <https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings>

Manifest reality-checks applied vs. the original spec:

- `background.service_worker` path is `background.js` (flat in `dist/`), not
  `dist/background.js`, because the built `manifest.json` is **copied into
  `dist/`** at build time and paths in a manifest are relative to its own
  location.
- Same fix for `content_scripts[].js` → `content.js` and icon paths → `icons/*.png`.
- `popup` html lives at `popup/index.html` inside `dist/` for the same reason.

## Build choice

Plain `tsc --noEmit` for type-checking + a tiny `scripts/build.mjs` that
bundles via `esbuild`. Chose this over `@crxjs/vite-plugin` because:

1. Zero plugin churn — esbuild is one direct dep.
2. Easier to reason about manifest path rewriting (we do it explicitly).
3. Smaller install footprint for an offline-first repo.

## Dev loop

```bash
cd packages/extension
pnpm install
pnpm typecheck
pnpm build          # → packages/extension/dist/
```

Then load unpacked:

1. Open `chrome://extensions` (or `about:debugging` in Firefox).
2. Enable **Developer mode**.
3. Click **Load unpacked** → select `packages/extension/dist/`.

The popup will list a stub array of context profiles until the native host is
installed.

## Native host install

The extension talks to your local `ck` CLI via a Chromium native messaging
host registered under the name `app.contextkit.bridge`.

Per Chrome's docs the manifest must live in OS-specific locations. The
provided scripts copy `native-host/host-manifest.json` (rewriting the absolute
`path` to `bridge.js`) into the right spot.

### macOS

```bash
cd packages/extension/native-host
./install-mac.sh
```

### Linux

```bash
cd packages/extension/native-host
./install-linux.sh
```

### Windows (PowerShell, run as the user, not admin, for HKCU install)

```powershell
cd packages\extension\native-host
.\install-windows.ps1
```

The Windows installer writes to
`HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\app.contextkit.bridge`.

## Quality notes

- TypeScript strict (`extends ../../tsconfig.base.json`), no `any`, no `@ts-ignore`.
- Message contract is a discriminated union in `src/lib/messages.ts`.
- Per-AI selectors live in `src/content/adapters/*.ts` and are tagged with
  `// SELECTOR: brittle — update if tool's DOM changes (last verified: 2026-05-28)`.
- Graceful fallback when the native host disconnects.

## Status

- ChatGPT, Claude, Gemini, Perplexity adapters: hardened with multi-candidate
  selector lists (most-specific first) plus a `MutationObserver`-backed
  `waitForEditor` for React-mounted composers. See per-adapter header comments
  for the verification date and update notes.
- Native host bridge: shells out to `ck list --json` / `ck get <slug>`. Assumes
  `ck` is on `PATH`.

## Keyboard shortcuts

| Shortcut                          | Action                                              |
| --------------------------------- | --------------------------------------------------- |
| `Ctrl+Shift+K` (`⌘⇧K` on macOS)   | Open the ContextKit popup (`_execute_action`).      |
| `Ctrl+Shift+I` (`⌘⇧I` on macOS)   | Inject the **default context** into the active tab. |

Shortcuts are declared in `manifest.json` under the `commands` key per the
[Chrome Commands API docs](https://developer.chrome.com/docs/extensions/reference/api/commands).
Users can override them at `chrome://extensions/shortcuts`. The
`inject-default` command requires that a default context be selected in the
popup settings (gear icon → **Default context** dropdown).

## Auto-prepend on new chat

Open the popup, click the **⚙** gear, and:

1. Pick a **Default context** from the dropdown.
2. Toggle **Auto-prepend default context on new chat** on.

The content script then checks `chrome.storage.local` on every supported AI
page load and, if the composer is empty, inserts the default context exactly
once per page (guarded by a `sessionStorage` flag `__contextkit_prepended`).
Settings persist via `chrome.storage.local` — 10 MB vs. `chrome.storage.sync`'s
~100 KB / 8 KB-per-item / 120 writes-per-minute caps, see the
[Storage API docs](https://developer.chrome.com/docs/extensions/reference/api/storage).

## DOM selectors

AI vendors ship UI changes weekly. Each per-tool adapter
(`src/content/adapters/*.ts`) carries:

- A `Last verified` date in the file header.
- The source URL.
- A `CANDIDATES` array of selectors, most-specific first.
- Notes on what to update if injection breaks.

When a tool's composer moves:

1. Open the AI tool in DevTools, focus the composer, run `$0.outerHTML`.
2. Pick the most stable selector (prefer `id`, then `data-testid`, then
   `[role]` / `[aria-*]`, then class).
3. Prepend it to the relevant adapter's `CANDIDATES` and bump the
   `Last verified` date.
4. The generic adapter (`adapters/generic.ts`) remains the last resort and
   should not need patching.

The `waitForEditor` helper in `src/content/lib/wait.ts` polls via
`MutationObserver` (up to 8 s) so the content script can race React mounting
without missing the editor.

## Icons

Real icons are generated on every build by `scripts/make-icons.mjs` — a
zero-dependency PNG encoder that emits a black rounded square with white "ck"
at 16/48/128 px. The build script runs it before bundling, so `dist/icons/`
always carries fresh artwork.
