-- 1. Create Customer Debt Ledger table (Audit Trail)
-- Each row represents a change in the customer's debt.
CREATE TABLE IF NOT EXISTS public.customer_debt_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL, -- Positive for increase (e.g., new order), negative for decrease (e.g., payment)
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('order', 'payment', 'adjustment', 'return')),
    reference_id UUID, -- order_id or receipt_id
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- 2. Trigger Function: Sync Ledger -> Customer.debt
-- This ensures the total debt in 'customers' table is always a correct sum of ledger entries.
CREATE OR REPLACE FUNCTION public.sync_customer_debt_from_ledger() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.customers 
        SET debt = debt + NEW.amount 
        WHERE id = NEW.customer_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.customers 
        SET debt = debt - OLD.amount 
        WHERE id = OLD.customer_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.customers 
        SET debt = debt - OLD.amount + NEW.amount 
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_customer_debt
AFTER INSERT OR UPDATE OR DELETE ON public.customer_debt_ledger
FOR EACH ROW EXECUTE FUNCTION public.sync_customer_debt_from_ledger();

-- 3. Trigger Function: Export Orders -> Ledger
-- When an export order is created or updated, record it in the ledger.
CREATE OR REPLACE FUNCTION public.log_export_order_to_ledger() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.debt_amount > 0) THEN
            INSERT INTO public.customer_debt_ledger (customer_id, amount, transaction_type, reference_id, created_by)
            VALUES (NEW.customer_id, NEW.debt_amount, 'order', NEW.id, NEW.created_by);
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- If debt_amount changes, record the difference in ledger
        IF (OLD.debt_amount IS DISTINCT FROM NEW.debt_amount) THEN
            INSERT INTO public.customer_debt_ledger (customer_id, amount, transaction_type, reference_id, notes)
            VALUES (NEW.customer_id, NEW.debt_amount - OLD.debt_amount, 'adjustment', NEW.id, 'Cập nhật giá trị nợ đơn hàng');
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        -- If order is deleted, remove it from debt by logging reverse
        INSERT INTO public.customer_debt_ledger (customer_id, amount, transaction_type, reference_id, notes)
        VALUES (OLD.customer_id, -OLD.debt_amount, 'adjustment', OLD.id, 'Xóa đơn hàng - hoàn nợ');
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_export_order_to_ledger
AFTER INSERT OR UPDATE OR DELETE ON public.export_orders
FOR EACH ROW EXECUTE FUNCTION public.log_export_order_to_ledger();

-- 4. Trigger Function: Receipts -> Ledger
-- When a receipt is created (payment), record it in the ledger.
CREATE OR REPLACE FUNCTION public.log_receipt_to_ledger() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.customer_debt_ledger (customer_id, amount, transaction_type, reference_id, created_by, notes)
        VALUES (NEW.customer_id, -NEW.amount, 'payment', NEW.id, NEW.created_by, NEW.notes);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_receipt_to_ledger
AFTER INSERT ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.log_receipt_to_ledger();

-- 5. Atomic FIFO Payment function (RPC)
-- This function handles the entire payment process in one transaction:
-- 1. Create Receipt (which triggers ledger and debt sync).
-- 2. Distribute payment to old orders (FIFO).
CREATE OR REPLACE FUNCTION public.handle_customer_payment_fifo_atomic(
    p_customer_id UUID,
    p_amount NUMERIC,
    p_payment_date DATE,
    p_notes TEXT,
    p_created_by UUID
) RETURNS JSONB AS $$
DECLARE
    r_order RECORD;
    v_remaining NUMERIC := p_amount;
    v_payment_for_order NUMERIC;
    v_receipt_id UUID;
BEGIN
    -- 1. Create Receipt Entry (Auto-triggers balance update)
    INSERT INTO public.receipts (customer_id, amount, payment_date, notes, created_by)
    VALUES (p_customer_id, p_amount, p_payment_date, p_notes, p_created_by)
    RETURNING id INTO v_receipt_id;

    -- 2. Find unpaid/partial orders for FIFO distribution
    FOR r_order IN 
        SELECT id, debt_amount, paid_amount 
        FROM public.export_orders 
        WHERE customer_id = p_customer_id 
          AND payment_status != 'paid' 
        ORDER BY export_date ASC, created_at ASC
    LOOP
        EXIT WHEN v_remaining <= 0;

        v_payment_for_order := LEAST(v_remaining, r_order.debt_amount - r_order.paid_amount);
        
        IF v_payment_for_order > 0 THEN
            UPDATE public.export_orders 
            SET paid_amount = paid_amount + v_payment_for_order,
                payment_status = CASE 
                    WHEN (paid_amount + v_payment_for_order) >= debt_amount THEN 'paid'
                    ELSE 'partial'
                END
            WHERE id = r_order.id;

            v_remaining := v_remaining - v_payment_for_order;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt_id,
        'remaining_unallocated', v_remaining
    );
END;
$$ LANGUAGE plpgsql;
