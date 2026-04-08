-- Migration: Clean up export_orders for new delivery-based flow
-- 1. Drop warehouse_id column (no longer used)
-- 2. Drop product_id FK constraint (now stores delivery_order_id instead of product UUID)
-- 3. Add product_name column to store denormalized product name
-- 4. Add export_time column

ALTER TABLE export_orders DROP COLUMN IF EXISTS warehouse_id;

ALTER TABLE export_orders DROP CONSTRAINT IF EXISTS export_orders_product_id_fkey;

ALTER TABLE export_orders ADD COLUMN IF NOT EXISTS product_name TEXT;

ALTER TABLE export_orders ADD COLUMN IF NOT EXISTS export_time TEXT;
