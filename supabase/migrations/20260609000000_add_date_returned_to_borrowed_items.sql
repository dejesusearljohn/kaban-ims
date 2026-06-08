begin;

alter table public.borrowed_items
  add column if not exists date_returned date;

commit;
