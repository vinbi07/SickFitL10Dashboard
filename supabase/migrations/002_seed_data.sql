insert into public.scorecard (metric_name, goal, actual, owner, status)
values
  ('Net New Clients', 10, 8, 'Joey', 'Off Track'),
  ('Weekly Revenue (k)', 120, 130, 'Rena', 'On Track'),
  ('Coach NPS', 65, 62, 'Mike', 'Off Track')
on conflict do nothing;

insert into public.rocks (title, owner, status)
values
  ('Launch Q2 Program Redesign', 'Paden', 'On Track'),
  ('Improve Retention by 8%', 'Krystle', 'Off Track')
on conflict do nothing;

insert into public.issues (title, priority, status, notes, owner)
values
  ('Onboarding drop-off in week 2', 'High', 'IDS', 'Need root-cause review and ownership.', 'Joey'),
  ('Lead response SLA inconsistency', 'Med', 'IDS', 'Decide standard response window for all channels.', 'Rena')
on conflict do nothing;

insert into public.todos (task_description, owner, is_complete)
values
  ('Publish updated client check-in script', 'Mike', false),
  ('Finalize April KPI definitions', 'Krystle', false),
  ('Ship dashboard rollout notes', 'Paden', true)
on conflict do nothing;
