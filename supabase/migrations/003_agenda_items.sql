create table if not exists public.agenda_items (
  id uuid primary key default gen_random_uuid(),
  segment text not null check (segment in ('Segue', 'Headlines')),
  text text not null,
  owner text not null check (owner in ('Joey', 'Rena', 'Paden', 'Mike', 'Krystle')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter publication supabase_realtime add table public.agenda_items;

alter table public.agenda_items enable row level security;

create policy "agenda_items all" on public.agenda_items for all using (true) with check (true);

insert into public.agenda_items (segment, text, owner)
values
  ('Segue', 'One personal win and one work win each.', 'Joey'),
  ('Headlines', 'Top customer headline and top team headline.', 'Rena')
on conflict do nothing;
