create table if not exists public.conclude_items (
  id uuid primary key default gen_random_uuid(),
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter publication supabase_realtime add table public.conclude_items;

alter table public.conclude_items enable row level security;

create policy "conclude_items all" on public.conclude_items for all using (true) with check (true);
