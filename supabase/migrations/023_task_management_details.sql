create table if not exists public.task_details (
  id uuid primary key default gen_random_uuid(),
  source_table text not null check (source_table in ('rocks', 'todos')),
  source_id uuid not null,
  description text not null default '',
  notes text not null default '',
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  status text not null default 'Todo' check (status in ('Todo', 'In Progress', 'Review', 'Completed')),
  estimate_minutes integer check (estimate_minutes is null or estimate_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_table, source_id)
);

create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_detail_id uuid not null references public.task_details(id) on delete cascade,
  title text not null,
  is_complete boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_labels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#64748b' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_label_assignments (
  id uuid primary key default gen_random_uuid(),
  task_detail_id uuid not null references public.task_details(id) on delete cascade,
  label_id uuid not null references public.task_labels(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_detail_id, label_id)
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_detail_id uuid not null references public.task_details(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_detail_id uuid not null references public.task_details(id) on delete cascade,
  name text not null,
  url text not null,
  file_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.task_links (
  id uuid primary key default gen_random_uuid(),
  task_detail_id uuid not null references public.task_details(id) on delete cascade,
  title text,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists task_details_source_idx
  on public.task_details(source_table, source_id);

create index if not exists task_subtasks_task_detail_id_idx
  on public.task_subtasks(task_detail_id);

create index if not exists task_label_assignments_task_detail_id_idx
  on public.task_label_assignments(task_detail_id);

create index if not exists task_comments_task_detail_id_created_at_idx
  on public.task_comments(task_detail_id, created_at desc);

create index if not exists task_attachments_task_detail_id_idx
  on public.task_attachments(task_detail_id);

create index if not exists task_links_task_detail_id_idx
  on public.task_links(task_detail_id);

alter publication supabase_realtime add table public.task_details;
alter publication supabase_realtime add table public.task_subtasks;
alter publication supabase_realtime add table public.task_labels;
alter publication supabase_realtime add table public.task_label_assignments;
alter publication supabase_realtime add table public.task_comments;
alter publication supabase_realtime add table public.task_attachments;
alter publication supabase_realtime add table public.task_links;

alter table public.task_details enable row level security;
alter table public.task_subtasks enable row level security;
alter table public.task_labels enable row level security;
alter table public.task_label_assignments enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.task_links enable row level security;

create policy "task_details all"
  on public.task_details
  for all
  using (true)
  with check (true);

create policy "task_subtasks all"
  on public.task_subtasks
  for all
  using (true)
  with check (true);

create policy "task_labels all"
  on public.task_labels
  for all
  using (true)
  with check (true);

create policy "task_label_assignments all"
  on public.task_label_assignments
  for all
  using (true)
  with check (true);

create policy "task_comments all"
  on public.task_comments
  for all
  using (true)
  with check (true);

create policy "task_attachments all"
  on public.task_attachments
  for all
  using (true)
  with check (true);

create policy "task_links all"
  on public.task_links
  for all
  using (true)
  with check (true);

insert into public.task_labels (name, color)
values
  ('Priority', '#e72027'),
  ('Backlog', '#64748b'),
  ('Blocked', '#be123c'),
  ('Follow up', '#2563eb')
on conflict (name) do nothing;
