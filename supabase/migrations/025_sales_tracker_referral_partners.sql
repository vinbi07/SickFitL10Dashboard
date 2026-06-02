alter table public.sales_week_entries
  add column if not exists referral_partners_added integer not null default 0
  check (referral_partners_added >= 0);

create table if not exists public.sales_rep_week_goals (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.sales_reps(id) on delete cascade,
  week_start_date date not null,
  referral_partners_goal integer not null default 0 check (referral_partners_goal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rep_id, week_start_date)
);

create index if not exists sales_rep_week_goals_week_start_idx
  on public.sales_rep_week_goals(week_start_date);

create index if not exists sales_rep_week_goals_rep_week_idx
  on public.sales_rep_week_goals(rep_id, week_start_date);

do $$
begin
  alter publication supabase_realtime add table public.sales_rep_week_goals;
exception
  when duplicate_object then null;
end $$;

alter table public.sales_rep_week_goals enable row level security;

create policy "sales_rep_week_goals all"
  on public.sales_rep_week_goals
  for all
  using (true)
  with check (true);
