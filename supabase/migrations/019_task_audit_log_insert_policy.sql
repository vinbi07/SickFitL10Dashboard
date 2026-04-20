alter table public.task_audit_log enable row level security;

drop policy if exists "task_audit_log insert all" on public.task_audit_log;
create policy "task_audit_log insert all" on public.task_audit_log
  for insert
  with check (true);
