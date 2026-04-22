-- Add receipt_image_urls column to import_orders and vegetable_orders
ALTER TABLE public.import_orders ADD COLUMN IF NOT EXISTS receipt_image_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.vegetable_orders ADD COLUMN IF NOT EXISTS receipt_image_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing receipt_image_url to receipt_image_urls array if present
UPDATE public.import_orders 
SET receipt_image_urls = ARRAY[receipt_image_url] 
WHERE receipt_image_url IS NOT NULL AND (receipt_image_urls IS NULL OR cardinality(receipt_image_urls) = 0);

UPDATE public.vegetable_orders 
SET receipt_image_urls = ARRAY[receipt_image_url] 
WHERE receipt_image_url IS NOT NULL AND (receipt_image_urls IS NULL OR cardinality(receipt_image_urls) = 0);
