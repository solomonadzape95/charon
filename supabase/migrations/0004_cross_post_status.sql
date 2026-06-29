-- Charon — cross-post status tracking (additive; safe on live data).
-- Records where each chapter has been manually cross-posted.

create table if not exists public.cross_post_status (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  platform text not null,                 -- royalroad | scribblehub | wattpad | webnovel
  posted boolean not null default false,
  posted_at timestamptz,
  external_url text,
  unique (chapter_id, platform)
);
create index if not exists cross_post_chapter_idx on public.cross_post_status(chapter_id);

alter table public.cross_post_status enable row level security;
drop policy if exists "public read" on public.cross_post_status;
create policy "public read" on public.cross_post_status for select using (true);
drop policy if exists "service write" on public.cross_post_status;
create policy "service write" on public.cross_post_status for all to service_role using (true) with check (true);
