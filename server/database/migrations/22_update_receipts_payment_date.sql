-- 22_update_receipts_payment_date.sql

-- 1. Alter receipts table to use TIMESTAMPTZ instead of DATE for payment_date
ALTER TABLE public.receipts ALTER COLUMN payment_date TYPE TIMESTAMPTZ USING payment_date::TIMESTAMPTZ;

-- 2. Update the RPC function to accept TIMESTAMPTZ
CREATE OR REPLACE FUNCTION public.handle_customer_payment_fifo_atomic(
    p_customer_id UUID,
    p_amount NUMERIC,
    p_payment_date TIMESTAMPTZ,
    p_notes TEXT,
    p_created_by UUID
) RETURNS JSONB AS $$
DECLARE
    r_export RECORD;
    r_import RECORD;
    v_remaining NUMERIC;
    v_total_offset NUMERIC := 0;
    v_offset_amount NUMERIC;
    v_receipt_id UUID;
    v_payment_for_order NUMERIC;
BEGIN
    -- 0. Auto Offset Import vs Export
    FOR r_import IN 
        SELECT id, debt_amount, paid_amount 
        FROM public.import_orders 
        WHERE customer_id = p_customer_id 
          AND payment_status != 'paid' 
        ORDER BY created_at ASC
    LOOP
        v_remaining := r_import.debt_amount - r_import.paid_amount;
        
        FOR r_export IN 
            SELECT id, debt_amount, paid_amount 
            FROM public.export_orders 
            WHERE customer_id = p_customer_id 
              AND payment_status != 'paid' 
            ORDER BY export_date ASC, created_at ASC
        LOOP
            EXIT WHEN v_remaining <= 0;
            
            v_offset_amount := LEAST(v_remaining, r_export.debt_amount - r_export.paid_amount);
            
            IF v_offset_amount > 0 THEN
                UPDATE public.export_orders 
                SET paid_amount = paid_amount + v_offset_amount
                WHERE id = r_export.id;
                
                UPDATE public.import_orders 
                SET paid_amount = paid_amount + v_offset_amount
                WHERE id = r_import.id;

                v_remaining := v_remaining - v_offset_amount;
                v_total_offset := v_total_offset + v_offset_amount;
            END IF;
        END LOOP;
    END LOOP;

    -- 1. Create Receipt Entry (using TIMESTAMPTZ)
    IF p_amount > 0 THEN
        INSERT INTO public.receipts (customer_id, amount, payment_date, notes, created_by)
        VALUES (p_customer_id, p_amount, p_payment_date, p_notes, p_created_by)
        RETURNING id INTO v_receipt_id;

        -- 2. Distribute payment to remaining old Export Orders (FIFO)
        v_remaining := p_amount;
        FOR r_export IN 
            SELECT id, debt_amount, paid_amount 
            FROM public.export_orders 
            WHERE customer_id = p_customer_id 
              AND payment_status != 'paid' 
            ORDER BY export_date ASC, created_at ASC
        LOOP
            EXIT WHEN v_remaining <= 0;

            v_payment_for_order := LEAST(v_remaining, r_export.debt_amount - r_export.paid_amount);
            
            IF v_payment_for_order > 0 THEN
                UPDATE public.export_orders 
                SET paid_amount = paid_amount + v_payment_for_order
                WHERE id = r_export.id;

                v_remaining := v_remaining - v_payment_for_order;
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', COALESCE(v_receipt_id, NULL),
        'offset_amount', v_total_offset,
        'remaining_unallocated', COALESCE(v_remaining, 0)
    );
END;
$$ LANGUAGE plpgsql;
