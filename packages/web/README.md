# @contextkit/web

Next.js 15 app router + Tailwind 3 + Supabase SSR.

## Dev

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase + (optionally) Stripe values
pnpm dev
```

Marketing pages (`/`, `/pricing`, `/docs`) render without env vars. App pages
(`/dashboard`, `/contexts/*`, `/login`) require Supabase. Billing and the
team-sharing flow additionally require Stripe + Supabase to function
end-to-end; without them the routes return `503` with a helpful message
instead of crashing the build.

## Scripts

- `pnpm dev` — local dev server
- `pnpm build` — production build (passes with **no** env vars)
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — `next lint`

## Env vars

| Var | Required for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`     | All app routes, auth, sync, billing webhook user lookup | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| All app routes | |
| `SUPABASE_SERVICE_ROLE`        | Stripe webhook → `subscriptions` upsert | server-side only |
| `NEXT_PUBLIC_SITE_URL`         | `/auth/callback`, OG image canonical, invite URLs | defaults to `http://localhost:3000` |
| `STRIPE_SECRET_KEY`            | `/api/billing/checkout` | otherwise → 503 |
| `STRIPE_WEBHOOK_SECRET`        | `/api/billing/webhook` signature verify | otherwise → 503 |
| `STRIPE_PRICE_PERSONAL`        | Personal-tier checkout | |
| `STRIPE_PRICE_TEAM`            | Team-tier checkout | |

## Supabase setup

1. Create a project at supabase.com.
2. Run `supabase/schema.sql` then `supabase/seed.sql` in the SQL editor.
3. Copy URL + anon key + service role into `.env.local`.

## Routes

### Pages

- `/` — landing
- `/pricing`, `/docs`, `/templates`, `/settings`
- `/login` — magic-link sign-in (redirect target updated to `/auth/callback`)
- `/auth/callback` — exchanges Supabase `?code=…` for a session cookie
- `/dashboard` — context list
- `/contexts/new` — create
- `/contexts/[id]` — edit (markdown editor via `@uiw/react-md-editor`)
   - `?conflict=1&serverVersion=N` — shows banner the CLI deep-links into
- `/contexts/[id]/versions` — snapshot history + restore
- `/teams/[id]` — team workspace; members + invite form
- `/invites/[token]` — accept-invite landing
- `/cli/auth?callback=…` — browser page the CLI opens during `ck login`

### API

- `GET/POST /api/contexts`, `GET/PATCH/DELETE /api/contexts/[id]` (existing)
- `POST /api/sync/pull` — `{since?: ISO}` → `{contexts: [...]}`
- `POST /api/sync/push` — `{contexts: [...]}` → `{accepted, conflicts}`
- `GET /api/cli/auth?callback=http://127.0.0.1:<port>/cb` → 302 with `?token=…`
- `POST /api/billing/checkout` — `{tier: "personal"|"team"}` → `{url}` (503 without Stripe env)
- `POST /api/billing/webhook` — Stripe webhook receiver; verifies signature
- `GET/POST /api/teams/[id]/invites` — list / create invites

### Server actions

- `saveContext`, `restoreVersion`, `importTemplate` — in `src/app/contexts/actions.ts`
- `createInvite`, `acceptInvite` — in `src/app/teams/actions.ts`

## Notes

- The CodeMirror-style editor uses `@uiw/react-md-editor` loaded via
  `next/dynamic({ ssr: false })`. If the package fails to load, the editor
  falls back to a plain textarea inside a `Suspense` boundary.
- Stripe and team sharing require real Supabase + Stripe env vars to
  function end-to-end. Without them the routes still compile and return
  helpful 503s.
- `subscriptions` table writes happen from the webhook via the
  service-role client (RLS-bypass); the user-side policy is read-only.

## Layout

- `src/app/` — routes (server components by default)
- `src/components/marketing` — landing-page sections (static)
- `src/components/app` — dashboard / editor
- `src/lib/supabase` — server, browser, and middleware clients
- `src/lib/env.ts` — validated env access, including `hasStripe()`
