-- Assign RG-## IDs to existing packed stockpile items (unit PACK).

WITH packed AS (
  SELECT
    item_id,
    ROW_NUMBER() OVER (ORDER BY item_id) AS rn
  FROM public.inventory
  WHERE TRIM(LOWER(COALESCE(unit_of_measure, ''))) = 'pack'
    AND (property_no IS NULL OR TRIM(property_no) = '')
)
UPDATE public.inventory AS inv
SET property_no = 'RG-' || LPAD(packed.rn::text, 2, '0')
FROM packed
WHERE inv.item_id = packed.item_id;
