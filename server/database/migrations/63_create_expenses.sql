-- 63_create_expenses.sql
-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  expense_name TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0 AND amount <= 999999999),
  expense_date DATE NOT NULL,
  image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'confirmed')),
  confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for filtering by employee
CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON public.expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_status ON public.expenses(payment_status);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: admin/service role sees all
CREATE POLICY "Service role full access" ON public.expenses
  FOR ALL USING (true) WITH CHECK (true);

-- Seed app_permissions so the permission middleware can resolve the page path
INSERT INTO public.app_permissions (
  permission_key,
  page_path,
  page_name,
  module_key,
  module_name,
  is_active
)
VALUES (
  'chi_phi_view',
  '/hanh-chinh-nhan-su/chi-phi',
  'Chi phí',
  'hanh-chinh-nhan-su',
  'Hành chính nhân sự',
  true
)
ON CONFLICT (page_path) DO NOTHING;
