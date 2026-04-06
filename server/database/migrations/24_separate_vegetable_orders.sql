-- Migration 24: Tách hàng rau ra bảng riêng (vegetable_orders và vegetable_order_items)

-- 1. Create table `vegetable_orders`
CREATE TABLE public.vegetable_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code VARCHAR(20) NOT NULL,
  order_date DATE NOT NULL,
  order_time TIME NOT NULL,
  sender_name VARCHAR(255),
  receiver_name VARCHAR(255),
  receiver_phone VARCHAR(20),
  receiver_address TEXT,
  license_plate VARCHAR(20),
  driver_name VARCHAR(100),
  supplier_name VARCHAR(255),
  sheet_number VARCHAR(50),
  total_amount NUMERIC(15,2) DEFAULT 0,
  paid_amount NUMERIC(15,2) DEFAULT 0,
  debt_amount NUMERIC(15,2) DEFAULT 0,
  is_custom_amount BOOLEAN DEFAULT false,
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  received_by UUID REFERENCES public.profiles(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','processing','delivered','returned')),
  customer_id UUID REFERENCES public.customers(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create table `vegetable_order_items`
CREATE TABLE public.vegetable_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vegetable_order_id UUID REFERENCES public.vegetable_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  package_type VARCHAR(50),
  package_quantity INTEGER,
  weight_kg NUMERIC(10,2),
  quantity INTEGER,
  unit_price NUMERIC(15,2),
  total_amount NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add vegetable_order_id to delivery_orders
ALTER TABLE public.delivery_orders
ADD COLUMN vegetable_order_id UUID REFERENCES public.vegetable_orders(id);

-- 4. Migrate data from import_orders to vegetable_orders where order_category = 'vegetable'
INSERT INTO public.vegetable_orders (
  id, order_code, order_date, order_time, sender_name, receiver_name, 
  receiver_phone, receiver_address, license_plate, driver_name, supplier_name,
  sheet_number, total_amount, paid_amount, debt_amount, is_custom_amount,
  payment_status, received_by, warehouse_id, status, customer_id, notes, 
  created_at, updated_at
)
SELECT 
  id, order_code, order_date, order_time, sender_name, receiver_name, 
  receiver_phone, receiver_address, license_plate, driver_name, supplier_name,
  sheet_number, total_amount, paid_amount, debt_amount, is_custom_amount,
  payment_status, received_by, warehouse_id, status, customer_id, notes, 
  created_at, updated_at
FROM public.import_orders
WHERE order_category = 'vegetable';

-- 5. Migrate items data for vegetable orders
INSERT INTO public.vegetable_order_items (
  id, vegetable_order_id, product_id, package_type, package_quantity, 
  weight_kg, quantity, unit_price, payment_status, created_at
)
SELECT 
  ioi.id, ioi.import_order_id, ioi.product_id, ioi.package_type, ioi.package_quantity, 
  ioi.weight_kg, ioi.quantity, ioi.unit_price, ioi.payment_status, ioi.created_at
FROM public.import_order_items ioi
JOIN public.import_orders io ON io.id = ioi.import_order_id
WHERE io.order_category = 'vegetable';

-- 6. Update delivery_orders to reference vegetable_orders
UPDATE public.delivery_orders
SET vegetable_order_id = import_order_id,
    import_order_id = NULL
WHERE order_category = 'vegetable' AND import_order_id IS NOT NULL;

-- 7. Delete vegetable orders from import_order_items and import_orders
DELETE FROM public.import_order_items
WHERE import_order_id IN (SELECT id FROM public.import_orders WHERE order_category = 'vegetable');

DELETE FROM public.import_orders
WHERE order_category = 'vegetable';

-- 8. Alter import_orders to drop column order_category
ALTER TABLE public.import_orders DROP COLUMN order_category;

-- 9. Add Triggers for vegetable_orders
-- 9.1 Payment Status
CREATE TRIGGER trg_vegetable_order_payment_status
BEFORE INSERT OR UPDATE OF paid_amount, debt_amount ON public.vegetable_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_payment_status();

-- 9.2 Sync Totals from items
CREATE OR REPLACE FUNCTION public.sync_vegetable_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_total NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total 
    FROM public.vegetable_order_items 
    WHERE vegetable_order_id = COALESCE(NEW.vegetable_order_id, OLD.vegetable_order_id);
    
    UPDATE public.vegetable_orders 
    SET total_amount = v_total,
        debt_amount = v_total
    WHERE id = COALESCE(NEW.vegetable_order_id, OLD.vegetable_order_id);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vegetable_items_to_order
AFTER INSERT OR UPDATE OR DELETE ON public.vegetable_order_items
FOR EACH ROW EXECUTE FUNCTION public.sync_vegetable_order_totals();

-- 9.3 Ledger logging
CREATE OR REPLACE FUNCTION public.log_vegetable_order_to_ledger() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.debt_amount > 0) THEN
            INSERT INTO public.customer_debt_ledger (customer_id, amount, transaction_type, reference_id)
            VALUES (NEW.customer_id, -NEW.debt_amount, 'order', NEW.id);
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.debt_amount IS DISTINCT FROM NEW.debt_amount) THEN
            INSERT INTO public.customer_debt_ledger (customer_id, amount, transaction_type, reference_id, notes)
            VALUES (NEW.customer_id, -(NEW.debt_amount - OLD.debt_amount), 'adjustment', NEW.id, 'Cập nhật giá trị nhập hàng (hàng rau)');
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.customer_debt_ledger (customer_id, amount, transaction_type, reference_id, notes)
        VALUES (OLD.customer_id, OLD.debt_amount, 'adjustment', OLD.id, 'Xóa phiếu nhập (hàng rau) - hoàn nợ');
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vegetable_order_to_ledger
AFTER INSERT OR UPDATE OR DELETE ON public.vegetable_orders
FOR EACH ROW EXECUTE FUNCTION public.log_vegetable_order_to_ledger();

