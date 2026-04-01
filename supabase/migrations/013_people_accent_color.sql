alter table public.people
add column if not exists accent_color text not null default '#ef4444';

update public.people
set accent_color = '#ef4444'
where accent_color is null or length(trim(accent_color)) = 0;
