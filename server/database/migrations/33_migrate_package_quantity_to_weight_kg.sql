-- Migrate package_quantity to weight_kg
UPDATE public.import_order_items
SET weight_kg = package_quantity
WHERE weight_kg IS NULL AND package_quantity IS NOT NULL;

UPDATE public.vegetable_order_items
SET weight_kg = package_quantity
WHERE weight_kg IS NULL AND package_quantity IS NOT NULL;
