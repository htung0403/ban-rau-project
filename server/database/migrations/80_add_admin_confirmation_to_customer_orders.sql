-- 80_add_admin_confirmation_to_customer_orders.sql
-- Add explicit admin confirmation metadata for import and vegetable orders.

ALTER TABLE public.import_orders
  ADD COLUMN IF NOT EXISTS admin_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_confirmed_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.vegetable_orders
  ADD COLUMN IF NOT EXISTS admin_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_confirmed_by UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_import_orders_admin_confirmed_at
  ON public.import_orders (admin_confirmed_at);

CREATE INDEX IF NOT EXISTS idx_vegetable_orders_admin_confirmed_at
  ON public.vegetable_orders (admin_confirmed_at);
