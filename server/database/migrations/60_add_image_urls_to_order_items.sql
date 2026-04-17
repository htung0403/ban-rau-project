-- Add image_urls column to import_order_items and vegetable_order_items
ALTER TABLE public.import_order_items ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.vegetable_order_items ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing image_url to image_urls array if present
UPDATE public.import_order_items 
SET image_urls = ARRAY[image_url] 
WHERE image_url IS NOT NULL AND (image_urls IS NULL OR cardinality(image_urls) = 0);

UPDATE public.vegetable_order_items 
SET image_urls = ARRAY[image_url] 
WHERE image_url IS NOT NULL AND (image_urls IS NULL OR cardinality(image_urls) = 0);
