-- migration: Add Import Orders Debt & Payment Status Logic

-- 1. Restore required columns to import_orders
ALTER TABLE public.import_orders 
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS debt_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid'));

-- 2. General trigger for order payment status
CREATE OR REPLACE FUNCTION public.sync_payment_status() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.paid_amount >= NEW.debt_amount AND NEW.debt_amount > 0 THEN
        NEW.payment_status = 'paid';
    ELSIF NEW.paid_amount > 0 THEN
        NEW.payment_status = 'partial';
    ELSE
        NEW.payment_status = 'unpaid';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Export Orders Payment Status
DROP TRIGGER IF EXISTS trg_export_order_payment_status ON public.export_orders;
CREATE TRIGGER trg_export_order_payment_status
BEFORE INSERT OR UPDATE OF paid_amount, debt_amount ON public.export_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_payment_status();

-- Trigger for Import Orders Payment Status
DROP TRIGGER IF EXISTS trg_import_order_payment_status ON public.import_orders;
CREATE TRIGGER trg_import_order_payment_status
BEFORE INSERT OR UPDATE OF paid_amount, debt_amount ON public.import_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_payment_status();

-- 3. Trigger to calculate total_amount and debt_amount from items (Import Orders)
CREATE OR REPLACE FUNCTION public.sync_import_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_total NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total 
    FROM public.import_order_items 
    WHERE import_order_id = COALESCE(NEW.import_order_id, OLD.import_order_id);
    
    -- We assume debt_amount = total_amount initially. Only update total_amount here.
    -- To not overwrite user's custom debt_amount directly each time, 
    -- we might just sync total_amount and debt_amount linearly for now.
    UPDATE public.import_orders 
    SET total_amount = v_total,
        debt_amount = v_total
    WHERE id = COALESCE(NEW.import_order_id, OLD.import_order_id);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_import_items_to_order ON public.import_order_items;
CREATE TRIGGER trg_import_items_to_order
AFTER INSERT OR UPDATE OR DELETE ON public.import_order_items
FOR EACH ROW EXECUTE FUNCTION public.sync_import_order_totals();


-- 4. Trigger to log Import Orders to Ledger
CREATE OR REPLACE FUNCTION public.log_import_order_to_ledger() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.debt_amount > 0) THEN
            -- Purchase: Owner owes customer, so we DECREASE their debt (since debt > 0 means they owe us)
            INSERT INTO public.customer_debt_ledger (customer_id, amount, transaction_type, reference_id)
            VALUES (NEW.customer_id, -NEW.debt_amount, 'order', NEW.id);
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.debt_amount IS DISTINCT FROM NEW.debt_amount) THEN
            INSERT INTO public.customer_debt_ledger (customer_id, amount, transaction_type, reference_id, notes)
            VALUES (NEW.customer_id, -(NEW.debt_amount - OLD.debt_amount), 'adjustment', NEW.id, 'Cập nhật giá trị xuất/nhập hàng');
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.customer_debt_ledger (customer_id, amount, transaction_type, reference_id, notes)
        VALUES (OLD.customer_id, OLD.debt_amount, 'adjustment', OLD.id, 'Xóa phiếu nhập - hoàn nợ');
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_import_order_to_ledger ON public.import_orders;
CREATE TRIGGER trg_import_order_to_ledger
AFTER INSERT OR UPDATE OR DELETE ON public.import_orders
FOR EACH ROW EXECUTE FUNCTION public.log_import_order_to_ledger();

-- 5. Lấp dữ liệu (Backfill) cho các đơn hàng cũ đang bằng 0
UPDATE public.import_orders o
SET total_amount = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM public.import_order_items i
    WHERE i.import_order_id = o.id
),
debt_amount = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM public.import_order_items i
    WHERE i.import_order_id = o.id
);

