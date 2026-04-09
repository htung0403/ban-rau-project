ALTER TABLE public.import_orders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.vegetable_orders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_import_orders_deleted_at
  ON public.import_orders(deleted_at);

CREATE INDEX IF NOT EXISTS idx_vegetable_orders_deleted_at
  ON public.vegetable_orders(deleted_at);
