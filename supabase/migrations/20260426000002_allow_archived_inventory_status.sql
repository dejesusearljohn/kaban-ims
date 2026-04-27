DO $$
DECLARE
  constraint_def TEXT;
  inner_expr TEXT;
  updated_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid)
  INTO constraint_def
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'inventory'
    AND c.conname = 'inventory_status_check';

  IF constraint_def IS NULL THEN
    RAISE NOTICE 'Constraint public.inventory.inventory_status_check not found; skipping.';
    RETURN;
  END IF;

  IF constraint_def ILIKE '%''Archived''%' THEN
    RAISE NOTICE 'Archived is already allowed by inventory_status_check; no changes made.';
    RETURN;
  END IF;

  inner_expr := regexp_replace(
    constraint_def,
    '^CHECK\\s*\\((.*)\\)\\s*$',
    '\\1'
  );

  updated_def := format(
    'CHECK ((%s) OR ((status)::text = ''Archived''::text))',
    inner_expr
  );

  EXECUTE 'ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_status_check';
  EXECUTE format(
    'ALTER TABLE public.inventory ADD CONSTRAINT inventory_status_check %s',
    updated_def
  );
END
$$;