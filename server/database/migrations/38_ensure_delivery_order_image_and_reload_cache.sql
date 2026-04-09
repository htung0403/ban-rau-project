-- Ensure delivery_orders has image_url and refresh PostgREST schema cache
ALTER TABLE public.delivery_orders
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Needed when PostgREST schema cache is stale after ALTER TABLE
NOTIFY pgrst, 'reload schema';
