-- Charon registry migration — additive, safe to run on top of schema.sql.
-- Adds a verified creator registry so identity becomes a DB lookup (not a guess),
-- plus public-profile fields. Run this in the Supabase SQL editor after schema.sql.

-- creator_identities: distinguish self-registered, ownership-verified rows
-- from live-probe guesses, and hold the one-time bio code during verification.
alter table public.creator_identities
  add column if not exists verified    boolean not null default false,
  add column if not exists verify_code  text;  -- cleared once verified

create index if not exists creator_identities_verified_idx
  on public.creator_identities(platform, handle, verified);

-- creators: public profile surface + a clean URL slug for /c/<slug>.
alter table public.creators
  add column if not exists slug       text unique,
  add column if not exists bio        text,
  add column if not exists avatar_url text,
  add column if not exists registered boolean not null default false;
