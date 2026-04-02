-- 21_debt_reconciliation_logic.sql
-- Cập nhật function handle_customer_payment_fifo_atomic để cấn trừ nợ chéo giữa Phiếu Nhập và Phiếu Xuất

CREATE OR REPLACE FUNCTION public.handle_customer_payment_fifo_atomic(
    p_customer_id UUID,
    p_amount NUMERIC,
    p_payment_date DATE,
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
    -- 0. Auto Offset Import vs Export (Ta nợ khách vs Khách nợ ta)
    -- Lấy các đơn nhập (Import) chưa thanh toán để cấn trừ vào đơn xuất (Export)
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
                -- Cập nhật Export Order
                UPDATE public.export_orders 
                SET paid_amount = paid_amount + v_offset_amount
                WHERE id = r_export.id;
                
                -- Cập nhật Import Order 
                UPDATE public.import_orders 
                SET paid_amount = paid_amount + v_offset_amount
                WHERE id = r_import.id;

                v_remaining := v_remaining - v_offset_amount;
                v_total_offset := v_total_offset + v_offset_amount;
            END IF;
        END LOOP;
    END LOOP;

    -- NOTE: Cấn trừ nội bộ Import vs Export không làm thay đổi tổng Nợ trên ledger, vì tổng nợ đã đúng.
    -- (Import làm giảm trừ 1 cục trên ledger rồi, Export làm tăng 1 cục trên ledger rồi. Việc này chỉ chốt trạng thái `paid_amount` hóa đơn)
    
    -- 1. Create Receipt Entry (Auto-triggers balance update)
    IF p_amount > 0 THEN
        INSERT INTO public.receipts (customer_id, amount, payment_date, notes, created_by)
        VALUES (p_customer_id, p_amount, p_payment_date, p_notes, p_created_by)
        RETURNING id INTO v_receipt_id;

        -- 2. Distribute payment to remaining old Export Orders (FIFO)
        -- Since offset already handled some export orders, we just handle the rest
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

    -- If the customer over-paid such that some payment is left to distribute, we do not distribute it to orders because it's prepayment. It stays as open credit in ledger.
    
    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', COALESCE(v_receipt_id, NULL),
        'offset_amount', v_total_offset,
        'remaining_unallocated', COALESCE(v_remaining, 0)
    );
END;
$$ LANGUAGE plpgsql;
