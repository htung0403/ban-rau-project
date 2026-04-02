-- 16. ROLE SALARIES
CREATE TABLE public.role_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key VARCHAR(50) UNIQUE NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  daily_wage NUMERIC(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial roles
INSERT INTO public.role_salaries (role_key, role_name, daily_wage, description)
VALUES 
  ('staff', 'Nhân viên', 300000, 'Lương cơ bản cho nhân viên văn phòng/kho'),
  ('driver', 'Tài xế', 450000, 'Lương cho tài xế giao hàng'),
  ('manager', 'Quản lý', 500000, 'Lương cho cấp quản lý'),
  ('admin', 'Admin', 600000, 'Lương cho quản trị viên');
