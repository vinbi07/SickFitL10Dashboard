alter table public.meetings
add column if not exists total_duration_seconds integer not null default 0;
