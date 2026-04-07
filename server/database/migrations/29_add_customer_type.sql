ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) DEFAULT 'retail' 
CHECK (customer_type IN ('retail', 'wholesale', 'grocery'));
