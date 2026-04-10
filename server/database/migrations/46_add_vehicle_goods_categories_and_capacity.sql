ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS load_capacity_ton NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS goods_categories TEXT[] DEFAULT ARRAY['grocery','vegetable'];

UPDATE public.vehicles
SET goods_categories = ARRAY['grocery','vegetable']
WHERE goods_categories IS NULL OR cardinality(goods_categories) = 0;

ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS vehicles_goods_categories_check;

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_goods_categories_check CHECK (
    goods_categories IS NOT NULL
    AND cardinality(goods_categories) > 0
    AND goods_categories <@ ARRAY['grocery','vegetable']::TEXT[]
  );
