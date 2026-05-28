<div align="center">

# ContextKit

### Context, on tap — for every AI you use.

[![npm version](https://img.shields.io/npm/v/contextkit?color=cb3837&logo=npm)](https://www.npmjs.com/package/contextkit)
[![Build](https://img.shields.io/github/actions/workflow/status/contextkit/contextkit/ci.yml?branch=main)](https://github.com/contextkit/contextkit/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/contextkit/contextkit?style=social)](https://github.com/contextkit/contextkit/stargazers)
[![Discord](https://img.shields.io/discord/000000000000000000?label=discord&logo=discord&color=5865F2)](https://discord.gg/contextkit)

Save your project, profile, and style-guide context **once**, then inject it into ChatGPT, Claude, Gemini, Perplexity, Cursor — or any AI tool — with a single click. ContextKit is open-source, AI-agnostic, and runs from a CLI, a browser extension, or a hosted web app.

<!-- TODO: replace with demo.gif -->

[**Get Started**](./docs/getting-started.md) · [**Docs**](./docs) · [**Try the web app**](https://contextkit.app)

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
npm install -g contextkit
# or
npx contextkit
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

- [x] **Phase 1 · Core CLI + local storage** (Week 1–2)
  - `init`, `add`, `list`, `get`, `copy`, `inject` commands
  - Local Markdown/JSON store in `~/.contextkit/`
  - Published to npm
- [ ] **Phase 2 · Browser extension** (Week 3–4)
  - Chrome/Firefox popup with saved contexts
  - One-click inject into ChatGPT, Claude, Gemini, Perplexity
  - Native messaging to read local contexts
- [ ] **Phase 3 · Web app + public launch** (Week 5–6)
  - Next.js + Tailwind UI for visual context management
  - Public templates gallery
  - ProductHunt / Reddit launch
- [ ] **Phase 4 · Cloud sync (SaaS layer)** (Week 7–8)
  - Supabase backend, auth, multi-device sync
  - Team sharing, version history
  - Paid tiers via Stripe

See open issues for fine-grained tracking.

## Contributing

We love contributions of every size — typo fixes, new AI-tool adapters, templates, docs, anything. Start with [CONTRIBUTING.md](./CONTRIBUTING.md), browse [`good first issue`](https://github.com/contextkit/contextkit/labels/good%20first%20issue), and please follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

Not a coder? Submit a context template under [`templates/`](./templates) — it's the easiest way to help thousands of users.

## Community

- **Discord** — [join the server](https://discord.gg/contextkit) <!-- TODO: real invite -->
- **X / Twitter** — [@contextkit](https://x.com/contextkit) <!-- TODO: real handle -->
- **GitHub Discussions** — [ask questions, share contexts](https://github.com/contextkit/contextkit/discussions)

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
