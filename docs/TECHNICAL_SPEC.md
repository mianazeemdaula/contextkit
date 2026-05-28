# ContextKit — Technical Specification

> Status: Draft v0.1 · Last updated 2026-05-28 · Owner: ContextKit core team

ContextKit is an open-source, AI-agnostic context-management layer that lets a user save their project, profile, and style-guide context **once** and inject it into ChatGPT, Claude, Gemini, Perplexity, Cursor, or any other AI tool with a single click. This document is the engineering source of truth: data model, storage layout, CLI surface, browser-extension architecture, web app, REST API, Supabase schema, sync protocol, security model, and release process.

The companion documents — [`README.md`](../README.md) for the elevator pitch and [`docs/PAIN_POINTS.md`](./PAIN_POINTS.md) for the validated user problem — set the *why*. This document covers the *how*.

---

## Table of contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data model](#3-data-model)
4. [Storage layer](#4-storage-layer)
5. [CLI](#5-cli)
6. [Browser extension](#6-browser-extension)
7. [Web app](#7-web-app)
8. [REST API](#8-rest-api)
9. [Supabase schema](#9-supabase-schema)
10. [Sync protocol](#10-sync-protocol)
11. [Security](#11-security)
12. [Performance budgets](#12-performance-budgets)
13. [Testing strategy](#13-testing-strategy)
14. [CI/CD](#14-cicd)
15. [Versioning and release](#15-versioning-and-release)
16. [Open questions](#16-open-questions)
17. [Verified references](#17-verified-references)

---

## 1. Overview

### Goals

- **One canonical place** for a user's recurring AI context — project briefs, persona, style guides, repo facts, system-prompt fragments.
- **AI-agnostic injection** — the same context profile drops cleanly into ChatGPT, Claude, Gemini, Perplexity, and Cursor without per-tool re-authoring.
- **Local-first, user-owned storage** — `~/.contextkit/` is plain Markdown the user can `git init` and back up themselves; no cloud account required.
- **Three surfaces, one engine** — CLI for developers, MV3 browser extension for the in-browser one-click, and a hosted Next.js web app for non-technical users and teams.
- **Optional cloud sync** — Supabase-backed pull/push for multi-device and team sharing; never required for single-user local workflows.
- **Open core** — MIT-licensed CLI, extension, and web app; paid features live behind a hosted offering, not behind code paywalls.

### Non-goals

- **Not a model wrapper.** ContextKit does not proxy LLM calls, A/B-test prompts at inference time, or run agents. It only manages, versions, and injects context strings.
- **Not a prompt observability platform.** PromptLayer and Langfuse occupy that lane; we do not record completions or token spend.
- **Not a vector database.** We may *export* chunked Markdown to be embedded by other tools, but we do not own retrieval.
- **Not a chat front-end.** Users keep using `chatgpt.com`, `claude.ai`, Cursor, etc. We layer on top.

### Target users

| Segment | Surface | Primary need |
| --- | --- | --- |
| Multi-tool indie developer | CLI + extension | Stop re-pasting stack + style rules across Cursor, Claude, ChatGPT |
| Technical founder / solo operator | CLI + web app | Same company brief into marketing, support, and product assistants |
| Non-technical knowledge worker (PM, lawyer, consultant) | Web app + extension | Visual library of "modes" with one-click inject — never opens a terminal |
| Small team adopting AI | Web app + extension + cloud sync | Shared baseline brief so every teammate's AI starts from the same place |

The validated problem statement, evidence, and competitive landscape live in [`docs/PAIN_POINTS.md`](./PAIN_POINTS.md). This spec assumes that case is made.

---

## 2. Architecture

ContextKit is a layered system. The **storage layer** (local Markdown + Git, optionally synced) is the source of truth. Every other surface — CLI, extension, web — is a view onto it.

```
                                  ┌────────────────────────────────────────┐
                                  │           User devices / browser       │
                                  └────────────────────────────────────────┘
                                                     │
        ┌────────────────────────┬───────────────────┼────────────────────────┐
        │                        │                   │                        │
   ┌────▼─────┐           ┌──────▼──────┐     ┌──────▼──────┐         ┌───────▼───────┐
   │   ck     │           │  MV3 ext.   │     │  Web app    │         │   3rd-party   │
   │  (CLI)   │           │  popup +    │     │  Next.js 15 │         │   AI tools    │
   │ Node 20  │           │  content    │     │  React 19   │         │ (ChatGPT,     │
   └────┬─────┘           │  scripts    │     └──────┬──────┘         │  Claude, …)   │
        │                 └──────┬──────┘            │                └───────▲───────┘
        │ fs                     │ native msg /      │ HTTPS                  │
        │                        │ HTTPS             │                        │
   ┌────▼─────────────┐   ┌──────▼──────────────┐    │       inject (DOM)     │
   │ ~/.contextkit/   │   │ NM bridge: ck nm-host│   │  ────────────────────► │
   │  contexts/*.md   │◄──┤ (spawned by browser) │   │                        │
   │  versions/*.json │   └─────────────────────┘    │                        │
   │  config.json     │                              │                        │
   └────┬─────────────┘                              │                        │
        │ git push (optional)                        │                        │
        │                                            │                        │
   ┌────▼────────────────────────────────────────────▼─────┐                  │
   │              ContextKit REST API (Hono on Edge)        │                  │
   │      /v1/contexts  /v1/versions  /v1/teams  /v1/search │                  │
   └─────────────────────────┬──────────────────────────────┘                  │
                             │                                                 │
                  ┌──────────▼───────────┐                                     │
                  │   Supabase Postgres  │  RLS-gated; auth via Supabase Auth  │
                  │   + Storage (blobs)  │                                     │
                  └──────────────────────┘                                     │
                                                                               │
                       (user clicks "Inject" in popup) ─────────────────────────┘
```

Data flow summary:

- **Save**: any surface writes a `Context` to local storage (CLI direct fs, extension via native-messaging bridge, web app via REST → Postgres).
- **Sync**: `ck pull` / `ck push` and the web app reconcile local files with Supabase, using a version-vector + last-write-wins protocol (§10).
- **Inject**: the extension's content script picks the context up from local storage (preferred) or cloud (fallback), then writes it into the active AI tool's input via a per-tool DOM adapter.

---

## 3. Data model

All types are defined in `packages/cli/src/types.ts` and re-exported from a shared `@contextkit/types` package (planned). They are the contract used by every surface and the wire format for the REST API.

```ts
// packages/cli/src/types.ts

export type ContextId = string;     // uuidv7 — sortable, k-ordered
export type VersionId = string;     // sha256:<hex> of normalized body
export type UserId = string;        // Supabase auth.users.id (uuid)
export type TeamId = string;        // uuid

export interface Context {
  id: ContextId;
  slug: string;                     // url-safe, unique per owner: "work", "project-x"
  title: string;                    // human label: "Work — Backend"
  body: string;                     // Markdown source of truth
  tags: string[];
  ownerId: UserId | "local";        // "local" when not signed in
  teamId?: TeamId;                  // set when shared via a Team
  visibility: "private" | "team" | "public";
  currentVersionId: VersionId;
  createdAt: string;                // ISO-8601 UTC
  updatedAt: string;
  encrypted: boolean;               // body stored AES-GCM ciphertext on disk
}

export interface ContextVersion {
  id: VersionId;                    // sha256 of body
  contextId: ContextId;
  body: string;                     // immutable snapshot
  bodyBytes: number;
  authorId: UserId | "local";
  message?: string;                 // commit-style note
  parentId?: VersionId;             // null for first version
  createdAt: string;
}

export interface Profile {
  // A user-curated bundle of contexts that get concatenated at inject time.
  id: string;
  name: string;                     // "Work / TS / Backend"
  contextIds: ContextId[];          // ordered; concatenated with --- separator
  defaultFor?: AiToolId[];          // auto-suggest in extension for these tools
  ownerId: UserId | "local";
}

export interface Snippet {
  // A reusable atomic block that can be referenced from a Context via {{snippet:id}}.
  id: string;
  name: string;
  body: string;
  ownerId: UserId | "local";
}

export interface Team {
  id: TeamId;
  name: string;
  ownerId: UserId;
  memberIds: UserId[];
  createdAt: string;
}

export interface User {
  id: UserId;
  email: string;
  displayName?: string;
  createdAt: string;
  plan: "free" | "pro" | "team";
}

export type AiToolId =
  | "chatgpt" | "claude" | "gemini" | "perplexity" | "cursor" | "copilot";

export interface InjectionEvent {
  // Local telemetry, never sent to server unless user opts in.
  id: string;                       // uuidv7
  contextId: ContextId;
  profileId?: string;
  tool: AiToolId;
  surface: "cli" | "extension" | "web";
  bytesInjected: number;
  occurredAt: string;
}
```

### JSON Schema for on-disk Context (frontmatter-stripped sidecar)

Stored as `~/.contextkit/contexts/<slug>.json` alongside the Markdown body. The Markdown file is the human-editable source; the JSON sidecar carries metadata that doesn't belong in YAML frontmatter (history, encryption flags, sync state).

```json
{
  "$schema": "https://contextkit.app/schema/context.v1.json",
  "type": "object",
  "required": ["id", "slug", "title", "currentVersionId", "createdAt", "updatedAt"],
  "additionalProperties": false,
  "properties": {
    "id":               { "type": "string", "format": "uuid" },
    "slug":             { "type": "string", "pattern": "^[a-z0-9][a-z0-9-]{0,63}$" },
    "title":            { "type": "string", "minLength": 1, "maxLength": 200 },
    "tags":             { "type": "array",  "items": { "type": "string" } },
    "ownerId":          { "type": "string" },
    "teamId":           { "type": "string", "format": "uuid" },
    "visibility":       { "enum": ["private", "team", "public"] },
    "currentVersionId": { "type": "string", "pattern": "^sha256:[0-9a-f]{64}$" },
    "createdAt":        { "type": "string", "format": "date-time" },
    "updatedAt":        { "type": "string", "format": "date-time" },
    "encrypted":        { "type": "boolean", "default": false },
    "sync": {
      "type": "object",
      "properties": {
        "remoteEtag":   { "type": "string" },
        "lastPulledAt": { "type": "string", "format": "date-time" },
        "lastPushedAt": { "type": "string", "format": "date-time" },
        "vector":       { "type": "object", "additionalProperties": { "type": "integer" } }
      }
    }
  }
}
```

---

## 4. Storage layer

### Disk layout

```
~/.contextkit/
├── config.json                 # singleton; user prefs, auth tokens (OS keychain preferred)
├── contexts/
│   ├── work.md                 # Markdown body — the human-editable file
│   ├── work.json               # JSON sidecar (Context metadata, sync state)
│   ├── project-x.md
│   ├── project-x.json
│   └── ...
├── versions/
│   ├── <contextId>/
│   │   ├── sha256-<hex>.json   # immutable ContextVersion snapshot
│   │   └── ...
├── profiles/
│   └── work-backend.json       # Profile (ordered list of context ids)
├── snippets/
│   └── signature.md
├── templates/                  # locally pinned community templates
└── .git/                       # optional; created by `ck init --git`
```

### Markdown + YAML frontmatter format

Each `contexts/<slug>.md` file is portable, human-readable Markdown with YAML frontmatter for the subset of metadata a user might reasonably edit by hand:

```markdown
---
slug: work-backend
title: "Work — Backend (Rails + Hotwire)"
tags: [work, rails, hotwire]
visibility: private
---

# Who I am

Senior backend engineer on a 5-person team migrating a Rails monolith to Hotwire.
We do **not** use TypeScript on the frontend. Never suggest Redux.

# How I want answers

Talk to me like a colleague, not a tutorial. Code blocks first, prose second.

# Stack facts

- Ruby 3.3, Rails 7.2, Postgres 16, Sidekiq 7
- Test stack: RSpec + Capybara + Playwright
- Deploy: Kamal to Hetzner
```

The Markdown body is the canonical content. The JSON sidecar carries the fields a user shouldn't hand-edit (ids, hashes, sync state).

### Git-backed versioning rationale

ContextKit uses Git — not a homegrown version log — for context history when the user opts in with `ck init --git`. Reasons:

1. **Free, battle-tested durability.** Every developer already trusts Git for their own source code.
2. **Trivially shareable.** `git remote add` to a private repo is a complete, free, self-hosted "cloud sync" alternative.
3. **Diff-friendly.** Markdown frontmatter + body produces clean line-level diffs; reviewing how a prompt evolved is `git log -p contexts/work.md`.
4. **Conflict tooling.** Three-way merge in any Git client beats anything we'd build in-house.

The non-Git path still produces immutable `ContextVersion` snapshots in `versions/<contextId>/sha256-<hex>.json`, so history exists either way; Git is the recommended upgrade.

### `config.json` schema (abridged)

```json
{
  "$schema": "https://contextkit.app/schema/config.v1.json",
  "version": 1,
  "userId": "local",
  "editor": "code --wait",
  "telemetry": { "enabled": false },
  "sync": {
    "enabled": false,
    "endpoint": "https://api.contextkit.app",
    "lastSyncedAt": null
  },
  "encryption": { "enabled": false, "keyRef": "keychain://contextkit/master-key" },
  "scrubbers": ["openai-key", "aws-key", "github-token", "private-key-block"]
}
```

Secrets (auth tokens, encryption keys) are stored in the OS keychain when available (`keytar` on Node), never plaintext in `config.json`.

---

## 5. CLI

The CLI is published to npm as `contextkit` and exposes a single binary named `ck`. Built with `commander` + `prompts` + `chalk`, bundled with `tsup` to a single ESM file. Cold start budget: <200 ms (see §12).

### Command reference

| Command | Flags | Purpose |
| --- | --- | --- |
| `ck init` | `--git`, `--dir <path>` | Create `~/.contextkit/`, optionally `git init` it. |
| `ck add <slug>` | `--from <file>`, `--template <name>`, `--stdin`, `--no-edit` | Create a new context; opens `$EDITOR` by default. |
| `ck list` | `--tag <t>`, `--json`, `--team`, `--remote` | List local (and optionally remote) contexts. |
| `ck get <slug>` | `--version <id>`, `--raw` | Print a context to stdout (raw Markdown, no frontmatter with `--raw`). |
| `ck edit <slug>` | `--editor <cmd>`, `--message <m>` | Open in `$EDITOR`; on save, snapshot a new `ContextVersion`. |
| `ck rm <slug>` | `--force`, `--purge-versions` | Delete a context (soft by default; `--purge-versions` removes history). |
| `ck copy <slug>` | `--profile <name>`, `--strip-frontmatter` | Copy body to the system clipboard. |
| `ck inject <slug>` | `--tool <chatgpt\|claude\|...>`, `--profile <name>`, `--format raw\|markdown\|json` | Print injection-ready payload to stdout (for piping into other CLIs). |
| `ck pull` | `--all`, `--force`, `--dry-run` | Fetch remote changes into `~/.contextkit/`. |
| `ck push` | `--message <m>`, `--dry-run` | Send local changes to the cloud. |
| `ck template <subcmd>` | `list`, `pull <name>`, `publish <slug>` | Manage community templates. |
| `ck login` | `--provider github\|google\|email`, `--token <t>` | Authenticate against `contextkit.app`. |
| `ck nm-host` | *(internal)* | Native-messaging entry point spawned by the browser extension. |

### Example session

```bash
$ ck init --git
✔ Created ~/.contextkit/
✔ Initialized empty Git repository in ~/.contextkit/.git/
ℹ Run `ck add <name>` to create your first context.

$ ck add work
# $EDITOR opens with a starter template; on save:
✔ Saved context "work" (1.2 KB)
✔ Snapshotted version sha256:9f3c…b14e
✔ Committed to git: "ck: add work"

$ ck list
SLUG          TITLE                                TAGS         UPDATED
work          Work — Backend (Rails + Hotwire)     work,rails   2026-05-28 14:02
project-x     Project X — public docs site         project-x    2026-05-27 10:11
writer        Writing voice & rules                writing      2026-05-20 09:30

$ ck copy work
✔ Copied "work" (1,243 chars) to clipboard.

$ ck inject project-x --tool claude | claude
# project-x body is piped into a Claude CLI session

$ ck push --message "Tighten work tone"
→ Uploading 1 changed context, 1 new version
✔ Synced to https://api.contextkit.app (etag: W/"9f3c…")
```

Exit codes follow the conventional shape: `0` success, `1` user error, `2` not-found, `3` auth, `4` conflict, `5` network.

---

## 6. Browser extension

A single codebase compiled for **Chrome (MV3)** and **Firefox (MV3 with `browser_specific_settings`)**, written in TypeScript with Vite + `@crxjs/vite-plugin`. The extension is the surface that most end-users will touch.

### Manifest (real MV3 syntax)

Per the official Chrome reference, `manifest_version`'s "only supported value is `3`" ([Chrome Extensions: Manifest reference](https://developer.chrome.com/docs/extensions/reference/manifest), retrieved 2026-05-28). Our manifest:

```jsonc
{
  "manifest_version": 3,
  "name": "ContextKit",
  "version": "0.1.0",
  "description": "One-click inject of your saved AI context into ChatGPT, Claude, Gemini, Perplexity.",
  "icons": { "16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png" },
  "action": {
    "default_title": "ContextKit",
    "default_popup": "popup/index.html",
    "default_icon":  { "16": "icons/16.png", "48": "icons/48.png" }
  },
  "background": { "service_worker": "background/index.js", "type": "module" },
  "content_scripts": [
    {
      "matches": [
        "https://chatgpt.com/*",
        "https://claude.ai/*",
        "https://gemini.google.com/*",
        "https://www.perplexity.ai/*"
      ],
      "js": ["content/index.js"],
      "run_at": "document_idle"
    }
  ],
  "permissions": ["storage", "clipboardWrite", "nativeMessaging", "activeTab"],
  "host_permissions": [
    "https://api.contextkit.app/*"
  ],
  "browser_specific_settings": {
    "gecko": { "id": "contextkit@contextkit.app", "strict_min_version": "115.0" }
  }
}
```

`host_permissions` are required to talk to the ContextKit API from the extension and are defined as "URL match patterns" per the manifest reference (retrieved 2026-05-28).

### Content-script DOM adapter pattern

Each supported AI tool has its own adapter that knows two things: how to find the prompt input element, and how to write text into it (most are `contenteditable` ProseMirror or Lexical instances, not plain `<textarea>`s).

```ts
// packages/extension/src/content/adapters/types.ts

export interface ToolAdapter {
  id: AiToolId;
  matches(url: URL): boolean;
  /** Returns the active prompt input element, or null if not on a chat surface. */
  findInput(): HTMLElement | null;
  /** Writes the given text into the input in a way the framework registers. */
  inject(el: HTMLElement, text: string): Promise<void>;
}

// packages/extension/src/content/adapters/chatgpt.ts
export const chatgpt: ToolAdapter = {
  id: "chatgpt",
  matches: (u) => u.hostname === "chatgpt.com",
  findInput: () => document.querySelector<HTMLElement>("#prompt-textarea"),
  async inject(el, text) {
    el.focus();
    document.execCommand("insertText", false, text); // ProseMirror-safe
  }
};
```

**Maintenance warning.** Selectors like `#prompt-textarea` are tied to the AI vendor's frontend code and break without notice. Adapters live in `packages/extension/src/content/adapters/<tool>.ts` and are versioned independently; a CI job runs Playwright smoke tests against each tool weekly (see §13). Expected adapter breakage rate based on prior art (`.cursorrules`, Greasemonkey scripts): ~1 break per tool per quarter.

### Popup UI flow

1. User clicks the toolbar icon → popup renders the list of contexts (local first; cloud if signed in).
2. User picks a context (or a saved Profile).
3. Popup posts `{ type: "INJECT", contextId }` to the service worker.
4. Service worker asks the active tab's content script to run the matching adapter.
5. Content script injects, posts back `{ ok: true, bytes: 1243 }`. Popup toasts "Injected 1.2 KB into ChatGPT".

### Native-messaging bridge to the local CLI

When the user has the CLI installed and the bridge is registered, the extension prefers local-first storage. Per the Chrome native-messaging docs, "the native messaging host manifest file must be valid JSON" and "the maximum size of a single message from the native messaging host is 1 MB" ([Native messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging), retrieved 2026-05-28). The docs further note that "`allowed-origins` values *can't* contain wildcards" (same source), so we list each extension origin explicitly.

Native host manifest installed by `ck init --browser-bridge`:

```json
{
  "name": "app.contextkit.bridge",
  "description": "ContextKit local bridge",
  "path": "/usr/local/bin/ck-nm-host",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://<contextkit-extension-id>/"
  ]
}
```

`ck-nm-host` is a thin Node script that the browser spawns; it speaks the length-prefixed JSON protocol that Chrome's native-messaging implementation defines and shells out to the same internal API the CLI uses. Messages are kept well under the 1 MB ceiling; large contexts are paginated.

### Cloud API fallback

If the native bridge isn't installed (typical for non-technical users), the extension falls back to the REST API (§8) using a JWT obtained via Supabase Auth (§9). Auth state is persisted in `chrome.storage.local`; tokens are refreshed silently in the service worker.

---

## 7. Web app

`packages/web` is a **Next.js 15** (App Router) application deployed on Vercel. The Next.js docs describe the App Router as the supported way to build Next.js apps and document "Mutating Data — Learn how to mutate data using Server Functions and Server Actions in Next.js" ([Next.js docs](https://nextjs.org/docs/app/getting-started), retrieved 2026-05-28).

### Stack

- Next.js 15, React 19, TypeScript 5.7
- Tailwind CSS 4, `shadcn/ui` for primitives
- `@supabase/ssr` for cookie-based auth
- `zod` for schema validation, shared with the CLI
- `drizzle-orm` for typed Postgres access from server actions

### Route map (App Router)

```
app/
├── (marketing)/
│   ├── page.tsx                       # /
│   └── pricing/page.tsx               # /pricing
├── (auth)/
│   ├── login/page.tsx                 # /login
│   └── callback/route.ts              # OAuth callback
├── (app)/
│   ├── dashboard/page.tsx             # /dashboard
│   ├── contexts/
│   │   ├── page.tsx                   # /contexts
│   │   └── [id]/
│   │       ├── page.tsx               # /contexts/[id]
│   │       ├── edit/page.tsx          # /contexts/[id]/edit
│   │       └── history/page.tsx       # /contexts/[id]/history
│   ├── teams/[id]/page.tsx            # /teams/[id]
│   ├── templates/page.tsx             # /templates
│   └── settings/page.tsx              # /settings
└── api/                               # API routes proxy to the Hono REST API
```

### Server Actions

Mutations use server actions, not client-side fetch, to keep auth cookies HTTP-only:

```ts
// app/(app)/contexts/[id]/edit/actions.ts
"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Input = z.object({ id: z.string().uuid(), title: z.string().min(1), body: z.string() });

export async function saveContext(formData: FormData) {
  const parsed = Input.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const { error } = await supabase.from("contexts")
    .update({ title: parsed.title, body: parsed.body, updated_at: new Date().toISOString() })
    .eq("id", parsed.id);
  if (error) throw error;
}
```

---

## 8. REST API

The hosted API lives at `https://api.contextkit.app`, built with Hono on Vercel Edge Functions. All endpoints return `application/json` and use cursor pagination (`?cursor=…&limit=…`). Auth is `Authorization: Bearer <jwt>` issued by Supabase Auth.

| Method | Path | Auth | Request body | Response |
| --- | --- | --- | --- | --- |
| `GET`    | `/v1/contexts` | user | — | `{ items: Context[], nextCursor?: string }` |
| `POST`   | `/v1/contexts` | user | `{ slug, title, body, tags?, visibility? }` | `Context` |
| `GET`    | `/v1/contexts/{id}` | user | — | `Context` |
| `PATCH`  | `/v1/contexts/{id}` | user | `Partial<Context>` + `If-Match: <etag>` | `Context` |
| `DELETE` | `/v1/contexts/{id}` | user | — | `204` |
| `GET`    | `/v1/contexts/{id}/versions` | user | — | `{ items: ContextVersion[] }` |
| `POST`   | `/v1/contexts/{id}/versions` | user | `{ body, message? }` | `ContextVersion` |
| `GET`    | `/v1/contexts/{id}/versions/{vid}` | user | — | `ContextVersion` |
| `POST`   | `/v1/contexts/{id}/share` | user | `{ teamId?, visibility }` | `Context` |
| `GET`    | `/v1/templates` | public | — | `{ items: Context[] }` |
| `POST`   | `/v1/templates/{id}/fork` | user | — | `Context` |
| `GET`    | `/v1/search?q=…` | user | — | `{ items: Context[] }` (Postgres FTS) |
| `POST`   | `/v1/sync/pull` | user | `{ since?: string, vector?: object }` | `{ changes: SyncChange[], vector }` |
| `POST`   | `/v1/sync/push` | user | `{ changes: SyncChange[], vector }` | `{ accepted, conflicts, vector }` |
| `POST`   | `/v1/auth/exchange` | none | `{ idToken }` | `{ jwt, refreshToken }` |

Error envelope:

```json
{ "error": { "code": "context.not_found", "message": "Context cf3… not found", "requestId": "req_01H…" } }
```

OpenAPI 3.1 spec is generated from the Hono route definitions at build time and published to `https://api.contextkit.app/openapi.json`.

---

## 9. Supabase schema

Per the Supabase Auth guide, Supabase supports "popular Auth methods, including password, magic link, one-time password (OTP), social login, and single sign-on (SSO)" and "uses JSON Web Tokens (JWTs) for authentication" ([Supabase Auth](https://supabase.com/docs/guides/auth), retrieved 2026-05-28). Authorization is enforced with Postgres Row Level Security.

### DDL

```sql
-- Profiles mirror auth.users with our app-specific fields
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  display_name text,
  plan        text not null default 'free' check (plan in ('free','pro','team')),
  created_at  timestamptz not null default now()
);

create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.team_members (
  team_id     uuid references public.teams(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner','admin','member')),
  primary key (team_id, user_id)
);

create table public.contexts (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null,
  title               text not null,
  body                text not null,
  tags                text[] not null default '{}',
  owner_id            uuid not null references public.profiles(id) on delete cascade,
  team_id             uuid references public.teams(id) on delete set null,
  visibility          text not null default 'private' check (visibility in ('private','team','public')),
  current_version_id  text not null,
  etag                text not null,
  encrypted           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (owner_id, slug)
);

create table public.context_versions (
  id          text primary key,                -- "sha256:<hex>"
  context_id  uuid not null references public.contexts(id) on delete cascade,
  body        text not null,
  body_bytes  integer not null,
  author_id   uuid not null references public.profiles(id),
  parent_id   text references public.context_versions(id),
  message     text,
  created_at  timestamptz not null default now()
);

create index contexts_owner_idx        on public.contexts(owner_id);
create index contexts_team_idx         on public.contexts(team_id) where team_id is not null;
create index context_versions_ctx_idx  on public.context_versions(context_id);
```

### RLS policies (syntax verified against live docs)

The Supabase RLS guide gives the canonical syntax: `alter table "table_name" enable row level security;` and policies of the shape `create policy "Individuals can view their own todos." on todos for select using ( (select auth.uid()) = user_id );` ([RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security), retrieved 2026-05-28). We follow that pattern exactly.

```sql
alter table public.contexts enable row level security;

create policy "Owners can read their own contexts"
  on public.contexts for select
  using ( (select auth.uid()) = owner_id );

create policy "Team members can read team contexts"
  on public.contexts for select
  using (
    visibility = 'team'
    and team_id in (
      select team_id from public.team_members where user_id = (select auth.uid())
    )
  );

create policy "Anyone can read public contexts"
  on public.contexts for select
  using ( visibility = 'public' );

create policy "Owners can insert their own contexts"
  on public.contexts for insert
  with check ( (select auth.uid()) = owner_id );

create policy "Owners can update their own contexts"
  on public.contexts for update
  using ( (select auth.uid()) = owner_id );

create policy "Owners can delete their own contexts"
  on public.contexts for delete
  using ( (select auth.uid()) = owner_id );

alter table public.context_versions enable row level security;

create policy "Read versions of readable contexts"
  on public.context_versions for select
  using (
    context_id in (select id from public.contexts) -- the SELECT policy on contexts gates this
  );
```

---

## 10. Sync protocol

Goals: eventual consistency across N devices, no central locks, offline-tolerant, no surprises.

### Identity

- `Context.id` and `ContextVersion.id` are stable across devices (content-addressed for versions, uuidv7 for contexts).
- Each device maintains a **version vector** `{ [deviceId]: monotonic_int }` per context, persisted in the JSON sidecar's `sync.vector`.

### Pull

```
POST /v1/sync/pull
{ "since": "2026-05-28T13:00:00Z", "vector": { "device-a": 17, "device-b": 4 } }
```

Server returns every change with a server-vector strictly greater than the client's per-device counters.

### Push

```
POST /v1/sync/push
{
  "changes": [
    { "kind": "context.update", "context": <Context>, "expectedEtag": "W/\"abc\"" },
    { "kind": "version.create", "version": <ContextVersion> }
  ],
  "vector": { "device-a": 18 }
}
```

### Conflict resolution

1. If `expectedEtag` matches server, change is accepted, server bumps the vector.
2. If etags differ:
   - **Body conflict** (both sides changed `body`): a new `ContextVersion` is created on the server with `message: "auto-merge"` and parent = the divergence point. The losing side's version is preserved as a sibling and surfaced in the UI as "conflict — review". Net effect: **no data loss**, last-write-wins on the *current* pointer but full history retained.
   - **Metadata-only conflict** (tags, title): three-way merge field by field; deterministic last-write-wins on individual scalar fields by `updated_at`.

### Offline queue

The CLI and extension persist pending pushes to `~/.contextkit/.sync-queue.jsonl` (or `chrome.storage.local` for the extension) and replay them on next connectivity. The queue is idempotent because every change carries a client-generated id.

---

## 11. Security

- **At-rest encryption (opt-in).** When `config.encryption.enabled = true`, context bodies are encrypted on disk with **AES-256-GCM**. The master key lives in the OS keychain (`keytar`); the on-disk format is `enc:v1:<nonce>:<ciphertext>:<tag>` base64-encoded. Frontmatter stays plaintext for searchability.
- **Secret scrubbing on save.** Before any `ContextVersion` is written, the body is run through a configurable scrubber regex list. Built-ins (always on):
  - OpenAI keys: `sk-[A-Za-z0-9]{20,}`
  - AWS access keys: `AKIA[0-9A-Z]{16}`
  - GitHub PATs: `gh[pousr]_[A-Za-z0-9]{36,}`
  - PEM private key blocks: `-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+PRIVATE KEY-----`
  Matches are replaced with `«REDACTED:<kind>»` and a warning is printed; users can `--allow-secrets` to bypass with a confirmation.
- **No plaintext keys to server.** When encryption is enabled, the server only ever sees ciphertext. Search on encrypted contexts is local-only.
- **Telemetry opt-in only.** `InjectionEvent`s live in local SQLite unless `telemetry.enabled = true`. The opt-in is a single `ck telemetry on` and is surfaced during `ck init`.
- **Auth.** Supabase JWTs, short-lived (1 h) access tokens, 30 d refresh tokens, rotation on use.
- **Signed extension updates.** Chrome Web Store and Mozilla Add-ons both sign update bundles. We additionally publish `sha256` checksums of every release on GitHub Releases so users can verify locally.
- **CSP.** The web app and extension popup ship a strict CSP: `default-src 'self'; script-src 'self'; connect-src 'self' https://api.contextkit.app https://*.supabase.co;` — no inline scripts, no eval.

---

## 12. Performance budgets

| Surface | Metric | Budget | Enforced by |
| --- | --- | --- | --- |
| CLI | cold start (`ck --version`) | **< 200 ms** on M1 / Ryzen 5 | benchmark in CI, fails build at >250 ms |
| CLI | `ck list` (100 contexts) | < 100 ms | benchmark |
| Extension | popup first paint | **< 100 ms** after icon click | Lighthouse-style Playwright probe |
| Extension | inject (DOM write) | **< 50 ms** after click | Playwright probe |
| Web app | LCP on `/dashboard` (cached) | < 1.5 s p75 | Vercel Web Vitals |
| REST API | p95 read latency | **< 300 ms** from US-East | Edge-region latency probe |
| Sync | full pull of 500 contexts | < 3 s | integration test |

---

## 13. Testing strategy

- **Unit + integration** — Vitest in every package (`packages/cli`, `packages/web`, `packages/extension`). Coverage target: 80 % lines on `packages/cli/src/core/**`.
- **Snapshot tests** for the Markdown↔Context round-trip (frontmatter parse, serialization, encryption).
- **Extension** — Playwright tests that load the unpacked extension into Chromium and Firefox, navigate to a local fixture mimicking each AI tool's prompt input, and assert the adapter writes the expected text. A nightly CI job runs the same tests against the live tools and opens an issue on failure (early-warning for selector drift).
- **Sync** — contract tests that spin up a real Supabase test instance, run the pull/push protocol with simulated conflicts, and assert convergence.
- **CLI** — `oclif`-style golden-output tests using `execa` against the built binary.
- **Security** — `trufflehog` runs on every PR; the secret-scrubber regex set has its own test fixtures.

---

## 14. CI/CD

GitHub Actions, one workflow file per concern.

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.12.0 }
      - uses: actions/setup-node@v4
        with: { node-version: '20.10', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

Additional workflows:

- `release-cli.yml` — on a tag matching `cli@*`, publishes `contextkit` to npm with provenance.
- `release-extension.yml` — packages and uploads to Chrome Web Store + AMO via their respective publish APIs.
- `release-web.yml` — Vercel auto-deploys on push to `main`; preview deploys on every PR.
- `selectors-watch.yml` — nightly Playwright run against live AI tools; opens an issue when an adapter breaks.

---

## 15. Versioning and release

- **Monorepo** managed with pnpm workspaces. The pnpm docs are explicit: "A workspace must have a `pnpm-workspace.yaml` file in its root" and "When this protocol is used, pnpm will refuse to resolve to anything other than a local workspace package" ([pnpm workspaces](https://pnpm.io/workspaces), retrieved 2026-05-28). Our `pnpm-workspace.yaml` is already the source of truth (`packages: ["packages/*"]`).
- **Changesets** for versioning. Every PR with a user-visible change must include a `.changeset/*.md` entry; `changeset version` bumps and `changeset publish` releases.
- **Semver** strictly. The CLI, extension, and web app version independently; only `@contextkit/types` and `@contextkit/schema` are tightly coupled (bumped together).
- **Node 20.10+** is the floor; the CLI's `engines.node` enforces it.
- **Internal deps** use the `workspace:^` protocol so consumers always pin to the local package during dev.

---

## 16. Open questions

1. **Encryption default.** Should at-rest encryption be on by default for all users (slower, key-loss risk) or opt-in (current plan, simpler)? Leaning opt-in but flagging for security review.
2. **Native messaging on Firefox.** Firefox supports native messaging but the install UX (per-app `.json` in a known directory) differs meaningfully from Chrome's. Do we ship the bridge on Firefox v1 or punt to v1.1?
3. **Templates governance.** Are public templates moderated pre-publish (slow, safe) or post-publish with takedown (fast, risky)? Likely post-publish with a report button + automated PII/secret scan, but unconfirmed.
4. **Search backend.** Postgres FTS is sufficient for v1, but the moment we support semantic search ("contexts that mention Hotwire") we need embeddings. Build on `pgvector` in the same Supabase project, or run a separate retrieval service?
5. **Conflict UX in the CLI.** The sync protocol preserves both sides as sibling versions, but the *prompt* the user sees when `ck pull` detects a conflict is undesigned. Inline diff? Open in `$EDITOR`? Defer to `ck conflicts resolve`?
6. **MCP server.** Several adjacent projects (Contexa, CoreMem) ship as MCP servers. Do we expose ContextKit as an MCP server in addition to the existing surfaces? Almost certainly yes, but not in v1.
7. **Cursor/Copilot adapters.** Cursor reads `.cursorrules` from a repo; Copilot Chat reads `.github/copilot-instructions.md`. We can `ck inject --tool cursor --write` to write these files, but the sync direction (do edits to the file flow *back* into ContextKit?) is undecided.

---

## 17. Verified references

Every URL below was fetched live on **2026-05-28** while writing this spec; quoted passages above are taken verbatim from these documents on that date.

| # | URL | Used in | Retrieved |
| - | --- | --- | --- |
| 1 | https://developer.chrome.com/docs/extensions/reference/manifest | §6 (MV3 manifest, `manifest_version: 3`, host_permissions semantics) | 2026-05-28 |
| 2 | https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging | §6 (native-messaging host manifest, 1 MB message ceiling, no-wildcard `allowed_origins`) | 2026-05-28 |
| 3 | https://supabase.com/docs/guides/auth | §9 (supported auth methods, JWT-based auth) | 2026-05-28 |
| 4 | https://supabase.com/docs/guides/database/postgres/row-level-security | §9 (`alter table … enable row level security;`, `create policy …` example) | 2026-05-28 |
| 5 | https://nextjs.org/docs/app/getting-started | §7 (App Router, Server Actions, Mutating Data) | 2026-05-28 |
| 6 | https://pnpm.io/workspaces | §15 (`pnpm-workspace.yaml` requirement, `workspace:` protocol semantics) | 2026-05-28 |

Quote provenance (verbatim, see §6/§7/§9/§15):

- "The only supported value is `3`." — Chrome Manifest reference (#1)
- "Lists the web pages your extension is allowed to interact with, defined using URL match patterns." — Chrome Manifest reference (#1)
- "The native messaging host manifest file must be valid JSON" — Chrome Native Messaging (#2)
- "The maximum size of a single message from the native messaging host is 1 MB" — Chrome Native Messaging (#2)
- "`allowed-origins` values *can't* contain wildcards." — Chrome Native Messaging (#2)
- "popular Auth methods, including password, magic link, one-time password (OTP), social login, and single sign-on (SSO)" — Supabase Auth (#3)
- "uses JSON Web Tokens (JWTs) for authentication" — Supabase Auth (#3)
- "alter table \"table_name\" enable row level security;" — Supabase RLS (#4)
- "create policy \"Individuals can view their own todos.\" on todos for select using ( (select auth.uid()) = user_id );" — Supabase RLS (#4)
- "Mutating Data — Learn how to mutate data using Server Functions and Server Actions in Next.js." — Next.js docs (#5)
- "A workspace must have a `pnpm-workspace.yaml` file in its root." — pnpm workspaces (#6)
- "When this protocol is used, pnpm will refuse to resolve to anything other than a local workspace package." — pnpm workspaces (#6)
