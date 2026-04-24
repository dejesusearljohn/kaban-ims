begin;

update public.users
set email = lower(btrim(staff_id)) || '@kaban.com'
where staff_id is not null
  and lower(btrim(role)) <> 'super admin';

create or replace function public.generate_staff_email()
returns trigger
language plpgsql
as $$
begin
  if new.staff_id is not null and lower(btrim(coalesce(new.role, ''))) <> 'super admin' then
    new.email := lower(btrim(new.staff_id)) || '@kaban.com';
  end if;

  return new;
end;
$$;

drop trigger if exists users_generate_staff_email on public.users;

create trigger users_generate_staff_email
before insert or update of staff_id, role on public.users
for each row
execute function public.generate_staff_email();

commit;
