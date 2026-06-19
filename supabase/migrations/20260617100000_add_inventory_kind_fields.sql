alter table public.inventory
  add column if not exists inventory_kind text,
  add column if not exists item_category text,
  add column if not exists item_description text,
  add column if not exists estimated_useful_life_years integer,
  add column if not exists assigned_to_name text,
  add column if not exists remarks text,
  add column if not exists date_last_restocked date;

comment on column public.inventory.inventory_kind is 'stockpile | par | office_supplies';
