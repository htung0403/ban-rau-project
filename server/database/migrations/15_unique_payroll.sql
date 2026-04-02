ALTER TABLE public.payroll ADD CONSTRAINT unique_employee_week UNIQUE(employee_id, week_start);
