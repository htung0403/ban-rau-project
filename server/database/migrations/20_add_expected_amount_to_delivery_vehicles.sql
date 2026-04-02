-- migration: Add expected_amount to delivery_vehicles for driver payment collections

-- Add the new column to allow inputting the amount drivers need to collect
ALTER TABLE public.delivery_vehicles 
ADD COLUMN IF NOT EXISTS expected_amount NUMERIC(15,2) DEFAULT 0;

-- Optional: update existing records to 0 if they don't have it (though DEFAULT 0 handles future insertions)
UPDATE public.delivery_vehicles SET expected_amount = 0 WHERE expected_amount IS NULL;

