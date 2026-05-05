-- Add donor_identification column to inventory table
ALTER TABLE inventory ADD COLUMN donor_identification TEXT;

COMMENT ON COLUMN inventory.donor_identification IS 'Optional identifier for the donor if the item was donated';
