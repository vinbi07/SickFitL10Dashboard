alter table public.todos
add column if not exists status text not null default 'Off Track' check (status in ('On Track', 'Off Track'));