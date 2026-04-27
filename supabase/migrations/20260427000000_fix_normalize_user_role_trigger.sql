begin;

-- Fix normalize_user_role trigger to handle 'Admin' role (and any future roles)
-- by adding an ELSE branch so unrecognized values are left as-is instead of
-- throwing "case not found".

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
      when 'admin' then
        new.role := 'Admin';
      else
        -- leave the value unchanged
        null;
    end case;
  end if;

  return new;
end;
$$;

commit;
