-- Make meeting duration first-class and canonical.
-- This migration keeps started_at/ended_at for backward compatibility.

alter table public.meetings
add column if not exists total_duration_seconds integer;

-- Backfill duration from existing timestamps where possible.
update public.meetings
set total_duration_seconds = greatest(
  floor(extract(epoch from (ended_at - started_at)))::integer,
  0
)
where total_duration_seconds is null
  and ended_at is not null
  and started_at is not null;

-- Ensure all rows have a value even when timestamps are missing.
update public.meetings
set total_duration_seconds = 0
where total_duration_seconds is null;

alter table public.meetings
alter column total_duration_seconds set default 0;

alter table public.meetings
alter column total_duration_seconds set not null;

alter table public.meetings
drop constraint if exists meetings_total_duration_seconds_non_negative;

alter table public.meetings
add constraint meetings_total_duration_seconds_non_negative
check (total_duration_seconds >= 0);
