-- Autonomous Reader Agent (charon-reader-agent-spec.md).
--
-- One agent per reader: a learned taste profile, a weekly budget, its own
-- (optional) Circle wallet, and a chat/activity feed. Payments it makes are
-- attributed to the reader's account but tagged caller_type = 'agent'.

create table if not exists public.agent_config (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  taste_profile jsonb,                              -- TasteProfile produced at setup
  weekly_limit_usdc numeric not null default 3,
  weekly_spent_usdc numeric not null default 0,
  week_start timestamptz not null default now(),    -- resets weekly_spent after 7d
  agent_wallet_id text,                             -- Circle Programmable Wallet (optional)
  agent_wallet_address text,
  paused boolean not null default false
);

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete cascade,
  sender text not null,                             -- 'agent' | 'reader'
  kind text not null default 'message',             -- discovery | decision | summary | budget | message
  content text not null,
  series_id uuid references public.series(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  amount_usdc numeric,
  payment_ref text
);
create index agent_messages_user_idx on public.agent_messages(user_id, created_at);

-- Attribute payments to a human read vs. an autonomous agent read.
alter table public.payments
  add column if not exists caller_type text not null default 'human';   -- human | agent
