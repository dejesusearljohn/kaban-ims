-- Normalize inventory/user text to uppercase and align enum-like check constraints.

ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_acquisition_mode_check;
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_status_check;
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_condition_check;

UPDATE public.inventory SET
  item_name = UPPER(TRIM(item_name)),
  item_type = UPPER(TRIM(item_type)),
  item_category = CASE WHEN item_category IS NOT NULL THEN UPPER(TRIM(item_category)) ELSE NULL END,
  item_description = CASE WHEN item_description IS NOT NULL THEN UPPER(TRIM(item_description)) ELSE NULL END,
  assigned_to_name = CASE WHEN assigned_to_name IS NOT NULL THEN UPPER(TRIM(assigned_to_name)) ELSE NULL END,
  remarks = CASE WHEN remarks IS NOT NULL THEN UPPER(TRIM(remarks)) ELSE NULL END,
  condition = CASE WHEN condition IS NOT NULL THEN UPPER(TRIM(condition)) ELSE NULL END,
  acquisition_mode = CASE WHEN acquisition_mode IS NOT NULL THEN UPPER(TRIM(acquisition_mode)) ELSE NULL END,
  donor_identification = CASE WHEN donor_identification IS NOT NULL THEN UPPER(TRIM(donor_identification)) ELSE NULL END,
  unit_of_measure = CASE WHEN unit_of_measure IS NOT NULL THEN UPPER(TRIM(unit_of_measure)) ELSE NULL END,
  status = CASE WHEN status IS NOT NULL THEN UPPER(TRIM(status)) ELSE NULL END,
  property_no = CASE WHEN property_no IS NOT NULL THEN UPPER(TRIM(property_no)) ELSE NULL END,
  par_no = CASE WHEN par_no IS NOT NULL THEN UPPER(TRIM(par_no)) ELSE NULL END;

UPDATE public.users SET
  full_name = UPPER(TRIM(full_name)),
  position = CASE WHEN position IS NOT NULL THEN UPPER(TRIM(position)) ELSE NULL END,
  contact_info = CASE WHEN contact_info IS NOT NULL THEN UPPER(TRIM(contact_info)) ELSE NULL END,
  emergency_contact = CASE WHEN emergency_contact IS NOT NULL THEN UPPER(TRIM(emergency_contact)) ELSE NULL END,
  par_no = CASE WHEN par_no IS NOT NULL THEN UPPER(TRIM(par_no)) ELSE NULL END,
  staff_id = UPPER(TRIM(staff_id));

ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_acquisition_mode_check
  CHECK (
    acquisition_mode IS NULL
    OR acquisition_mode IN ('PURCHASED', 'DONATED')
  );

ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_status_check
  CHECK (
    status IS NULL
    OR status IN (
      'SERVICEABLE',
      'UNSERVICEABLE',
      'VALID',
      'EXPIRED',
      'ARCHIVED',
      'LOW',
      'FULL STOCK',
      'FOR REPAIR',
      'FOR DISPOSAL',
      'DISPOSED'
    )
  );

ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_condition_check
  CHECK (
    condition IS NULL
    OR condition IN ('GOOD', 'FULLY FUNCTIONAL', 'DEFECTIVE')
  );
