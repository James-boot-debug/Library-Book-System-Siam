-- Library QR Finder database schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  isbn text,
  category text,
  description text,
  cover_url text,
  total_copies integer not null default 1 check (total_copies >= 0),
  available_copies integer not null default 1 check (available_copies >= 0 and available_copies <= total_copies),
  floor text not null,
  section text not null,
  shelf text not null,
  row_label text,
  position_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_requests (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  requester_name text not null,
  requester_email text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists books_title_idx on public.books using gin (to_tsvector('english', title || ' ' || author || ' ' || coalesce(category, '')));
create index if not exists requests_status_idx on public.book_requests(status, created_at desc);
create index if not exists announcements_created_idx on public.announcements(created_at desc);

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.book_requests enable row level security;
alter table public.announcements enable row level security;

-- Helper checks the signed-in user's profile role.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Profiles: users can read their own profile; admins can manage profiles.
drop policy if exists "read own profile or admin" on public.profiles;
create policy "read own profile or admin" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "admin manages profiles" on public.profiles;
create policy "admin manages profiles" on public.profiles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Books: public catalogue read; only admins can write.
drop policy if exists "public reads books" on public.books;
create policy "public reads books" on public.books
for select to anon, authenticated using (true);

drop policy if exists "admin inserts books" on public.books;
create policy "admin inserts books" on public.books
for insert to authenticated with check (public.is_admin());

drop policy if exists "admin updates books" on public.books;
create policy "admin updates books" on public.books
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin deletes books" on public.books;
create policy "admin deletes books" on public.books
for delete to authenticated using (public.is_admin());

-- Anyone may submit a request. Only admins can read/change requests.
drop policy if exists "public submits requests" on public.book_requests;
create policy "public submits requests" on public.book_requests
for insert to anon, authenticated
with check (
  length(trim(requester_name)) between 2 and 100
  and length(trim(requester_email)) between 5 and 254
);

drop policy if exists "admin reads requests" on public.book_requests;
create policy "admin reads requests" on public.book_requests
for select to authenticated using (public.is_admin());

drop policy if exists "admin updates requests" on public.book_requests;
create policy "admin updates requests" on public.book_requests
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin deletes requests" on public.book_requests;
create policy "admin deletes requests" on public.book_requests
for delete to authenticated using (public.is_admin());

-- Public can read published announcements; admins manage all.
drop policy if exists "public reads published announcements" on public.announcements;
create policy "public reads published announcements" on public.announcements
for select to anon, authenticated using (published = true or public.is_admin());

drop policy if exists "admin inserts announcements" on public.announcements;
create policy "admin inserts announcements" on public.announcements
for insert to authenticated with check (public.is_admin());

drop policy if exists "admin updates announcements" on public.announcements;
create policy "admin updates announcements" on public.announcements
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin deletes announcements" on public.announcements;
create policy "admin deletes announcements" on public.announcements
for delete to authenticated using (public.is_admin());

grant select on public.books, public.announcements to anon, authenticated;
grant insert on public.book_requests to anon, authenticated;
grant select, insert, update, delete on public.books, public.book_requests, public.announcements, public.profiles to authenticated;
