-- 1. ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- 2. HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. POLICIES
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Managers/Admins can manage all profiles" ON public.profiles FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "Everyone can view warehouses" ON public.warehouses FOR SELECT USING (true);
CREATE POLICY "Managers/Admins can manage warehouses" ON public.warehouses FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "Everyone can view price settings" ON public.price_settings FOR SELECT USING (true);
CREATE POLICY "Only managers/admins can modify price settings" ON public.price_settings FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "Managers/Admins can manage customers" ON public.customers FOR ALL USING (public.is_admin_or_manager());
CREATE POLICY "Employees can view customers" ON public.customers FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'staff')
);

CREATE POLICY "Authorized staff can manage imports" ON public.import_orders FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'staff')
);

CREATE POLICY "Authorized staff can manage exports" ON public.export_orders FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'staff')
);

CREATE POLICY "Staff can view vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Managers/Admins can manage vehicles" ON public.vehicles FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "Managers/Admins can manage payroll" ON public.payroll FOR ALL USING (public.is_admin_or_manager());
CREATE POLICY "Users can view own payroll" ON public.payroll FOR SELECT USING (employee_id = auth.uid());
