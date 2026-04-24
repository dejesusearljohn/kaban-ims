begin;

update public.users
set role = case
  when lower(btrim(role)) = 'staff' then 'Staff'
  when lower(btrim(role)) = 'super admin' then 'Super Admin'
  else role
end
where role is not null
  and lower(btrim(role)) in ('staff', 'super admin');

create or replace function public.normalize_user_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is not null then
    case lower(btrim(new.role))
      when 'staff' then
        new.role := 'Staff';
      when 'super admin' then
        new.role := 'Super Admin';
    end case;
  end if;

  return new;
end;
$$;

drop trigger if exists users_normalize_role on public.users;

create trigger users_normalize_role
before insert or update of role on public.users
for each row
execute function public.normalize_user_role();

commit;
