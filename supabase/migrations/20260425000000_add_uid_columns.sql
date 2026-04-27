begin;

create extension if not exists pgcrypto;

alter table public.daily_checks add column if not exists uid uuid;
update public.daily_checks set uid = gen_random_uuid() where uid is null;
alter table public.daily_checks alter column uid set default gen_random_uuid();
alter table public.daily_checks alter column uid set not null;
create unique index if not exists daily_checks_uid_key on public.daily_checks (uid);

alter table public.departments add column if not exists uid uuid;
update public.departments set uid = gen_random_uuid() where uid is null;
alter table public.departments alter column uid set default gen_random_uuid();
alter table public.departments alter column uid set not null;
create unique index if not exists departments_uid_key on public.departments (uid);

alter table public.distribution_logs add column if not exists uid uuid;
update public.distribution_logs set uid = gen_random_uuid() where uid is null;
alter table public.distribution_logs alter column uid set default gen_random_uuid();
alter table public.distribution_logs alter column uid set not null;
create unique index if not exists distribution_logs_uid_key on public.distribution_logs (uid);

alter table public.inventory add column if not exists uid uuid;
update public.inventory set uid = gen_random_uuid() where uid is null;
update public.inventory set qr_code = uid::text;
alter table public.inventory alter column uid set default gen_random_uuid();
alter table public.inventory alter column uid set not null;
create unique index if not exists inventory_uid_key on public.inventory (uid);

alter table public.inventory_photos add column if not exists uid uuid;
update public.inventory_photos set uid = gen_random_uuid() where uid is null;
alter table public.inventory_photos alter column uid set default gen_random_uuid();
alter table public.inventory_photos alter column uid set not null;
create unique index if not exists inventory_photos_uid_key on public.inventory_photos (uid);

alter table public.par_records add column if not exists uid uuid;
update public.par_records set uid = gen_random_uuid() where uid is null;
alter table public.par_records alter column uid set default gen_random_uuid();
alter table public.par_records alter column uid set not null;
create unique index if not exists par_records_uid_key on public.par_records (uid);

alter table public.shift_turnovers add column if not exists uid uuid;
update public.shift_turnovers set uid = gen_random_uuid() where uid is null;
alter table public.shift_turnovers alter column uid set default gen_random_uuid();
alter table public.shift_turnovers alter column uid set not null;
create unique index if not exists shift_turnovers_uid_key on public.shift_turnovers (uid);

alter table public.stockpile add column if not exists uid uuid;
update public.stockpile set uid = gen_random_uuid() where uid is null;
alter table public.stockpile alter column uid set default gen_random_uuid();
alter table public.stockpile alter column uid set not null;
create unique index if not exists stockpile_uid_key on public.stockpile (uid);

alter table public.users add column if not exists uid uuid;
update public.users set uid = gen_random_uuid() where uid is null;
update public.users set qr_code = uid::text;
alter table public.users alter column uid set default gen_random_uuid();
alter table public.users alter column uid set not null;
create unique index if not exists users_uid_key on public.users (uid);

alter table public.vehicle_repairs add column if not exists uid uuid;
update public.vehicle_repairs set uid = gen_random_uuid() where uid is null;
alter table public.vehicle_repairs alter column uid set default gen_random_uuid();
alter table public.vehicle_repairs alter column uid set not null;
create unique index if not exists vehicle_repairs_uid_key on public.vehicle_repairs (uid);

alter table public.vehicles add column if not exists uid uuid;
update public.vehicles set uid = gen_random_uuid() where uid is null;
alter table public.vehicles alter column uid set default gen_random_uuid();
alter table public.vehicles alter column uid set not null;
create unique index if not exists vehicles_uid_key on public.vehicles (uid);

alter table public.wmr_reports add column if not exists uid uuid;
update public.wmr_reports set uid = gen_random_uuid() where uid is null;
alter table public.wmr_reports alter column uid set default gen_random_uuid();
alter table public.wmr_reports alter column uid set not null;
create unique index if not exists wmr_reports_uid_key on public.wmr_reports (uid);

commit;