create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  username text not null unique,
  email text not null unique,
  role text not null default 'Member',
  department text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists people_username_idx on public.people(username);
create index if not exists people_email_idx on public.people(email);
create index if not exists people_is_active_idx on public.people(is_active);

alter publication supabase_realtime add table public.people;

alter table public.people enable row level security;

create policy "people all" on public.people for all using (true) with check (true);
