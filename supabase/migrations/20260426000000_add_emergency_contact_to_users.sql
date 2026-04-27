alter table public.users
  add column if not exists emergency_contact text null;
