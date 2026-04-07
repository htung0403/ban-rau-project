-- migration: add vegetable customer type
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_type_check;
ALTER TABLE public.customers ADD CONSTRAINT customers_customer_type_check CHECK (customer_type IN ('retail', 'wholesale', 'grocery', 'vegetable'));
