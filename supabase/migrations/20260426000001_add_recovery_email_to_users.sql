alter table public.users
  add column if not exists recovery_email text null;
