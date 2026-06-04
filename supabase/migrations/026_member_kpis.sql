create table if not exists public.member_kpis (
  id uuid primary key default gen_random_uuid(),
  member_name text not null,
  kpi_name text not null,
  description text,
  goal_type text not null default 'Number',
  target_value numeric,
  current_value numeric,
  unit_label text,
  time_period text not null default 'Monthly',
  status text not null default 'On Track',
  notes text,
  wins text,
  blockers text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_kpis_member_name_idx on public.member_kpis (member_name);
create index if not exists member_kpis_status_idx on public.member_kpis (status);
create index if not exists member_kpis_sort_order_idx on public.member_kpis (sort_order, created_at);

alter table public.member_kpis enable row level security;

create policy "Allow all access to member_kpis"
  on public.member_kpis
  for all
  using (true)
  with check (true);
