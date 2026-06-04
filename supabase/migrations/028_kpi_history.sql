-- Append-only history log for member KPI progress updates.
-- One row is inserted each time current_value changes (manual or sync).
-- "source" distinguishes manual updates from automated sync writes.
create table if not exists public.kpi_history (
  id             uuid primary key default gen_random_uuid(),
  kpi_id         uuid not null references public.member_kpis(id) on delete cascade,
  recorded_value numeric,
  status         text not null,
  source         text not null default 'manual',  -- 'manual' | 'sync'
  created_at     timestamptz not null default now()
);

create index if not exists kpi_history_kpi_id_idx on public.kpi_history(kpi_id, created_at desc);

alter table public.kpi_history enable row level security;

create policy "kpi_history read all"
  on public.kpi_history for select
  using (true);

create policy "kpi_history insert all"
  on public.kpi_history for insert
  with check (true);
