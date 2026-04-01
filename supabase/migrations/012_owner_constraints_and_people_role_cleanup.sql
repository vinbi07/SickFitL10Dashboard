alter table public.people
drop column if exists department;

-- Drop restrictive owner enum-style checks so assignees can come from dynamic people rows.
alter table public.scorecard drop constraint if exists scorecard_owner_check;
alter table public.rocks drop constraint if exists rocks_owner_check;
alter table public.issues drop constraint if exists issues_owner_check;
alter table public.todos drop constraint if exists todos_owner_check;
alter table public.issue_comments drop constraint if exists issue_comments_owner_check;
alter table public.agenda_items drop constraint if exists agenda_items_owner_check;
alter table public.meeting_links drop constraint if exists meeting_links_owner_check;
alter table public.decisions drop constraint if exists decisions_owner_check;
alter table public.parking_lot drop constraint if exists parking_lot_owner_check;
alter table public.saved_views drop constraint if exists saved_views_owner_check;
alter table public.notification_events drop constraint if exists notification_events_owner_check;

alter table public.scorecard add constraint scorecard_owner_not_empty_check check (length(trim(owner)) > 0);
alter table public.rocks add constraint rocks_owner_not_empty_check check (length(trim(owner)) > 0);
alter table public.issues add constraint issues_owner_not_empty_check check (length(trim(owner)) > 0);
alter table public.todos add constraint todos_owner_not_empty_check check (length(trim(owner)) > 0);
alter table public.issue_comments add constraint issue_comments_owner_not_empty_check check (length(trim(owner)) > 0);
alter table public.agenda_items add constraint agenda_items_owner_not_empty_check check (length(trim(owner)) > 0);
alter table public.meeting_links add constraint meeting_links_owner_not_empty_check check (length(trim(owner)) > 0);
alter table public.decisions add constraint decisions_owner_not_empty_check check (length(trim(owner)) > 0);
alter table public.parking_lot add constraint parking_lot_owner_not_empty_check check (length(trim(owner)) > 0);
alter table public.saved_views add constraint saved_views_owner_not_empty_check check (length(trim(owner)) > 0);
alter table public.notification_events add constraint notification_events_owner_not_empty_check check (length(trim(owner)) > 0);
