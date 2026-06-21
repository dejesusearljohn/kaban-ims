-- Store remarks captured when a borrowed item is marked as returned.
alter table public.borrowed_items
  add column if not exists return_remarks text;
