-- Charon — one-time welcome credit (additive; safe on live data).
-- Makes the new-reader bonus idempotent at the database level so the dev
-- double-render (or any retry) can't grant it twice. Existing readers are
-- marked as already-credited so they don't get a retroactive grant.

alter table public.users
  add column if not exists welcome_credited boolean not null default false;

update public.users set welcome_credited = true where welcome_credited = false;
