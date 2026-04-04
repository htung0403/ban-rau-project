-- migration: Add is_custom_amount to import_orders
-- Allows overriding the auto-calculated total_amount from items

ALTER TABLE public.import_orders 
ADD COLUMN IF NOT EXISTS is_custom_amount BOOLEAN DEFAULT false;

-- Update trigger to respect is_custom_amount
CREATE OR REPLACE FUNCTION public.sync_import_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_total NUMERIC := 0;
    v_is_custom BOOLEAN;
BEGIN
    SELECT is_custom_amount INTO v_is_custom
    FROM public.import_orders
    WHERE id = COALESCE(NEW.import_order_id, OLD.import_order_id);

    IF v_is_custom THEN
        -- Do not overwrite total_amount and debt_amount from items
        RETURN NULL;
    END IF;

    SELECT COALESCE(SUM(total_amount), 0) INTO v_total 
    FROM public.import_order_items 
    WHERE import_order_id = COALESCE(NEW.import_order_id, OLD.import_order_id);
    
    UPDATE public.import_orders 
    SET total_amount = v_total,
        debt_amount = v_total
    WHERE id = COALESCE(NEW.import_order_id, OLD.import_order_id);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Backfill default value for existing custom amount logic if necessary.
-- Any order that has an explicit difference could be flagged.
UPDATE public.import_orders o
SET is_custom_amount = true
WHERE o.total_amount != (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM public.import_order_items i
    WHERE i.import_order_id = o.id
);
