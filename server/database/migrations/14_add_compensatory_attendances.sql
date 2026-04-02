-- 1. Thêm bảng compensatory_attendances
CREATE TABLE IF NOT EXISTS public.compensatory_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, work_date)
);

-- 2. Thêm trường approved_by và approved_at vào bảng payroll
ALTER TABLE public.payroll 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
