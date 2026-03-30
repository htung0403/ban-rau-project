-- 16. RECEIPTS
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view receipts" ON public.receipts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff, managers, admins can insert receipts" ON public.receipts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Managers and admins can update receipts" ON public.receipts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
