begin;

alter table public.inventory
  add column if not exists par_no text;

create index if not exists inventory_par_no_idx
  on public.inventory (par_no)
  where par_no is not null and btrim(par_no) <> '';

commit;
