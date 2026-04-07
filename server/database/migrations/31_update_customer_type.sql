-- migration: convert retail to grocery
UPDATE public.customers
SET customer_type = 'grocery'
WHERE customer_type = 'retail';
