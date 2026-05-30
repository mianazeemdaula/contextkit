# Contributing to ContextKit

Thanks for considering a contribution. ContextKit is built in the open and we welcome
issues, pull requests, templates, and ideas.

## Quick start for contributors

```bash
git clone https://github.com/mianazeemdaula/contextkit.git
cd contextkit
pnpm install
pnpm -r build
pnpm test
```

Node 20.10+ and pnpm 9+ required. The repo is a pnpm workspace — each `packages/*`
publishes (or ships) independently.

## Repo layout

| Path | What lives there |
|---|---|
| `packages/cli` | The `contextkit` (`ck`) command-line tool. Published to npm. |
| `packages/extension` | Chrome / Firefox MV3 extension. |
| `packages/web` | Next.js web app + hosted SaaS. |
| `docs/` | Spec and research. |
| `templates/` | Starter context profiles users can pull in. |

## How to propose changes

1. **Open an issue first** for anything bigger than a typo or a small bug. We'd rather
   align on direction before you write code.
2. Look for the `good first issue` label if you're new.
3. Fork → branch → PR. Branch names: `fix/...`, `feat/...`, `docs/...`.
4. Keep PRs small and focused. One concern per PR.

## Coding standards

- TypeScript strict mode. No `any` without a comment explaining why.
- Add or update tests with every behavior change.
- Run `pnpm lint && pnpm typecheck && pnpm test` before pushing.
- Conventional commits encouraged but not enforced.

## Contributing a template

Templates are markdown files in `templates/` with YAML frontmatter. The simplest
contribution path:

1. Copy `templates/developer.md` as a starting point.
2. Edit frontmatter (`name`, `description`, `tags`).
3. Write the body. Keep it generic enough that anyone in the role can use it.
4. Open a PR titled `template: add <name>`.

## Code of Conduct

Be kind. Assume good intent. Disagree about ideas, not people. Maintainers reserve
the right to remove comments and ban users who don't follow this.

## License

By contributing you agree your contributions are licensed under the MIT License.
