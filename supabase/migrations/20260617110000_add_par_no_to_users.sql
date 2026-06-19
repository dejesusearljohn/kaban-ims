begin;

alter table public.users
  add column if not exists par_no text;

update public.users
set par_no = 'PAR-' || upper(btrim(staff_id))
where staff_id is not null
  and btrim(staff_id) <> ''
  and (par_no is null or btrim(par_no) = '');

create unique index if not exists users_par_no_unique_idx
  on public.users (par_no)
  where par_no is not null and btrim(par_no) <> '';

commit;
