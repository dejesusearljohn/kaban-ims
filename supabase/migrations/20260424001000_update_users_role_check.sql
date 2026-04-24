begin;

update public.users
set role = case
  when lower(btrim(role)) = 'staff' then 'Staff'
  when lower(btrim(role)) = 'super admin' then 'Super Admin'
  else role
end
where role is not null;

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role is null or role in ('Staff', 'Super Admin'));

commit;