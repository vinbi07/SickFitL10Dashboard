alter table public.sales_week_entries
  add column if not exists referral_partners_added integer not null default 0
  check (referral_partners_added >= 0);
