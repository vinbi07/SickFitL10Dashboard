create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  source_table text not null check (source_table in ('rocks', 'todos')),
  source_id uuid not null,
  title text not null,
  owner text not null,
  status text not null,
  due_date date,
  completed_at timestamptz,
  is_complete boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_table, source_id)
);

create index if not exists tasks_owner_idx on public.tasks(owner);
create index if not exists tasks_due_date_idx on public.tasks(due_date);
create index if not exists tasks_is_archived_idx on public.tasks(is_archived);

alter table public.tasks enable row level security;

create policy "tasks all" on public.tasks for all using (true) with check (true);

insert into public.tasks (
  source_table,
  source_id,
  title,
  owner,
  status,
  due_date,
  completed_at,
  is_complete,
  is_archived,
  created_at,
  updated_at
)
select
  'rocks',
  r.id,
  r.title,
  r.owner,
  case when r.status = 'On Track' then 'on_track' else 'off_track' end,
  r.due_date,
  null,
  false,
  coalesce(r.is_archived, false),
  r.created_at,
  r.updated_at
from public.rocks r
on conflict (source_table, source_id) do update set
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  due_date = excluded.due_date,
  is_archived = excluded.is_archived,
  updated_at = excluded.updated_at;

insert into public.tasks (
  source_table,
  source_id,
  title,
  owner,
  status,
  due_date,
  completed_at,
  is_complete,
  is_archived,
  created_at,
  updated_at
)
select
  'todos',
  t.id,
  t.task_description,
  t.owner,
  case when t.is_complete then 'completed' else 'in_progress' end,
  t.due_date,
  null,
  t.is_complete,
  coalesce(t.is_archived, false),
  t.created_at,
  t.updated_at
from public.todos t
on conflict (source_table, source_id) do update set
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  due_date = excluded.due_date,
  is_complete = excluded.is_complete,
  is_archived = excluded.is_archived,
  updated_at = excluded.updated_at;

create table if not exists public.task_audit_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  changed_by text,
  old_status text,
  new_status text,
  old_due_date date,
  new_due_date date,
  created_at timestamptz not null default now()
);

create index if not exists task_audit_log_task_id_idx on public.task_audit_log(task_id);
create index if not exists task_audit_log_created_at_idx on public.task_audit_log(created_at desc);

alter table public.task_audit_log enable row level security;

create policy "task_audit_log read all" on public.task_audit_log for select using (true);

insert into public.task_audit_log (
  task_id,
  changed_by,
  old_status,
  new_status,
  old_due_date,
  new_due_date,
  created_at
)
select
  t.id,
  null,
  null,
  t.status,
  null,
  t.due_date,
  t.created_at
from public.tasks t
where not exists (
  select 1
  from public.task_audit_log log
  where log.task_id = t.id
);

create or replace function public.sync_task_row()
returns trigger
language plpgsql
as $$
declare
  v_task_status text;
  v_task_title text;
  v_is_complete boolean;
  v_completed_at timestamptz;
begin
  if tg_table_name = 'rocks' then
    v_task_status := case when new.status = 'On Track' then 'on_track' else 'off_track' end;
    v_task_title := new.title;
    v_is_complete := false;
    v_completed_at := null;
  elsif tg_table_name = 'todos' then
    v_task_status := case when new.is_complete then 'completed' else 'in_progress' end;
    v_task_title := new.task_description;
    v_is_complete := coalesce(new.is_complete, false);
    v_completed_at := case when new.is_complete then new.updated_at else null end;
  else
    raise exception 'Unsupported task source: %', tg_table_name;
  end if;

  insert into public.tasks (
    source_table,
    source_id,
    title,
    owner,
    status,
    due_date,
    completed_at,
    is_complete,
    is_archived,
    created_at,
    updated_at
  )
  values (
    tg_table_name,
    new.id,
    v_task_title,
    new.owner,
    v_task_status,
    new.due_date,
    v_completed_at,
    v_is_complete,
    coalesce(new.is_archived, false),
    new.created_at,
    new.updated_at
  )
  on conflict (source_table, source_id) do update set
    title = excluded.title,
    owner = excluded.owner,
    status = excluded.status,
    due_date = excluded.due_date,
    completed_at = excluded.completed_at,
    is_complete = excluded.is_complete,
    is_archived = excluded.is_archived,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

create or replace function public.log_task_audit_change()
returns trigger
language plpgsql
as $$
declare
  v_task_id uuid;
  v_old_status text;
  v_new_status text;
  v_old_due_date date;
  v_new_due_date date;
begin
  if tg_table_name = 'rocks' then
    select id into v_task_id
    from public.tasks
    where source_table = 'rocks' and source_id = old.id;

    v_old_status := case when old.status = 'On Track' then 'on_track' else 'off_track' end;
    v_new_status := case when new.status = 'On Track' then 'on_track' else 'off_track' end;
    v_old_due_date := old.due_date;
    v_new_due_date := new.due_date;
  elsif tg_table_name = 'todos' then
    select id into v_task_id
    from public.tasks
    where source_table = 'todos' and source_id = old.id;

    v_old_status := case when old.is_complete then 'completed' else 'in_progress' end;
    v_new_status := case when new.is_complete then 'completed' else 'in_progress' end;
    v_old_due_date := old.due_date;
    v_new_due_date := new.due_date;
  else
    raise exception 'Unsupported task source: %', tg_table_name;
  end if;

  if v_task_id is null then
    return new;
  end if;

  if v_old_status is distinct from v_new_status or v_old_due_date is distinct from v_new_due_date then
    insert into public.task_audit_log (
      task_id,
      changed_by,
      old_status,
      new_status,
      old_due_date,
      new_due_date
    )
    values (
      v_task_id,
      coalesce(current_setting('request.jwt.claim.email', true), current_setting('request.jwt.claim.sub', true)),
      v_old_status,
      v_new_status,
      v_old_due_date,
      v_new_due_date
    );
  end if;

  return new;
end;
$$;

create or replace function public.log_task_audit_initial()
returns trigger
language plpgsql
as $$
declare
  v_task_id uuid;
  v_task_status text;
  v_task_due_date date;
begin
  if tg_table_name = 'rocks' then
    select id, status, due_date into v_task_id, v_task_status, v_task_due_date
    from public.tasks
    where source_table = 'rocks' and source_id = new.id;
  elsif tg_table_name = 'todos' then
    select id, status, due_date into v_task_id, v_task_status, v_task_due_date
    from public.tasks
    where source_table = 'todos' and source_id = new.id;
  else
    raise exception 'Unsupported task source: %', tg_table_name;
  end if;

  if v_task_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.task_audit_log log
    where log.task_id = v_task_id
  ) then
    insert into public.task_audit_log (
      task_id,
      changed_by,
      old_status,
      new_status,
      old_due_date,
      new_due_date,
      created_at
    )
    values (
      v_task_id,
      coalesce(current_setting('request.jwt.claim.email', true), current_setting('request.jwt.claim.sub', true)),
      null,
      v_task_status,
      null,
      v_task_due_date,
      new.created_at
    );
  end if;

  return new;
end;
$$;

drop trigger if exists sync_rocks_task_row on public.rocks;
create trigger sync_rocks_task_row
after insert or update on public.rocks
for each row execute function public.sync_task_row();

drop trigger if exists sync_todos_task_row on public.todos;
create trigger sync_todos_task_row
after insert or update on public.todos
for each row execute function public.sync_task_row();

drop trigger if exists audit_rocks_task_changes on public.rocks;
create trigger audit_rocks_task_changes
after update on public.rocks
for each row execute function public.log_task_audit_change();

drop trigger if exists audit_rocks_task_initial on public.rocks;
create trigger audit_rocks_task_initial
after insert on public.rocks
for each row execute function public.log_task_audit_initial();

drop trigger if exists audit_todos_task_changes on public.todos;
create trigger audit_todos_task_changes
after update on public.todos
for each row execute function public.log_task_audit_change();

drop trigger if exists audit_todos_task_initial on public.todos;
create trigger audit_todos_task_initial
after insert on public.todos
for each row execute function public.log_task_audit_initial();

create or replace view public.task_health_summary as
with audit_rollup as (
  select
    task_id,
    count(*) as audit_count,
    min(created_at) as first_audited_at,
    max(created_at) as last_audited_at
  from public.task_audit_log
  group by task_id
)
select
  t.id as task_id,
  t.source_table,
  t.source_id,
  t.title,
  t.owner,
  t.status,
  t.due_date,
  t.completed_at,
  coalesce(a.audit_count, 0) as audit_count,
  case
    when t.status = 'completed' and t.completed_at is not null and t.due_date is not null and t.completed_at::date <= t.due_date then 'green'
    when t.status = 'in_progress' and t.due_date is not null and t.due_date <= (current_date + 2) then 'yellow'
    when t.status = 'overdue' or coalesce(a.audit_count, 0) > 1 then 'red'
    else 'yellow'
  end as health_color,
  case
    when t.status = 'completed' and t.completed_at is not null and t.due_date is not null and t.completed_at::date <= t.due_date then 'completed-on-time'
    when t.status = 'in_progress' and t.due_date is not null and t.due_date <= (current_date + 2) then 'due-soon'
    when t.status = 'overdue' or coalesce(a.audit_count, 0) > 1 then 'delayed'
    else 'watch'
  end as health_reason,
  a.first_audited_at,
  a.last_audited_at
from public.tasks t
left join audit_rollup a on a.task_id = t.id;

create or replace view public.member_performance_metrics as
select
  owner,
  count(*) filter (where health_color = 'green') as green_tasks,
  count(*) filter (where health_color = 'red') as red_tasks,
  case
    when count(*) filter (where health_color = 'red') = 0 then count(*) filter (where health_color = 'green')::numeric
    else round((count(*) filter (where health_color = 'green')::numeric / nullif(count(*) filter (where health_color = 'red')::numeric, 0)), 2)
  end as green_to_red_ratio
from public.task_health_summary
group by owner;
