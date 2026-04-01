create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'Weekly L10',
  meeting_date date not null default current_date,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  is_closed boolean not null default false,
  health_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_snapshots (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  snapshot_type text not null default 'final' check (snapshot_type in ('interim', 'final')),
  payload jsonb not null default '{}'::jsonb,
  health_score numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  issue_id uuid references public.issues(id) on delete set null,
  rock_id uuid references public.rocks(id) on delete set null,
  title text not null,
  context text not null default '',
  owner text not null check (owner in ('Joey', 'Rena', 'Paden', 'Mike', 'Krystle')),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Implemented')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parking_lot (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  content text not null,
  owner text not null check (owner in ('Joey', 'Rena', 'Paden', 'Mike', 'Krystle')),
  status text not null default 'Open' check (status in ('Open', 'Carried', 'Resolved')),
  related_issue_id uuid references public.issues(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner text not null check (owner in ('Joey', 'Rena', 'Paden', 'Mike', 'Krystle')),
  filter_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  owner text not null check (owner in ('Joey', 'Rena', 'Paden', 'Mike', 'Krystle')),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.calendar_sync_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'google_calendar',
  external_event_id text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  meeting_id uuid references public.meetings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

alter table public.scorecard add column if not exists meeting_id uuid references public.meetings(id) on delete set null;
alter table public.rocks add column if not exists meeting_id uuid references public.meetings(id) on delete set null;
alter table public.issues add column if not exists meeting_id uuid references public.meetings(id) on delete set null;
alter table public.todos add column if not exists meeting_id uuid references public.meetings(id) on delete set null;
alter table public.agenda_items add column if not exists meeting_id uuid references public.meetings(id) on delete set null;
alter table public.meeting_links add column if not exists meeting_id uuid references public.meetings(id) on delete set null;
alter table public.conclude_items add column if not exists meeting_id uuid references public.meetings(id) on delete set null;

alter table public.rocks add column if not exists carryover_count integer not null default 0;
alter table public.todos add column if not exists carryover_count integer not null default 0;
alter table public.issues add column if not exists carryover_count integer not null default 0;

insert into public.meetings (label, meeting_date)
select 'Migration Baseline Meeting', current_date
where not exists (select 1 from public.meetings);

with active_meeting as (
  select id
  from public.meetings
  order by meeting_date desc, created_at desc
  limit 1
)
update public.scorecard
set meeting_id = (select id from active_meeting)
where meeting_id is null;

with active_meeting as (
  select id
  from public.meetings
  order by meeting_date desc, created_at desc
  limit 1
)
update public.rocks
set meeting_id = (select id from active_meeting)
where meeting_id is null;

with active_meeting as (
  select id
  from public.meetings
  order by meeting_date desc, created_at desc
  limit 1
)
update public.issues
set meeting_id = (select id from active_meeting)
where meeting_id is null;

with active_meeting as (
  select id
  from public.meetings
  order by meeting_date desc, created_at desc
  limit 1
)
update public.todos
set meeting_id = (select id from active_meeting)
where meeting_id is null;

with active_meeting as (
  select id
  from public.meetings
  order by meeting_date desc, created_at desc
  limit 1
)
update public.agenda_items
set meeting_id = (select id from active_meeting)
where meeting_id is null;

with active_meeting as (
  select id
  from public.meetings
  order by meeting_date desc, created_at desc
  limit 1
)
update public.meeting_links
set meeting_id = (select id from active_meeting)
where meeting_id is null;

with active_meeting as (
  select id
  from public.meetings
  order by meeting_date desc, created_at desc
  limit 1
)
update public.conclude_items
set meeting_id = (select id from active_meeting)
where meeting_id is null;

create index if not exists scorecard_meeting_id_idx on public.scorecard(meeting_id);
create index if not exists rocks_meeting_id_idx on public.rocks(meeting_id);
create index if not exists issues_meeting_id_idx on public.issues(meeting_id);
create index if not exists todos_meeting_id_idx on public.todos(meeting_id);
create index if not exists agenda_items_meeting_id_idx on public.agenda_items(meeting_id);
create index if not exists meeting_links_meeting_id_idx on public.meeting_links(meeting_id);
create index if not exists conclude_items_meeting_id_idx on public.conclude_items(meeting_id);
create index if not exists meetings_meeting_date_idx on public.meetings(meeting_date);
create index if not exists decisions_meeting_id_idx on public.decisions(meeting_id);
create index if not exists parking_lot_meeting_id_idx on public.parking_lot(meeting_id);
create index if not exists notifications_owner_unread_idx on public.notification_events(owner, is_read);
create index if not exists calendar_sync_starts_at_idx on public.calendar_sync_events(starts_at);

alter publication supabase_realtime add table public.meetings;
alter publication supabase_realtime add table public.meeting_snapshots;
alter publication supabase_realtime add table public.decisions;
alter publication supabase_realtime add table public.parking_lot;
alter publication supabase_realtime add table public.saved_views;
alter publication supabase_realtime add table public.notification_events;
alter publication supabase_realtime add table public.calendar_sync_events;

alter table public.meetings enable row level security;
alter table public.meeting_snapshots enable row level security;
alter table public.decisions enable row level security;
alter table public.parking_lot enable row level security;
alter table public.saved_views enable row level security;
alter table public.notification_events enable row level security;
alter table public.calendar_sync_events enable row level security;

create policy "meetings all" on public.meetings for all using (true) with check (true);
create policy "meeting_snapshots all" on public.meeting_snapshots for all using (true) with check (true);
create policy "decisions all" on public.decisions for all using (true) with check (true);
create policy "parking_lot all" on public.parking_lot for all using (true) with check (true);
create policy "saved_views all" on public.saved_views for all using (true) with check (true);
create policy "notification_events all" on public.notification_events for all using (true) with check (true);
create policy "calendar_sync_events all" on public.calendar_sync_events for all using (true) with check (true);
