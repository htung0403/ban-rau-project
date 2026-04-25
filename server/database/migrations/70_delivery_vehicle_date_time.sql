ALTER TABLE public.delivery_vehicles ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE public.delivery_vehicles ADD COLUMN IF NOT EXISTS delivery_time TIME WITHOUT TIME ZONE;
