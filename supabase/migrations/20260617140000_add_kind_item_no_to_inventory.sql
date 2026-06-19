-- Per-kind display sequence (STOCK-001, SUP-001, etc.) independent of global item_id.

ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS kind_item_no integer;

WITH resolved AS (
  SELECT
    item_id,
    COALESCE(
      inventory_kind,
      CASE
        WHEN item_type ILIKE 'stockpile' THEN 'stockpile'
        WHEN item_type ILIKE 'office supplies' THEN 'office_supplies'
        ELSE 'par'
      END
    ) AS kind
  FROM public.inventory
),
ranked AS (
  SELECT
    item_id,
    ROW_NUMBER() OVER (PARTITION BY kind ORDER BY item_id) AS rn
  FROM resolved
)
UPDATE public.inventory AS inv
SET kind_item_no = ranked.rn
FROM ranked
WHERE inv.item_id = ranked.item_id
  AND inv.kind_item_no IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_kind_item_no_unique
  ON public.inventory (inventory_kind, kind_item_no)
  WHERE kind_item_no IS NOT NULL AND inventory_kind IS NOT NULL;

COMMENT ON COLUMN public.inventory.kind_item_no IS 'Sequential display number within inventory_kind (e.g. STOCK-001, SUP-001).';
