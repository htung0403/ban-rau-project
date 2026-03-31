-- migration: add payment_method to delivery_orders
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
