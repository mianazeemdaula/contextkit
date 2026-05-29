-- ContextKit Postgres schema for Supabase.
-- RLS policy syntax: https://supabase.com/docs/guides/database/postgres/row-level-security
--   "alter table \"table_name\" enable row level security;"
--   "create policy \"...\" on <t> for select using ( (select auth.uid()) = user_id );"

-- Users mirror table (Supabase manages auth.users; we keep profile data here).
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  name text not null,
  slug text,
  body text not null default '',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contexts_user_idx on public.contexts(user_id);
create index if not exists contexts_team_idx on public.contexts(team_id);
create unique index if not exists contexts_user_slug_idx on public.contexts(user_id, slug) where slug is not null;

create table if not exists public.context_versions (
  id uuid primary key default gen_random_uuid(),
  context_id uuid not null references public.contexts(id) on delete cascade,
  body text not null,
  version integer not null default 1,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists context_versions_context_idx on public.context_versions(context_id);

create table if not exists public.templates (
  slug text primary key,
  title text not null,
  body text not null,
  category text,
  created_at timestamptz not null default now()
);

-- Stripe-backed subscriptions per user (or per team).
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tier text not null check (tier in ('free','personal','team')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);

-- Team invites (token-based, email-gated).
create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin','member')),
  token text not null unique,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists team_invites_team_idx on public.team_invites(team_id);
create index if not exists team_invites_email_idx on public.team_invites(email);

-- ============================================================================
-- Row Level Security
-- See https://supabase.com/docs/guides/database/postgres/row-level-security
-- ============================================================================

alter table public.users enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.contexts enable row level security;
alter table public.context_versions enable row level security;
alter table public.templates enable row level security;
alter table public.subscriptions enable row level security;
alter table public.team_invites enable row level security;

-- Users can read/write only their own profile row.
create policy "users_self_select" on public.users
  for select using ((select auth.uid()) = id);
create policy "users_self_update" on public.users
  for update using ((select auth.uid()) = id);

-- Contexts: owner + team members can read; only owner can mutate.
create policy "contexts_owner_all" on public.contexts
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "contexts_team_read" on public.contexts
  for select using (
    team_id is not null and exists (
      select 1 from public.team_members m
      where m.team_id = contexts.team_id and m.user_id = (select auth.uid())
    )
  );

-- Context versions: visible to anyone who can read the parent context.
create policy "context_versions_owner_all" on public.context_versions
  for all using (
    exists (
      select 1 from public.contexts c
      where c.id = context_versions.context_id and c.user_id = (select auth.uid())
    )
  );

-- Teams: members can read; only owner can mutate.
create policy "teams_member_read" on public.teams
  for select using (
    exists (
      select 1 from public.team_members m
      where m.team_id = teams.id and m.user_id = (select auth.uid())
    )
  );
create policy "teams_owner_write" on public.teams
  for all using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "team_members_self_read" on public.team_members
  for select using ((select auth.uid()) = user_id);

create policy "team_members_admin_read" on public.team_members
  for select using (
    exists (
      select 1 from public.team_members m
      where m.team_id = team_members.team_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner','admin')
    )
  );

-- Templates are world-readable.
create policy "templates_public_read" on public.templates
  for select using (true);

-- Subscriptions: each user reads only their own row.
create policy "subscriptions_self_read" on public.subscriptions
  for select using ((select auth.uid()) = user_id);
-- Writes happen via service-role from the Stripe webhook (RLS bypassed).

-- Team invites: only admins/owners can create + list pending invites for their team.
create policy "team_invites_admin_select" on public.team_invites
  for select using (
    exists (
      select 1 from public.team_members m
      where m.team_id = team_invites.team_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner','admin')
    )
  );

create policy "team_invites_admin_insert" on public.team_invites
  for insert with check (
    exists (
      select 1 from public.team_members m
      where m.team_id = team_invites.team_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner','admin')
    )
  );

-- The invited user (matched by their auth email) can read + mark their own invite accepted.
create policy "team_invites_invitee_select" on public.team_invites
  for select using (
    email = (select auth.email())
  );

create policy "team_invites_invitee_update" on public.team_invites
  for update using (
    email = (select auth.email())
  ) with check (
    email = (select auth.email())
  );
