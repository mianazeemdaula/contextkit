# @contextkit/web

Next.js 15 app router + Tailwind 3 + Supabase SSR.

## Dev

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase values for full app
pnpm dev
```

Marketing pages (`/`, `/pricing`, `/docs`) render without env vars. App pages (`/dashboard`, `/contexts/*`, `/login`) require Supabase.

## Scripts

- `pnpm dev` — local dev server
- `pnpm build` — production build
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — `next lint`

## Supabase setup

1. Create a project at supabase.com.
2. Run `supabase/schema.sql` then `supabase/seed.sql` in the SQL editor.
3. Copy URL + anon key + service role into `.env.local`.

## Layout

- `src/app/` — routes (server components by default)
- `src/components/marketing` — landing-page sections (static)
- `src/components/app` — dashboard / editor
- `src/lib/supabase` — server, browser, and middleware clients
