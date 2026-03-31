-- 1. Create import_order_items table
CREATE TABLE IF NOT EXISTS public.import_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_order_id UUID NOT NULL REFERENCES public.import_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  package_type VARCHAR(50),
  weight_kg NUMERIC(10,2),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,2),
  total_amount NUMERIC(15,2) GENERATED ALWAYS AS (quantity * weight_kg * unit_price) STORED,
  image_url TEXT,
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Migrate existing data from import_orders to import_order_items
INSERT INTO public.import_order_items (
  import_order_id, 
  product_id, 
  package_type, 
  weight_kg, 
  quantity, 
  unit_price,
  payment_status
)
SELECT 
  id, 
  product_id, 
  package_type, 
  weight_kg, 
  quantity, 
  unit_price,
  'unpaid' -- Default for existing
FROM public.import_orders
WHERE product_id IS NOT NULL;

-- 3. Modify import_orders table
-- Make old columns nullable so we can transition
ALTER TABLE public.import_orders ALTER COLUMN sender_name DROP NOT NULL;
ALTER TABLE public.import_orders ALTER COLUMN receiver_name DROP NOT NULL;
ALTER TABLE public.import_orders ALTER COLUMN quantity DROP NOT NULL;

-- 4. Create storage bucket for import-orders if it doesn't exist (handled via SQL for Supabase)
-- Note: Supabase storage buckets are usually managed via UI or API, but we can insert into storage.buckets if needed.
-- For this environment, we'll assume the bucket "import-orders" will be created or exists.
