-- 1. TRUNCATE PUBLIC TABLES (ONLY)
TRUNCATE public.profiles, public.warehouses, public.price_settings, public.customers, public.import_orders, public.export_orders, public.delivery_orders, public.vehicles, public.delivery_vehicles, public.vehicle_checkins, public.payment_collections, public.leave_requests, public.salary_advances, public.attendance, public.payroll CASCADE;

-- 2. ENABLE EXTENSION
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. USER CREATION HELPER (IDEMPOTENT - Safe for Cloud)
CREATE OR REPLACE FUNCTION public.create_demo_user(
  user_id UUID,
  user_email TEXT,
  user_password TEXT,
  user_full_name TEXT,
  user_role TEXT
) RETURNS VOID AS $$
DECLARE
  encrypted_pw TEXT;
BEGIN
  encrypted_pw := crypt(user_password, gen_salt('bf'));

  -- Insert/Update auth.users (Supabase handles password hashing automatically if raw SQL matches crypt pattern)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES (user_id, '00000000-0000-0000-0000-000000000000', user_email, encrypted_pw, now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', user_full_name), now(), now(), 'authenticated', 'authenticated')
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now();

  -- Insert/Update auth.identities
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
  VALUES (user_id, user_id, jsonb_build_object('sub', user_id, 'email', user_email), 'email', now(), now(), now(), user_id)
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  -- Insert into public.profiles
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (user_id, user_full_name, user_role)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
END;
$$ LANGUAGE plpgsql;

-- 4. DEMO ACCOUNTS (Password: password123)
SELECT public.create_demo_user('00000000-0000-0000-0000-000000000001', 'admin@example.com', 'password123', 'Super Admin', 'admin');
SELECT public.create_demo_user('00000000-0000-0000-0000-000000000002', 'staff1@example.com', 'password123', 'Nguyễn Văn Kho', 'staff');
SELECT public.create_demo_user('00000000-0000-0000-0000-000000000005', 'driver1@example.com', 'password123', 'Trần Tài Xế', 'driver');
SELECT public.create_demo_user('00000000-0000-0000-0000-000000000007', 'customer1@example.com', 'password123', 'Khách Hàng A', 'customer');

-- 5. BUSINESS DATA
INSERT INTO public.warehouses (name, address, capacity, manager_id)
VALUES ('Kho Thủ Đức', '123 Kha Vạn Cân, Thủ Đức', 1000, '00000000-0000-0000-0000-000000000001'),
       ('Kho Quận 12', '456 QL1A, Quận 12', 2000, '00000000-0000-0000-0000-000000000001');

INSERT INTO public.price_settings (setting_key, value, description)
VALUES ('price_per_kg', 5000, 'Giá vận chuyển mỗi kg'),
       ('daily_wage_staff', 300000, 'Lương ngày nhân viên'),
       ('daily_wage_driver', 400000, 'Lương ngày tài xế')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO public.customers (user_id, name, phone, address)
VALUES ('00000000-0000-0000-0000-000000000007', 'Khách Hàng A', '0907234567', 'TP.HCM')
ON CONFLICT (user_id) DO UPDATE SET 
  name = EXCLUDED.name,
  address = EXCLUDED.address;

INSERT INTO public.vehicles (license_plate, vehicle_type, driver_id)
VALUES ('51C-123.45', 'Tải 2.5 tấn', '00000000-0000-0000-0000-000000000005')
ON CONFLICT (license_plate) DO NOTHING;
