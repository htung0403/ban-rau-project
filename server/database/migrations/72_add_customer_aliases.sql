-- Add customer aliases and selected_alias for import/vegetable orders
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.import_orders ADD COLUMN IF NOT EXISTS selected_alias TEXT;
ALTER TABLE public.vegetable_orders ADD COLUMN IF NOT EXISTS selected_alias TEXT;