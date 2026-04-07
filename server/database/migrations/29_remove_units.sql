-- migration: remove units
ALTER TABLE public.products DROP COLUMN IF EXISTS unit;
DROP TABLE IF EXISTS public.units CASCADE;
