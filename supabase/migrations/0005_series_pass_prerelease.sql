-- Series Pass + Pre-release pricing (charon-payment-architecture.md, Parts 4–5).
--
-- A Series Pass is one payment for permanent access to a whole series, priced at
-- ~85% of the expected per-chapter cost. Pre-release is a single early-access
-- price per series (not per chapter). Both are creator-set, suggested by Agent 2,
-- and persisted here so they survive a reload and drive checkout.
--
-- NULL means "not offered yet" — the creator hasn't configured it.

alter table public.series
  add column if not exists series_pass_price_usdc numeric,
  add column if not exists pre_release_price_usdc numeric;

comment on column public.series.series_pass_price_usdc is
  'One-time price for permanent access to all current + future chapters (~85% of expected per-chapter cost). NULL = not offered.';
comment on column public.series.pre_release_price_usdc is
  'Single early-access price per series, charged to pre-release subscribers on publish. NULL = not offered.';
