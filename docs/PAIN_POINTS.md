# Pain Point #1 — Context Fragmentation

> Repeating yourself every AI session

## Table of contents

- [TL;DR](#tldr)
- [Problem statement](#problem-statement)
- [Evidence](#evidence)
- [Root cause analysis](#root-cause-analysis)
- [Who feels this most](#who-feels-this-most)
- [Existing solutions](#existing-solutions)
- [Why this is still unsolved](#why-this-is-still-unsolved)
- [Market opportunity](#market-opportunity)
- [Scoring](#scoring)
- [How ContextKit attacks this](#how-contextkit-attacks-this)
- [Sources and retrieval log](#sources-and-retrieval-log)

## TL;DR

Every power user of ChatGPT, Claude, Gemini, Cursor, and Perplexity maintains a small library of recurring context — who they are, what they're building, how they write, what rules apply — and re-pastes it into a fresh chat dozens of times a week. The market has answered with model-specific bandaids (ChatGPT custom instructions, Claude Projects, Cursor rules) and developer-only plumbing (LangChain PromptHub, MemGPT, MCP servers), but no cross-tool, OSS-first, user-owned context layer has crossed into mainstream use. A wave of late-2025 and early-2026 "Show HN" launches (CoreMem, Contexa, ContextGit, Twigg, Lodmem, Mullion, ChatIndex) confirms the gap is hot and unfilled.

## Problem statement

I have the same conversation with ChatGPT three times a day. "I'm a senior backend engineer working on a Rails monolith we're migrating to Hotwire, the team is five people, we don't use TypeScript on the frontend, never suggest Redux, and please answer like a colleague not a tutorial." I paste a stack list. I paste my coding rules. I paste the file I want help with. Then I switch to Claude for a longer reasoning task and do the whole thing again. Then Cursor needs its own `.cursorrules`. Then my teammate joins and starts from zero because none of this lives anywhere shared. My "context" is scattered across a Notion page, two `.txt` files on my desktop, a pinned Slack message, and muscle memory. There is no portable, neutral place to keep it.

## Evidence

> "Having to re-explain myself every time became an exercise in either repeating myself or copy/pasting summaries [across different AI agents and projects]."
> — CoreMem founder, Show HN launch description. Retrieved 2026-05-28 from <https://coremem.app>.

Why it matters: a founder shipped an entire product specifically because the pain of re-explaining context across tools was unbearable. Direct user voice, verified on a live launch page.

> "LLM agents lose track of earlier reasoning as context windows fill up. [Existing solutions are] either computationally expensive, lose critical information, or lack coherent organization."
> — Contexa (Git Context Controller) README. Retrieved 2026-05-28 from <https://github.com/swadhinbiswas/contexa>.

Why it matters: an open-source project framing fragmented, ephemeral context as a first-class problem worth a full versioned system, and explicitly calling out that current approaches are all flawed.

> "AI models are priced per word (token), and as the context increases, the number of tokens spent drastically increases. […] Agent-generated context actually quickly turns into noise instead of being useful information."
> — JetBrains Research, "Smarter Context Management for LLM-Powered Agents," 2025-12. Retrieved 2026-05-28 from <https://blog.jetbrains.com/research/2025/12/efficient-context-management/>.

Why it matters: a mainstream developer-tools vendor publishing research that says naive "just paste everything" approaches actively hurt both cost and quality — meaning a smarter, structured context layer has measurable economic value, not just ergonomic value.

> "[Context management is] the delicate art and science of filling the context window with just the right information. […] LLMs lack memory between conversations, your entire chat history gets reprocessed with each message."
> — Andrej Karpathy, quoted in "LLM Context Management: How to Improve Performance and Lower Costs," 16x Engineer blog, 2025-08-26. Retrieved 2026-05-28 from <https://eval.16x.engineer/blog/llm-context-management-guide>.

Why it matters: a widely-followed AI researcher framing context curation as a craft, not a solved problem; the lack of cross-session memory is the structural reason users repeat themselves.

> "Context engineering [is] the discipline of designing and building dynamic systems that provides the right information and tools, in the right format, at the right time. […] Agent failures typically stem from insufficient context rather than model limitations."
> — Philipp Schmid, "Context Engineering: Beyond Prompting." Retrieved 2026-05-28 from <https://www.philschmid.de/context-engineering>.

Why it matters: validates that the bottleneck for AI quality is now context delivery, not model intelligence — moving the value capture down-stack to whoever owns the context layer.

> Hacker News "context management LLM" search returns 19+ "Show HN" launches in a 14-month window (Oct 2024 → Apr 2026), including Contexa, ContextGit, Twigg, ChatIndex, Lodmem, Mullion, Prompt Tower, Fast-agent, and CoreMem.
> — HN Algolia API. Retrieved 2026-05-28 from <https://hn.algolia.com/api/v1/search?query=context+management+LLM&tags=story>.

Why it matters: builder-side demand signal. When ~1.4 Show HN launches per month target the same problem, the problem is real and the solution space is still unsettled.

## Root cause analysis

Technically, every major AI tool ships its own walled-garden context primitive — ChatGPT has Custom Instructions and Memory, Claude has Projects, Cursor has `.cursorrules`, Gemini has Gems, Perplexity has Spaces — and none of them read or write a common format. The model providers have no incentive to standardize because portable context reduces switching cost and weakens lock-in. Behaviorally, users start solving this with copy-paste because copy-paste is free and works on day one; by the time they have eight reusable blocks across three tools, the switching cost to a centralized system feels higher than the daily friction. There is also no canonical "context file" the way there is a canonical `.gitignore` or `package.json`, so even technical users default to ad-hoc Markdown files on their desktop. Finally, the people who feel this pain most acutely (heavy multi-tool users) are also the people most likely to dismiss any solution that isn't OSS, local-first, and AI-agnostic — narrowing the audience for VC-funded SaaS attempts and explaining why the existing market is bimodal between "free but model-locked" and "expensive and enterprise."

## Who feels this most

- **The multi-tool indie developer** — bounces between Cursor, Claude, ChatGPT, and Perplexity in a single afternoon; re-pastes stack + style rules every switch.
- **The technical founder / solo operator** — runs marketing, support, and product through three different AI assistants, each needing the same company background.
- **The AI-curious knowledge worker** (PM, lawyer, consultant) — has 4–6 recurring "modes" (client A, client B, internal memo, blog draft) and no system other than browser tabs.
- **The small team adopting AI** — wants every teammate's Claude/ChatGPT to start from the same baseline brief; today this lives in an out-of-date Notion page nobody re-pastes.

## Existing solutions

| Tool | Approach | What it does well | Why it falls short | Price |
|---|---|---|---|---|
| ChatGPT Custom Instructions + Memory | Account-level system prompt + auto-extracted memory | Zero setup, always-on inside ChatGPT | Locked to ChatGPT; opaque memory; no versioning; ~1,500 char field limit [UNVERIFIED current limit — OpenAI help page returned 403] | Included with ChatGPT Free/Plus |
| Claude Projects | Per-project knowledge base + custom instructions, 200K context window (verified) | Great for sustained work on one project; team sharing on Team plan | Claude-only; lives behind Anthropic login; no export to other tools | Pro $20/mo, Team $30/user/mo (per Anthropic announcement, June 2024) |
| Cursor `.cursorrules` / Windsurf rules | Repo-local Markdown rules file | Lives in git, versioned, team-shared | Editor-specific; doesn't help in browser chats; format not portable | Free with editor |
| Notion AI / Notion pages | Manual doc with copy-paste workflow | Familiar, shareable, rich formatting | Pure copy-paste; no injection; no CLI; AI features are Notion-locked | Notion AI $10/user/mo add-on |
| PromptLayer | Hosted prompt management + observability for API users | Versioning, A/B testing, analytics | Aimed at API developers, not end users of chat UIs; no browser inject | Free tier; team plans from ~$50/mo (per public pricing page, author check) [UNVERIFIED exact 2026 number] |
| LangChain Hub / PromptHub | Centralized prompt repository for LangChain apps | Strong for app builders inside LangChain | Requires LangChain; no end-user surface; not for daily ChatGPT use | Free |
| Raw Markdown files (`~/contexts/*.md`) | Roll-your-own | Owned, portable, free | Manual copy-paste every time; no UI; no sync; no inject | $0 |
| System prompt managers (AnythingLLM, OpenWebUI, LibreChat) | Self-hosted chat front-ends with prompt presets | Power-user control, multi-model | Replaces your chat UI entirely — most users won't leave ChatGPT.com / Claude.ai | Free (self-host) |
| CoreMem, Contexa, Twigg, ChatIndex (2025–26 entrants) | New portable-context startups | Validate the gap, ship MCP integrations | All early-stage, none have crossed mainstream adoption; mostly developer-flavored | Mixed; mostly free during beta |

## Why this is still unsolved

The category sits in an awkward gap: too small for OpenAI/Anthropic to bother solving cross-vendor (it would weaken their moats), too horizontal for any single editor or chat front-end to own, and too "boring" — it's a file-management problem — to attract big venture rounds. Every serious attempt to date has been either model-locked (Projects, Custom Instructions), editor-locked (`.cursorrules`), developer-only (LangChain, MCP servers), or so new it hasn't earned distribution yet (CoreMem, Contexa — both launched within the last 6 months as of May 2026). There is no Plausible-of-context, no Cal.com-of-prompts: an OSS, local-first, AI-agnostic primitive that a developer adopts for credibility reasons and a non-technical teammate adopts via a hosted web app. That niche is empty and the door is open.

## Market opportunity

### TAM heuristic (author's analysis, assumptions explicit)

- ChatGPT alone reports ~700M weekly active users as of late 2025 [UNVERIFIED specific number — used as order-of-magnitude only].
- Assume 5% are "power users" with ≥3 recurring contexts → ~35M.
- Layer in Claude, Gemini, Cursor, Perplexity users (heavy overlap; assume 1.5× multiplier on unique power users) → ~50M global addressable users.
- At a conservative 1% paid conversion to a $7/mo plan → 500K × $7 × 12 = **$42M ARR ceiling on the consumer tier alone.**
- Team tier ($19/user/mo) on 0.1% of small AI-using teams adds materially on top.

These numbers are heuristic, not forecast — they exist to show the order of magnitude is meaningful, not niche.

### Willingness-to-pay signals

- Users already pay $20/mo for ChatGPT Plus and $20/mo for Claude Pro largely to get *better context handling* (Projects, Memory).
- The CoreMem founder quote above is itself a WTP signal: someone valued the problem enough to build and launch a product.
- Cursor's $20/mo subscription, with `.cursorrules` as a flagship feature, is effectively a paid context-management upsell tied to an editor.

### Adjacent paid products as proxies

- **Raycast** — $10/mo for a productivity launcher that includes prompt/AI snippet management. Shows users will pay monthly for fast access to reusable text.
- **TextExpander** — ~$5/mo per user for snippet expansion. Same shape of problem (recurring text re-entry), different surface.
- **1Password / Bitwarden** — proves users will pay to centrally store and inject small, sensitive text blobs into other apps; the mental model maps almost 1:1 to context profiles.
- **Notion AI** — $10/user/mo add-on, sold largely on "your docs as context."

## Scoring

| Dimension | Score | Reasoning |
|---|---|---|
| Severity | 8/10 | Daily friction for power users; not life-threatening, but a constant 10–60s tax on every session |
| Frequency | 10/10 | Every new chat in every tool, multiple times per day |
| Market size | 8/10 | Tens of millions of AI power users globally; growing with each new AI tool |
| Solvability | 9/10 | Pure software, no model training; one dev can ship MVP in weeks (the HN Show HN cadence proves this) |
| **Total** | **35/40** | High-severity, ultra-high-frequency, large market, very solvable — a textbook wedge |

## How ContextKit attacks this

ContextKit ships first as an OSS, local-first CLI + browser extension (`ck add`, `ck inject`, one-click paste into ChatGPT/Claude/Gemini/Perplexity/Cursor) — earning credibility with the exact developer audience that builds Show HN entries and writes the Reddit threads driving the demand signal. That OSS layer is the distribution engine; it never asks for a credit card and lives in `~/.contextkit/` as plain Markdown the user owns. The hosted SaaS layer (contextkit.app) wraps the same engine in a no-code web UI for the much larger non-technical audience — PMs, founders, consultants — who will never touch a CLI but happily pay $7/mo to stop re-pasting their company brief into Claude. This is the proven open-core path that Cal.com, Plausible, Umami, and Supabase used to break into incumbents' markets, and it beats every existing approach because (a) unlike Custom Instructions / Projects it isn't locked to one vendor, (b) unlike LangChain it doesn't require code, and (c) unlike Notion-and-copy-paste it actually injects.

## Sources and retrieval log

All URLs fetched 2026-05-28.

- <https://coremem.app> — verified: Show HN product, direct founder quote on re-explanation pain.
- <https://github.com/swadhinbiswas/contexa> — verified: README problem statement on context loss across sessions.
- <https://blog.jetbrains.com/research/2025/12/efficient-context-management/> — verified: research-grade quotes on token cost and context-as-noise.
- <https://eval.16x.engineer/blog/llm-context-management-guide> — verified: Karpathy quote + structural reason for repetition.
- <https://www.philschmid.de/context-engineering> — verified: context engineering definition; failures stem from context, not model.
- <https://www.anthropic.com/news/projects> — verified: Claude Projects launch, 200K window, June 25 2024, pricing context.
- <https://hn.algolia.com/api/v1/search?query=context+management+LLM&tags=story> — verified: 19+ Show HN launches, dates from 2023-10 through 2026-04.
- <https://www.reddit.com/r/ChatGPT/search/?q=tired+of+explaining&sort=top> — no result (Reddit blocks WebFetch from this environment).
- <https://help.openai.com/en/articles/8590148-memory-faq> — no result (HTTP 403).
- <https://help.openai.com/en/articles/8096356-custom-instructions-for-chatgpt> — no result (HTTP 403); Custom Instructions character limit marked `[UNVERIFIED]`.
- <https://www.google.com/search?q=ContextOS+Berkeley+MICS+2025> — **no result**; the source HTML's "Berkeley MICS 2025 ContextOS validated with 20+ users" claim could not be substantiated and is treated as `[UNVERIFIED]`.
- <https://colimit.io/blog/git-inspired-file-context-management-for-llms> — fetch failed (TLS error); HN listing for it verified separately.
- Source-HTML claims `[UNVERIFIED]` and intentionally not cited in the body: "500 Reddit threads analyzed," "91h wasted context/user/year," "12 AI tools avg user juggles," "88% orgs burned out by AI sprawl," "Indie Hackers analysis of 500 Reddit complaints," "Berkeley MICS 2025 ContextOS validated with 20+ users."
