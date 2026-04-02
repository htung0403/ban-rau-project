-- 1. USERS & AUTH
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','manager','staff','driver','customer')),
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WAREHOUSES
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  capacity INTEGER,
  current_stock INTEGER DEFAULT 0,
  manager_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRICE SETTINGS
CREATE TABLE public.price_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  value NUMERIC(15,2) NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CUSTOMERS
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC(15,2) DEFAULT 0,
  debt NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. IMPORT ORDERS
CREATE TABLE public.import_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code VARCHAR(20) NOT NULL,
  order_date DATE NOT NULL,
  order_time TIME NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  receiver_name VARCHAR(255) NOT NULL,
  receiver_phone VARCHAR(20),
  receiver_address TEXT,
  package_type VARCHAR(50) CHECK (package_type IN ('thùng','bao','kiện','pallet','khác')),
  weight_kg NUMERIC(10,2),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,2),
  total_amount NUMERIC(15,2) GENERATED ALWAYS AS (quantity * weight_kg * unit_price) STORED,
  received_by UUID REFERENCES public.profiles(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','processing','delivered','returned')),
  customer_id UUID REFERENCES public.customers(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EXPORT ORDERS
CREATE TABLE public.export_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_date DATE NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  debt_amount NUMERIC(15,2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid')),
  paid_amount NUMERIC(15,2) DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. DELIVERY ORDERS
CREATE TABLE public.delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_order_id UUID REFERENCES public.import_orders(id),
  product_name VARCHAR(255) NOT NULL,
  total_quantity INTEGER NOT NULL,
  delivered_quantity INTEGER DEFAULT 0,
  remaining_quantity INTEGER GENERATED ALWAYS AS (total_quantity - delivered_quantity) STORED,
  unit_price NUMERIC(15,2),
  import_cost NUMERIC(15,2),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  delivery_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. VEHICLES
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate VARCHAR(20) UNIQUE NOT NULL,
  vehicle_type VARCHAR(50),
  driver_id UUID REFERENCES public.profiles(id),
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available','in_transit','maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. DELIVERY VEHICLES
CREATE TABLE public.delivery_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.profiles(id),
  assigned_quantity INTEGER,
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned','in_transit','completed')),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. VEHICLE CHECKINS
CREATE TABLE public.vehicle_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.profiles(id),
  checkin_type VARCHAR(10) CHECK (checkin_type IN ('in','out')),
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  address_snapshot TEXT,
  checkin_time TIMESTAMPTZ DEFAULT NOW()
);

-- 11. PAYMENT COLLECTIONS
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

-- 12. LEAVE REQUESTS
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. SALARY ADVANCES
CREATE TABLE public.salary_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id),
  amount NUMERIC(15,2) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  week_start DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ATTENDANCE
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id),
  work_date DATE NOT NULL,
  is_present BOOLEAN DEFAULT false,
  check_in_time TIME,
  check_out_time TIME,
  note TEXT,
  UNIQUE(employee_id, work_date)
);

-- 15. COMPENSATORY ATTENDANCES
CREATE TABLE public.compensatory_attendances (
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

-- 16. PAYROLL
CREATE TABLE public.payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  days_worked INTEGER DEFAULT 0,
  daily_wage NUMERIC(15,2),
  gross_salary NUMERIC(15,2) GENERATED ALWAYS AS (days_worked * daily_wage) STORED,
  total_advances NUMERIC(15,2) DEFAULT 0,
  net_salary NUMERIC(15,2) GENERATED ALWAYS AS (days_worked * daily_wage - total_advances) STORED,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','confirmed','paid')),
  created_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
