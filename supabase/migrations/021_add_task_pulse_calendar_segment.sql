insert into public.meeting_format_segments (
  segment_key,
  label,
  duration_minutes,
  sort_order,
  is_enabled
)
values (
  'Task Pulse + Calendar',
  'Task Pulse + Calendar',
  5,
  65,
  true
)
on conflict (segment_key) do nothing;
