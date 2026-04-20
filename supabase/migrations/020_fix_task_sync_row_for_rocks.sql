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
