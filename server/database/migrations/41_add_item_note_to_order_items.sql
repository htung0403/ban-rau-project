ALTER TABLE public.import_order_items
ADD COLUMN IF NOT EXISTS item_note TEXT;

ALTER TABLE public.vegetable_order_items
ADD COLUMN IF NOT EXISTS item_note TEXT;

-- Backfill notes that were temporarily stored in package_type for vegetable items.
UPDATE public.vegetable_order_items
SET item_note = package_type
WHERE item_note IS NULL
  AND package_type IS NOT NULL
  AND btrim(package_type) <> '';
