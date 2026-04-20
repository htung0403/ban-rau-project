-- Add image_urls (TEXT[]) to delivery_orders and export_orders for multiple image support
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.export_orders ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing image_url to image_urls array if present
UPDATE public.delivery_orders
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND (image_urls IS NULL OR cardinality(image_urls) = 0);

UPDATE public.export_orders
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND (image_urls IS NULL OR cardinality(image_urls) = 0);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
