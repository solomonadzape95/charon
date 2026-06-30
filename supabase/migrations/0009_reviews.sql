create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  rating int,
  message text not null,
  name text,
  email text,
  user_id uuid references public.users(id) on delete set null,
  page text,
  status text not null default 'new'
);
create index if not exists reviews_created_idx on public.reviews(created_at desc);
alter table public.reviews enable row level security;
drop policy if exists "service all" on public.reviews;
create policy "service all" on public.reviews for all to service_role using (true) with check (true);