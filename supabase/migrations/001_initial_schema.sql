create extension if not exists "pgcrypto";

create table if not exists public.scorecard (
  id uuid primary key default gen_random_uuid(),
  metric_name text not null,
  goal numeric not null default 0,
  actual numeric not null default 0,
  owner text not null check (owner in ('Joey', 'Rena', 'Paden', 'Mike', 'Krystle')),
  status text not null default 'On Track' check (status in ('On Track', 'Off Track')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rocks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner text not null check (owner in ('Joey', 'Rena', 'Paden', 'Mike', 'Krystle')),
  status text not null default 'On Track' check (status in ('On Track', 'Off Track')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  priority text not null default 'Med' check (priority in ('High', 'Med', 'Low')),
  status text not null default 'IDS' check (status in ('IDS', 'Solved', 'Tabled')),
  notes text not null default '',
  owner text not null check (owner in ('Joey', 'Rena', 'Paden', 'Mike', 'Krystle')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  task_description text not null,
  owner text not null check (owner in ('Joey', 'Rena', 'Paden', 'Mike', 'Krystle')),
  is_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.issue_comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  comment text not null,
  owner text not null check (owner in ('Joey', 'Rena', 'Paden', 'Mike', 'Krystle')),
  created_at timestamptz not null default now()
);

alter publication supabase_realtime add table public.scorecard;
alter publication supabase_realtime add table public.rocks;
alter publication supabase_realtime add table public.issues;
alter publication supabase_realtime add table public.todos;
alter publication supabase_realtime add table public.issue_comments;

alter table public.scorecard enable row level security;
alter table public.rocks enable row level security;
alter table public.issues enable row level security;
alter table public.todos enable row level security;
alter table public.issue_comments enable row level security;

create policy "scorecard all" on public.scorecard for all using (true) with check (true);
create policy "rocks all" on public.rocks for all using (true) with check (true);
create policy "issues all" on public.issues for all using (true) with check (true);
create policy "todos all" on public.todos for all using (true) with check (true);
create policy "issue_comments all" on public.issue_comments for all using (true) with check (true);
