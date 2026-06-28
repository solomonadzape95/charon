-- Charon — deposits ledger (additive; safe on live data).
-- Records every reader top-up with its method and (for on-chain deposits) the
-- verified transaction hash. The UNIQUE constraint on tx_hash is the idempotency
-- key: a given on-chain transfer can be credited to the ledger at most once.

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references public.users(id) on delete set null,
  amount_usd numeric not null,
  method text not null default 'wallet',   -- wallet | manual | sandbox
  tx_hash text unique,                      -- on-chain tx (null for sandbox credits)
  from_address text,
  status text not null default 'credited'
);
create index if not exists deposits_user_idx on public.deposits(user_id);
create index if not exists deposits_created_idx on public.deposits(created_at desc);

alter table public.deposits enable row level security;
drop policy if exists "public read" on public.deposits;
create policy "public read" on public.deposits for select using (true);
drop policy if exists "service write" on public.deposits;
create policy "service write" on public.deposits for all to service_role using (true) with check (true);
