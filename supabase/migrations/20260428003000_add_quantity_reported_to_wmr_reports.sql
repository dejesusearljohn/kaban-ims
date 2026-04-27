alter table public.wmr_reports
add column if not exists quantity_reported integer;

update public.wmr_reports
set quantity_reported = coalesce(quantity_reported, 1)
where quantity_reported is null;

alter table public.wmr_reports
alter column quantity_reported set default 1;

alter table public.wmr_reports
alter column quantity_reported set not null;

alter table public.wmr_reports
add constraint wmr_reports_quantity_reported_check
check (quantity_reported > 0);
