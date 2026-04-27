begin;

-- Add 'Admin' as a valid value in the users_role_check constraint.
alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role is null or role in ('Staff', 'Admin', 'Super Admin'));

commit;
