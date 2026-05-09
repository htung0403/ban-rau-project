-- Add export_payment_status to delivery_vehicles table for per-vehicle payment tracking
ALTER TABLE delivery_vehicles 
ADD COLUMN IF NOT EXISTS export_payment_status TEXT 
DEFAULT 'unpaid' 
CHECK (export_payment_status IN ('unpaid', 'paid'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_delivery_vehicles_export_payment_status 
ON delivery_vehicles(export_payment_status);