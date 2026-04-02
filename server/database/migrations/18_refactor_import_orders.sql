-- migration: Refactor Import Orders, Items, and Inventory Management for Vựa Rau

-- 1. Modify import_orders table
ALTER TABLE public.import_orders DROP COLUMN IF EXISTS total_amount CASCADE;
ALTER TABLE public.import_orders DROP COLUMN IF EXISTS package_type CASCADE;
ALTER TABLE public.import_orders DROP COLUMN IF EXISTS weight_kg CASCADE;
ALTER TABLE public.import_orders DROP COLUMN IF EXISTS quantity CASCADE;
ALTER TABLE public.import_orders DROP COLUMN IF EXISTS unit_price CASCADE;

ALTER TABLE public.import_orders ADD COLUMN IF NOT EXISTS license_plate VARCHAR(20);
ALTER TABLE public.import_orders ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100);
ALTER TABLE public.import_orders ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);
ALTER TABLE public.import_orders ADD COLUMN IF NOT EXISTS sheet_number VARCHAR(50);

-- 2. Modify import_order_items table
-- Drop the existing total_amount generated column
ALTER TABLE public.import_order_items DROP COLUMN IF EXISTS total_amount;

-- Add the newly calculated total_amount based ONLY on quantity * unit_price
ALTER TABLE public.import_order_items 
ADD COLUMN total_amount NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED;


