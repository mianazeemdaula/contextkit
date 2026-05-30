<div align="center">

# ContextKit

### Context, on tap — for every AI you use.

[![npm version](https://img.shields.io/npm/v/%40mianazeemdaula%2Fcontextkit?color=cb3837&logo=npm)](https://www.npmjs.com/package/%40mianazeemdaula%2Fcontextkit)
[![Build](https://img.shields.io/github/actions/workflow/status/mianazeemdaula/contextkit/ci.yml?branch=main)](https://github.com/mianazeemdaula/contextkit/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/mianazeemdaula/contextkit?style=social)](https://github.com/mianazeemdaula/contextkit/stargazers)
[![Discord](https://img.shields.io/discord/000000000000000000?label=discord&logo=discord&color=5865F2)](https://discord.gg/contextkit)

Save your project, profile, and style-guide context **once**, then inject it into ChatGPT, Claude, Gemini, Perplexity, Cursor — or any AI tool — with a single click. ContextKit is open-source, AI-agnostic, and runs from a CLI, a browser extension, or a hosted web app.

<!-- TODO: replace with demo.gif -->

[**Get Started**](./docs/getting-started.md) · [**Docs**](./docs) · [**Web app**](https://contextkit.app) *(domain coming soon)*

</div>

---

## The problem

Every AI power user re-explains who they are, what they're building, and how they like to work — over and over, in every new chat, across a dozen tools. Context lives scattered across Notion pages, Google Docs, sticky notes, and screenshots, and nothing carries it from one model to the next. The result: hours wasted, inconsistent output, and AI that never quite remembers you.

## What ContextKit gives you

- **Context profiles** — save named contexts (Work, Personal, Project X) with full Markdown support.
- **One-click inject** — the browser extension drops the right context into any AI chat instantly.
- **Version history** — Git-backed versioning so you can see how your prompts evolved.
- **Team sharing** — share profiles across a team so everyone starts from the same baseline.
- **API + CLI** — pipe contexts into any workflow: `ck inject my-project | claude`.
- **Public templates** — community-built starters for developers, writers, marketers, and more.

## Quick start

Install the CLI globally or use it on demand:

```bash
npm install -g @mianazeemdaula/contextkit
# or
npx @mianazeemdaula/contextkit
```

Initialize your local store, add your first context, and copy it into any AI:

```bash
ck init                 # creates ~/.contextkit/
ck add work             # opens $EDITOR for a new "work" context
ck list                 # show all saved contexts
ck copy work            # context is now on your clipboard — paste into any AI
ck inject project-x | claude   # or pipe directly into a CLI
```

Then install the browser extension for one-click injection:

- [Chrome Web Store](https://chrome.google.com/webstore) <!-- TODO: replace with real store URL -->
- [Firefox Add-ons](https://addons.mozilla.org) <!-- TODO: replace with real store URL -->

## How it works

```
   ┌──────────┐       ┌──────────┐       ┌──────────────┐
   │  1. SAVE │  ───▶ │ 2. SELECT│  ───▶ │  3. INJECT   │
   │ contexts │       │  profile │       │ into any AI  │
   └──────────┘       └──────────┘       └──────────────┘
   CLI / web app      Extension popup     ChatGPT, Claude,
   or markdown        or `ck copy`        Gemini, Perplexity…
```

1. **Save** named contexts as Markdown — locally, in Git, or synced to the cloud.
2. **Select** the right profile for the conversation you're about to have.
3. **Inject** it into the active AI chat with one click (extension) or one command (CLI).

## Supported AI tools

| Tool          | CLI copy | Extension inject | Notes                                  |
| ------------- | :------: | :--------------: | -------------------------------------- |
| ChatGPT       |    ✅    |        ✅        | web.chatgpt.com — full support         |
| Claude        |    ✅    |        ✅        | claude.ai — full support               |
| Gemini        |    ✅    |        ✅        | gemini.google.com                      |
| Perplexity    |    ✅    |        ✅        | perplexity.ai                          |
| Cursor        |    ✅    |        🟡        | CLI works; extension via `.cursor/rules` sync |
| Copilot Chat  |    ✅    |        ⏳        | VS Code extension in progress          |

Legend: ✅ shipping · 🟡 partial · ⏳ planned

## Project structure

```
contextkit/
├── README.md
├── LICENSE                       # MIT
├── packages/
│   ├── cli/                      # TypeScript CLI, published to npm as `contextkit`
│   ├── extension/                # Chrome + Firefox extension (MV3)
│   └── web/                      # Next.js + Tailwind hosted app (contextkit.app)
├── docs/
│   ├── getting-started.md
│   ├── api-reference.md
│   ├── TECHNICAL_SPEC.md
│   └── PAIN_POINTS.md
└── templates/
    ├── developer.md
    ├── writer.md
    └── marketer.md
```

## Documentation

- [Getting Started](./docs/getting-started.md) — install, init, your first context
- [API Reference](./docs/api-reference.md) — CLI commands and HTTP endpoints
- [Technical Spec](./docs/TECHNICAL_SPEC.md) — architecture, storage format, sync protocol
- [Pain Points](./docs/PAIN_POINTS.md) — research and rationale behind ContextKit

## Roadmap

Status legend: ✅ shipped · 🟡 scaffolded, hardening · ⏳ planned

### Phase 1 · Core CLI + local storage — 🟡 scaffolded, pre-release

- [x] `init`, `add`, `list`, `get`, `edit`, `delete`, `copy`, `inject`, `template` commands
- [x] `history`, `serve` (local API on 127.0.0.1:7842), `import`, `export` commands
- [x] Local `.ctx` (YAML-frontmatter + Markdown) store in `~/.contextkit/`
- [x] Version snapshots on every save under `history/<id>/vN.ctx`
- [x] Cross-platform clipboard (pbcopy / xclip / clip.exe)
- [x] Bundled templates (developer, writer, marketer)
- [x] `login`, `logout`, `token`, `sync`, `completions`, `telemetry` commands
- [x] Shell completions (`bash`, `zsh`, `fish`)
- [x] Published to npm as [`@mianazeemdaula/contextkit`](https://www.npmjs.com/package/@mianazeemdaula/contextkit)
- [ ] GitHub release with prebuilt single-file binary

### Phase 2 · Browser extension — 🟡 scaffolded

- [x] MV3 manifest, service worker, popup (React), content-script router
- [x] Per-tool adapters: ChatGPT, Claude, Gemini, Perplexity (4 candidate selectors each)
- [x] Native-messaging bridge with graceful CLI-unreachable fallback
- [x] OS install scripts for native host (mac / linux / windows)
- [x] Hardened DOM selectors with `MutationObserver` wait + dated maintenance notes
- [x] Generated `CK` icon set (16/48/128 PNGs via zero-dep encoder)
- [x] Keyboard shortcuts (`⌘⇧K` open popup, `⌘⇧I` inject default)
- [x] Per-tool "auto-prepend on new chat" toggle (settings panel in popup)
- [ ] Chrome Web Store submission (needs developer account)
- [ ] Mozilla Add-ons (AMO) submission with signed XPI (needs AMO account)

### Phase 3 · Web app + public launch — 🟡 scaffolded

- [x] Next.js 15 + Tailwind, marketing pages render without env vars
- [x] Landing wired to copy in [`landing/COPY.md`](./landing/COPY.md)
- [x] App routes: dashboard, contexts CRUD, login (magic link), templates
- [x] REST API: `/api/contexts` and `/api/contexts/[id]`
- [x] CodeMirror-based Markdown editor (`@uiw/react-md-editor`)
- [x] Version-history UI backed by `context_versions` (with restore)
- [x] Public templates gallery with one-click import
- [x] `/auth/callback` route for magic-link redirect (PKCE flow)
- [x] OG image + favicon set (Next 15 `ImageResponse`)
- [ ] Deploy to `contextkit.app` (needs Vercel project)
- [ ] Launch: Product Hunt + r/ChatGPT + r/ClaudeAI + r/LocalLLaMA + HN Show

### Phase 4 · Cloud sync · SaaS layer — 🟡 scaffolded

- [x] Supabase server + browser clients (`@supabase/ssr`)
- [x] SQL schema with row-level-security policies (8 policies)
- [x] Auth middleware + session refresh
- [x] Bidirectional `ck sync` protocol — `--push`/`--pull`/`--status` + `/api/sync/{pull,push}` routes wired
- [x] CLI auth handshake — `/api/cli/auth` + `/cli/auth` browser callback
- [x] Conflict resolution: server returns `{accepted, conflicts}`, CLI honors `--force`
- [x] Team sharing: `team_invites` table, admin invite route, accept page
- [x] Stripe billing stub: checkout session + signature-verified webhook (needs Stripe keys)
- [ ] Usage analytics dashboard (telemetry pipeline exists CLI-side, UI pending)
- [ ] Audit log for Enterprise tier
- [ ] SSO (SAML / OIDC) for Enterprise

### Phase 5 · Ecosystem (post-launch) — ⏳ planned

- [ ] VS Code extension — inject contexts into Copilot Chat / Cursor side-panel
- [ ] Raycast / Alfred plugin
- [ ] iOS / Android share-sheet app
- [ ] Public REST API + API keys (server side exists; key-rotation UI pending)
- [ ] Webhooks (context updated → trigger your automation)
- [ ] Community template registry at `templates.contextkit.app`
- [ ] AI-tool adapter contributions opened to community (each adapter = one PR)
- [ ] i18n: ship `es`, `pt-BR`, `de`, `ja` for the marketing site

### Cross-cutting (always in flight)

- [x] CI: GitHub Actions — [`ci.yml`](./.github/workflows/ci.yml), [`release.yml`](./.github/workflows/release.yml), extension build, web build
- [x] Changesets for monorepo versioning ([`.changeset/`](./.changeset))
- [x] Telemetry pipeline (off by default, opt-in only) — `src/lib/telemetry.ts` in CLI
- [x] Docs as Markdown under [`docs/`](./docs) (technical spec, pain points)
- [x] [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) — Contributor Covenant 2.1
- [x] Issue / PR templates + `CODEOWNERS`
- [ ] Security review of at-rest encryption (see [`docs/TECHNICAL_SPEC.md §11`](./docs/TECHNICAL_SPEC.md))

Fine-grained tracking lives in [GitHub issues](https://github.com/mianazeemdaula/contextkit/issues).

## Contributing

We love contributions of every size — typo fixes, new AI-tool adapters, templates, docs, anything. Start with [CONTRIBUTING.md](./CONTRIBUTING.md), browse [`good first issue`](https://github.com/mianazeemdaula/contextkit/labels/good%20first%20issue), and please follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

Not a coder? Submit a context template under [`templates/`](./templates) — it's the easiest way to help thousands of users.

## Community

- **Discord** — [join the server](https://discord.gg/contextkit) <!-- TODO: real invite -->
- **X / Twitter** — [@contextkit](https://x.com/contextkit) <!-- TODO: real handle -->
- **GitHub Discussions** — [ask questions, share contexts](https://github.com/mianazeemdaula/contextkit/discussions)

## How ContextKit compares

| Feature                          | **ContextKit** | PromptLayer | Notion        | Raw system prompts |
| -------------------------------- | :------------: | :---------: | :-----------: | :----------------: |
| Open source (MIT)                |       ✅        |      ❌      |       ❌       |         n/a        |
| Works across **every** AI tool   |       ✅        |      🟡     |   manual copy |     per-tool only  |
| One-click browser injection      |       ✅        |      ❌      |       ❌       |          ❌         |
| Version history                  |       ✅        |      ✅      |  page history |          ❌         |
| Local-first / self-hostable      |       ✅        |      ❌      |       ❌       |         n/a        |
| Team sharing                     |       ✅        |      ✅      |       ✅       |          ❌         |
| Free tier                        |       ✅        |    limited  |    limited    |         free       |

## License

[MIT](./LICENSE) © <!-- TODO: copyright holder --> ContextKit contributors.

## Acknowledgements

ContextKit stands on the shoulders of prior art and inspiration from:

- **ContextOS** (UC Berkeley MICS 2025) — early validation of the context-fragmentation problem.
- **Cal.com** and **Plausible Analytics** — for showing how open-core SaaS is done right.
- **Continue.dev**, **LangChain**, and the broader context-engineering community.
- Every Reddit, X, and Indie Hackers user who told us, in their own words, why this needed to exist.
