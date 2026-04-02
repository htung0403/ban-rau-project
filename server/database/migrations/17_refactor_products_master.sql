-- migration: Refactor products to Master Data Catalog (Drop base_price)

-- Drop unused column base_price from products
ALTER TABLE public.products DROP COLUMN IF EXISTS base_price;
