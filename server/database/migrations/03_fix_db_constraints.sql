-- 1. Remove package_type restriction from import_orders
-- This check constraint was preventing units like 'kg' or 'bịch' from being saved.
ALTER TABLE public.import_orders DROP CONSTRAINT IF EXISTS import_orders_package_type_check;

-- 2. Make item_name nullable in export_orders
-- We now use product_id, so item_name is optional.
ALTER TABLE public.export_orders ALTER COLUMN item_name DROP NOT NULL;

-- 3. Ensure warehouse_id exists on export_orders
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='export_orders' AND column_name='warehouse_id') THEN
        ALTER TABLE public.export_orders ADD COLUMN warehouse_id UUID REFERENCES public.warehouses(id);
    END IF;
END $$;
