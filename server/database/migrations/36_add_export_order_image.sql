-- Add image_url column to export_orders for receipt/delivery photos
ALTER TABLE public.export_orders ADD COLUMN IF NOT EXISTS image_url TEXT;
