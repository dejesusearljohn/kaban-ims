-- Add unit_per_price column to inventory table
ALTER TABLE inventory ADD COLUMN unit_per_price NUMERIC(10, 2);

-- Add comment to explain the field
COMMENT ON COLUMN inventory.unit_per_price IS 'The number of units per price point (e.g., 5 units per price)';
