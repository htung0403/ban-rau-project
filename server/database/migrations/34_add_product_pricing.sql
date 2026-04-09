-- migration: Add pricing fields to products (for vegetable category)
-- base_price: the price amount (e.g. 14000)
-- price_per_weight: the weight in kg that the price applies to (e.g. 10 means "per 10kg")

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS base_price NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_per_weight NUMERIC(10,2) DEFAULT 1;
