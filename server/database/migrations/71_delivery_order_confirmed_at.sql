-- Add confirmed_at: timestamp when order transitions from hang_o_sg -> can_giao
ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Backfill: existing can_giao/da_giao orders without confirmed_at get updated_at as estimate
UPDATE public.delivery_orders
  SET confirmed_at = updated_at
  WHERE status IN ('can_giao', 'da_giao')
    AND confirmed_at IS NULL;
