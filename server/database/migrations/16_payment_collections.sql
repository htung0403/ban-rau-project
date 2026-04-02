DROP TABLE IF EXISTS public.payment_collections CASCADE;

CREATE TABLE public.payment_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID NOT NULL REFERENCES public.delivery_orders(id),
  customer_id UUID REFERENCES public.customers(id),
  driver_id UUID NOT NULL REFERENCES public.profiles(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  expected_amount NUMERIC(15,2) NOT NULL,
  collected_amount NUMERIC(15,2) NOT NULL,
  difference NUMERIC(15,2) GENERATED ALWAYS AS (collected_amount - expected_amount) STORED,
  collected_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','confirmed','self_confirmed')),
  submitted_at TIMESTAMPTZ,
  receiver_id UUID REFERENCES public.profiles(id),
  receiver_type VARCHAR(10) CHECK (receiver_type IN ('staff','manager')),
  confirmed_at TIMESTAMPTZ,
  self_confirm_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pc_driver_id ON public.payment_collections(driver_id);
CREATE INDEX idx_pc_status ON public.payment_collections(status);
CREATE INDEX idx_pc_collected_at ON public.payment_collections(collected_at);
CREATE INDEX idx_pc_vehicle_id ON public.payment_collections(vehicle_id);

-- Constraint for uniqueness
CREATE UNIQUE INDEX unique_active_collection 
  ON public.payment_collections(delivery_order_id) 
  WHERE status IN ('submitted','confirmed','self_confirmed');
