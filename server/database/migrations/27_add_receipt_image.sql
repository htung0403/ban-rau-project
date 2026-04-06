-- Add receipt_image_url to import_orders and vegetable_orders
ALTER TABLE public.import_orders 
ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;

ALTER TABLE public.vegetable_orders 
ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;

-- Add image_url to items tables
ALTER TABLE public.import_order_items 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.vegetable_order_items 
ADD COLUMN IF NOT EXISTS image_url TEXT;
