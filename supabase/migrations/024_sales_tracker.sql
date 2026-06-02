create table if not exists public.sales_reps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  daily_goal numeric not null default 0 check (daily_goal >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_week_entries (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.sales_reps(id) on delete cascade,
  week_start_date date not null,
  entry_date date not null,
  day_index integer not null check (day_index between 0 and 6),
  amount numeric check (amount is null or amount >= 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rep_id, week_start_date, day_index)
);

create index if not exists sales_reps_active_sort_idx
  on public.sales_reps(is_active, sort_order, created_at);

create index if not exists sales_week_entries_week_start_idx
  on public.sales_week_entries(week_start_date);

create index if not exists sales_week_entries_rep_week_idx
  on public.sales_week_entries(rep_id, week_start_date);

do $$
begin
  alter publication supabase_realtime add table public.sales_reps;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.sales_week_entries;
exception
  when duplicate_object then null;
end $$;

alter table public.sales_reps enable row level security;
alter table public.sales_week_entries enable row level security;

create policy "sales_reps all"
  on public.sales_reps
  for all
  using (true)
  with check (true);

create policy "sales_week_entries all"
  on public.sales_week_entries
  for all
  using (true)
  with check (true);

insert into public.sales_reps (name, daily_goal, sort_order)
select name, daily_goal, sort_order
from (
  values
    ('JoJo', 500, 0),
    ('Rena', 750, 1)
) as seed(name, daily_goal, sort_order)
where not exists (select 1 from public.sales_reps);
