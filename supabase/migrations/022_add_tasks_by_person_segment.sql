insert into public.meeting_format_segments (
  segment_key,
  label,
  duration_minutes,
  sort_order,
  is_enabled
)
values (
  'Tasks by Person',
  'Tasks by Person',
  5,
  64,
  true
)
on conflict (segment_key) do nothing;
