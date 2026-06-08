ALTER TABLE public.daily_check_items
ADD COLUMN IF NOT EXISTS quantity_checked INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.daily_check_items
DROP CONSTRAINT IF EXISTS daily_check_items_condition_check;

UPDATE public.daily_check_items
SET condition = CASE
  WHEN condition = 'serviceable' THEN 'good'
  WHEN condition = 'unserviceable' THEN 'defective'
  ELSE condition
END
WHERE condition IN ('serviceable', 'unserviceable');

ALTER TABLE public.daily_check_items
ADD CONSTRAINT daily_check_items_condition_check
CHECK (condition IN ('good', 'defective', 'missing', 'used', 'increased'));

ALTER TABLE public.daily_check_items
DROP CONSTRAINT IF EXISTS daily_check_items_quantity_checked_check;

ALTER TABLE public.daily_check_items
ADD CONSTRAINT daily_check_items_quantity_checked_check
CHECK (quantity_checked > 0);
