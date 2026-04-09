-- Add image_url column to delivery_orders for delivery/export photo proof
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS image_url TEXT;
