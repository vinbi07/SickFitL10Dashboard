-- Add target_direction to member_kpis.
-- "higher" (default) means higher current value is better (current / target).
-- "lower" means lower current value is better, e.g. LCP, load time (target / current).
alter table public.member_kpis
  add column if not exists target_direction text not null default 'higher';
