-- Author announcements — a creator drops a note that their readers see on the
-- series page (and, later, in a followed-series feed). series_id NULL = a
-- creator-wide announcement shown across all their series.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  series_id uuid references public.series(id) on delete cascade,
  title text,
  body text not null
);

create index if not exists announcements_creator_idx on public.announcements(creator_id);
create index if not exists announcements_series_idx on public.announcements(series_id);
