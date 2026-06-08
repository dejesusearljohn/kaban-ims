-- Add vehicle information fields for asset tracking
-- Adds: classification, account_code, property_number, plate_number, description, estimated_useful_life_years, depreciation_rate

ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS classification text,
ADD COLUMN IF NOT EXISTS account_code text,
ADD COLUMN IF NOT EXISTS property_number text,
ADD COLUMN IF NOT EXISTS plate_number text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS estimated_useful_life_years integer,
ADD COLUMN IF NOT EXISTS depreciation_rate numeric;

-- Add comments for documentation
COMMENT ON COLUMN public.vehicles.classification IS 'Vehicle classification (e.g., Pick-up / Double Cab)';
COMMENT ON COLUMN public.vehicles.account_code IS 'Account code for accounting/budgeting purposes (e.g., 1-07-06-010)';
COMMENT ON COLUMN public.vehicles.property_number IS 'Property identification number (e.g., VEH-PT01)';
COMMENT ON COLUMN public.vehicles.plate_number IS 'License plate number (e.g., U21346)';
COMMENT ON COLUMN public.vehicles.description IS 'Detailed description of the vehicle and its purpose';
COMMENT ON COLUMN public.vehicles.estimated_useful_life_years IS 'Estimated useful life in years for depreciation';
COMMENT ON COLUMN public.vehicles.depreciation_rate IS 'Annual depreciation rate as percentage';
