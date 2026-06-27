-- Charon schema (v2 — tip-any-creator). Run in the Supabase SQL editor (or `supabase db push`).
-- RLS: public read everywhere; writes only via the service-role key (server).
--
-- This DROPS the v1 pay-per-article tables. There is no production data to keep.

drop table if exists public.payments cascade;
drop table if exists public.agent_sessions cascade;
drop table if exists public.articles cascade;
drop table if exists public.creators cascade;

-- ── users (readers) ───────────────────────────────────────
create table public.users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text unique,
  telegram_id text unique,                 -- linked via /start <token>
  link_token text unique,                  -- one-time token issued by the dashboard
  balance_usd numeric not null default 0,   -- ledger balance, USDC held in the pooled treasury
  session_cap_usd numeric not null default 1.00
);

-- ── creators (created on first tip, before they ever sign up) ──
create table public.creators (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text,
  -- direct-route payout wallet (their own address, when known/registered)
  wallet_address text,
  -- escrow: a Circle Programmable Wallet created server-side to hold unclaimed tips
  circle_wallet_id text,
  circle_wallet_address text,
  balance_usd numeric not null default 0,   -- accumulated unclaimed escrow
  claimed boolean not null default false,
  claim_token text unique default gen_random_uuid()::text
);

-- ── identity graph (many handles → one creator_id) ─────────
create table public.creator_identities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  platform text not null,                   -- ens | farcaster | github | mirror | x | domain | email
  handle text not null,                     -- the normalized identifier (ens name, gh login, address, domain…)
  address text,                             -- resolved wallet, if any
  confidence int not null default 0,
  unique (platform, handle)
);
create index creator_identities_creator_idx on public.creator_identities(creator_id);

-- ── tips ───────────────────────────────────────────────────
create table public.tips (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references public.users(id) on delete set null,
  creator_id uuid references public.creators(id) on delete set null,
  url text not null,
  platform text,
  amount_usd numeric not null,
  -- pending_confirmation | sent | escrowed | claimed | returned | failed
  status text not null default 'pending_confirmation',
  confidence int,
  agent_reasoning text,
  tx_hash text
);
create index tips_user_idx on public.tips(user_id);
create index tips_creator_idx on public.tips(creator_id);
create index tips_status_idx on public.tips(status);

-- ── ledger (reader balance audit trail) ────────────────────
create table public.ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,                       -- deposit | tip_debit | refund
  amount_usd numeric not null,              -- positive = credit, negative = debit
  tip_id uuid references public.tips(id) on delete set null
);
create index ledger_user_idx on public.ledger(user_id);

-- ── pending_tips (Telegram conversational state for /tip) ──
create table public.pending_tips (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  telegram_id text not null,
  chat_id text not null,
  url text not null,
  comment text,
  suggested_amount numeric not null,
  creator_id uuid references public.creators(id) on delete set null,
  confidence int,
  action text,                              -- route | escrow | confirm_identity | ask
  agent_reasoning text
);
create index pending_tips_tg_idx on public.pending_tips(telegram_id);

-- ── RLS ────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.creators enable row level security;
alter table public.creator_identities enable row level security;
alter table public.tips enable row level security;
alter table public.ledger enable row level security;
alter table public.pending_tips enable row level security;

do $$
declare t text;
begin
  foreach t in array array['users','creators','creator_identities','tips','ledger','pending_tips']
  loop
    execute format('drop policy if exists "public read" on public.%I;', t);
    execute format('create policy "public read" on public.%I for select using (true);', t);
    execute format('drop policy if exists "service write" on public.%I;', t);
    execute format('create policy "service write" on public.%I for all to service_role using (true) with check (true);', t);
  end loop;
end $$;

-- Realtime for the live stats dashboard
alter publication supabase_realtime add table public.tips;
