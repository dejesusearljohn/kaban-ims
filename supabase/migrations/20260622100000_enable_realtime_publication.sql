-- Enable Supabase Realtime for tables used by the KABAN app.

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'inventory',
    'inventory_photos',
    'borrowed_items',
    'wmr_reports',
    'vehicles',
    'vehicle_repairs',
    'par_records',
    'users',
    'departments',
    'distribution_logs',
    'accountability_reports',
    'shift_turnovers',
    'daily_checks',
    'daily_check_items',
    'stockpile'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;
