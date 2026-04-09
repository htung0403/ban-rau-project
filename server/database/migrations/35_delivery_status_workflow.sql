-- Migration: Update delivery_orders status for new workflow
-- Hàng ở SG → Cần giao → Đã giao

-- 1. Update existing data to new status values FIRST
UPDATE public.delivery_orders SET status = 'hang_o_sg' WHERE status = 'pending';
UPDATE public.delivery_orders SET status = 'can_giao' WHERE status = 'in_progress';
UPDATE public.delivery_orders SET status = 'da_giao' WHERE status = 'completed';

-- 2. Drop old constraint and add new one
ALTER TABLE public.delivery_orders DROP CONSTRAINT IF EXISTS delivery_orders_status_check;
ALTER TABLE public.delivery_orders 
  ADD CONSTRAINT delivery_orders_status_check 
  CHECK (status IN ('hang_o_sg', 'can_giao', 'da_giao'));

-- 3. Update default value
ALTER TABLE public.delivery_orders ALTER COLUMN status SET DEFAULT 'hang_o_sg';
