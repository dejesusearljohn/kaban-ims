alter table public.vehicles
  add column if not exists vehicle_name text,
  add column if not exists color text;

update public.vehicles
set vehicle_name = trim(make_model)
where vehicle_name is null
  and make_model is not null
  and length(trim(make_model)) > 0;
