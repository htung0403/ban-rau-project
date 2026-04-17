-- Migration: Add invoice_exported tracking to import_orders and vegetable_orders
-- Date: 2026-04-15

-- Add invoice export status to import_orders (tạp hóa)
ALTER TABLE import_orders
  ADD COLUMN IF NOT EXISTS invoice_exported BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS invoice_exported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_exported_by UUID REFERENCES profiles(id);

-- Add invoice export status to vegetable_orders (rau)
ALTER TABLE vegetable_orders
  ADD COLUMN IF NOT EXISTS invoice_exported BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS invoice_exported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_exported_by UUID REFERENCES profiles(id);

-- Index for filtering by invoice status
CREATE INDEX IF NOT EXISTS idx_import_orders_invoice_exported ON import_orders(invoice_exported);
CREATE INDEX IF NOT EXISTS idx_vegetable_orders_invoice_exported ON vegetable_orders(invoice_exported);
