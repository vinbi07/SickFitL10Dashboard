create table if not exists public.meeting_format_segments (
  id uuid primary key default gen_random_uuid(),
  segment_key text not null unique,
  label text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  sort_order integer not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.meeting_format_segments (segment_key, label, duration_minutes, sort_order, is_enabled)
values
  ('Segue', 'Segue', 5, 10, true),
  ('Scorecard', 'Scorecard', 5, 20, true),
  ('Rocks', 'What''s This Week', 5, 30, true),
  ('Headlines', 'Headlines', 5, 40, true),
  ('Links', 'Links', 10, 50, true),
  ('To-Dos', 'Backlog / What to Expect', 5, 60, true),
  ('IDS', 'IDS', 60, 70, true),
  ('Conclude', 'Conclude', 5, 80, true)
on conflict (segment_key) do nothing;

create index if not exists meeting_format_segments_sort_idx
  on public.meeting_format_segments(sort_order);

alter publication supabase_realtime add table public.meeting_format_segments;

alter table public.meeting_format_segments enable row level security;

create policy "meeting_format_segments all"
  on public.meeting_format_segments
  for all
  using (true)
  with check (true);
