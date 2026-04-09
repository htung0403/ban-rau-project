-- Add payment proof image to payment_collections
ALTER TABLE public.payment_collections
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
