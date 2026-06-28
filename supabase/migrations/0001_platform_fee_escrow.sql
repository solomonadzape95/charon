-- Charon — platform fee + 7-day escrow accounting (additive; safe to run on live data).
-- Run in the Supabase SQL editor. Does NOT drop or reset any table.
--
-- Adds the columns the fee engine + reconciliation rely on, then backfills
-- existing rows so the invariant holds the moment this lands:
--   total_deposits == reader_float + creator_unpaid + platform_revenue + total_withdrawn

-- ── payments: record the fee split + escrow clear time ──────
alter table public.payments
  add column if not exists fee_usdc numeric not null default 0,        -- platform's 5% cut
  add column if not exists net_usdc numeric,                           -- creator's net (gross - fee)
  add column if not exists withdrawable_at timestamptz;                -- escrow clears at created_at + 7d

create index if not exists payments_escrow_idx
  on public.payments (creator_id, withdrawable_at)
  where status = 'settled';

-- Backfill: pre-fee settlements were 100% to the creator and are already cleared.
update public.payments set net_usdc = amount_usdc where net_usdc is null;
update public.payments
  set withdrawable_at = created_at
  where withdrawable_at is null and status = 'settled';

-- ── creators: lifetime withdrawn (the "money that left" side of recon) ──
alter table public.creators
  add column if not exists total_withdrawn_usdc numeric not null default 0;
