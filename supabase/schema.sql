-- Charon schema (v3 — reading platform). Run in the Supabase SQL editor.
-- RLS: public read everywhere; writes only via the service-role key (server).
--
-- This DROPS the v2 tip-any-creator tables. There is no production data to keep.

drop table if exists public.pending_tips cascade;
drop table if exists public.tips cascade;
drop table if exists public.ledger cascade;
drop table if exists public.creator_identities cascade;
drop table if exists public.price_history cascade;
drop table if exists public.payments cascade;
drop table if exists public.sessions cascade;
drop table if exists public.loyalty cascade;
drop table if exists public.follows cascade;
drop table if exists public.chapters cascade;
drop table if exists public.series cascade;
drop table if exists public.creators cascade;
drop table if exists public.users cascade;

-- ── users (readers) ───────────────────────────────────────
create table public.users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text unique,
  balance_usd numeric not null default 0,         -- ledger balance, USDC held in the pooled treasury
  session_cap_usd numeric not null default 1.00,  -- safety ceiling on a single session settlement
  welcome_credited boolean not null default false -- one-time new-reader bonus already granted?
);

-- ── creators ──────────────────────────────────────────────
create table public.creators (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text unique,
  bio text,
  slug text unique,
  -- direct-route payout wallet (their own Arc address)
  wallet_address text,
  -- escrow: a Circle Programmable Wallet created server-side to hold unclaimed earnings
  circle_wallet_id text,
  circle_wallet_address text,
  payout_preference text not null default 'usdc_wallet',  -- usdc_wallet | bank
  total_earned_usdc numeric not null default 0,           -- lifetime net earned (creator's 95%)
  balance_usd numeric not null default 0,                 -- unwithdrawn net (available + pending escrow)
  total_withdrawn_usdc numeric not null default 0,        -- lifetime withdrawn out of the treasury
  claimed boolean not null default false,
  claim_token text unique default gen_random_uuid()::text
);

-- ── series ────────────────────────────────────────────────
create table public.series (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  title text not null,
  slug text unique,
  description text,
  genre text,
  cover_image text,
  status text not null default 'ongoing',          -- ongoing | completed
  follower_count int not null default 0,
  avg_completion_rate numeric not null default 0,
  binge_velocity numeric not null default 0,        -- chapters/session observed
  momentum_score numeric not null default 0         -- Agent 3 series-momentum signal
);
create index series_creator_idx on public.series(creator_id);

-- ── chapters ──────────────────────────────────────────────
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  series_id uuid not null references public.series(id) on delete cascade,
  chapter_number int not null,
  title text,
  content_type text not null default 'text',        -- text | images
  content text,                                     -- markdown/plain text, or JSON array of image URLs
  word_count int not null default 0,
  floor_price_usdc numeric not null default 0.01,
  base_price_usdc numeric not null default 0.03,    -- Agent 2's valuation on upload
  current_price_usdc numeric not null default 0.03, -- Agent 3's live-adjusted price
  early_access_price_usdc numeric,
  early_access_release_at timestamptz,
  public_release_at timestamptz not null default now(),
  completion_rate numeric not null default 0,
  reread_rate numeric not null default 0,
  avg_time_spent_seconds numeric not null default 0,
  read_count int not null default 0,
  unique (series_id, chapter_number)
);
create index chapters_series_idx on public.chapters(series_id);

-- ── reading sessions ──────────────────────────────────────
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references public.users(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  completion_rate numeric not null default 0,        -- 0..1 fraction scrolled
  scroll_back_count int not null default 0,
  time_spent_seconds numeric not null default 0,
  binge_depth int not null default 1,                -- nth chapter of this sitting
  reader_comment text,
  agent_value_score numeric,                         -- engagement score 0..100
  amount_settled_usdc numeric,
  agent_reasoning text,
  loyalty_discount_applied numeric not null default 0,
  binge_discount_applied numeric not null default 0
);
create index sessions_user_idx on public.sessions(user_id);
create index sessions_chapter_idx on public.sessions(chapter_id);

-- ── payments (creator settlements) ────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid references public.sessions(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  creator_id uuid references public.creators(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  amount_usdc numeric not null,                      -- gross: what the reader paid
  fee_usdc numeric not null default 0,               -- platform's 5% cut
  net_usdc numeric,                                  -- creator's net (gross - fee)
  withdrawable_at timestamptz,                       -- escrow clears at created_at + 7d
  arc_tx_hash text,
  status text not null default 'pending'             -- pending | settled | failed
);
create index payments_creator_idx on public.payments(creator_id);
create index payments_user_idx on public.payments(user_id);
create index payments_status_idx on public.payments(status);
create index payments_escrow_idx on public.payments(creator_id, withdrawable_at) where status = 'settled';

-- ── ledger (reader balance audit trail) ───────────────────
create table public.ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,                                -- deposit | session_debit | unlock_debit | refund
  amount_usd numeric not null,                       -- positive = credit, negative = debit
  ref_id uuid                                        -- session_id / payment_id, loosely linked
);
create index ledger_user_idx on public.ledger(user_id);

-- ── deposits (reader top-ups: method + on-chain tx) ───────
create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references public.users(id) on delete set null,
  amount_usd numeric not null,
  method text not null default 'wallet',   -- wallet | manual | sandbox
  tx_hash text unique,                      -- on-chain tx (null for sandbox credits)
  from_address text,
  status text not null default 'credited'
);
create index deposits_user_idx on public.deposits(user_id);
create index deposits_created_idx on public.deposits(created_at desc);

-- ── price history (Agent 3 audit trail) ───────────────────
create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  old_price_usdc numeric not null,
  new_price_usdc numeric not null,
  reason text,
  signals_json jsonb
);
create index price_history_chapter_idx on public.price_history(chapter_id);

-- ── series follows (per-reader mode) ──────────────────────
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  mode text not null default 'standard',             -- standard | pre_release | series_unlock
  unique (user_id, series_id)
);
create index follows_user_idx on public.follows(user_id);

-- ── reader loyalty (per series) ───────────────────────────
create table public.loyalty (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  chapters_read int not null default 0,
  total_spent_usdc numeric not null default 0,
  loyalty_tier text not null default 'new',          -- new | reader | loyal | devotee
  unique (user_id, series_id)
);
create index loyalty_user_idx on public.loyalty(user_id);

-- ── RLS ────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'users','creators','series','chapters','sessions','payments',
    'ledger','price_history','follows','loyalty','deposits'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "public read" on public.%I;', t);
    execute format('create policy "public read" on public.%I for select using (true);', t);
    execute format('drop policy if exists "service write" on public.%I;', t);
    execute format('create policy "service write" on public.%I for all to service_role using (true) with check (true);', t);
  end loop;
end $$;

-- Realtime for the live earnings + stats dashboards
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.creators;
