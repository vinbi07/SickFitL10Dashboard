create table if not exists public.meeting_links (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  owner text not null check (owner in ('Joey', 'Rena', 'Paden', 'Mike', 'Krystle')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter publication supabase_realtime add table public.meeting_links;

alter table public.meeting_links enable row level security;

create policy "meeting_links all" on public.meeting_links for all using (true) with check (true);
