-- Agent v2 — the reader agent gets a real (viem) wallet it funds weekly and
-- spends down, returning the unspent. The reader's ledger is debited once at
-- funding time, not per chapter.

alter table public.agent_config
  add column if not exists agent_wallet_pk text,             -- server-only private key
  add column if not exists wallet_balance_usdc numeric not null default 0,  -- funded budget left this week
  add column if not exists week_funded_usdc numeric not null default 0;     -- amount loaded this week
