-- 45_update_customer_role_name_vi.sql
-- Ensure built-in Customer role is displayed in Vietnamese.

DO $$
BEGIN
  IF to_regclass('public.app_roles') IS NOT NULL THEN
    UPDATE public.app_roles
    SET role_name = 'Khách hàng',
        updated_at = NOW()
    WHERE role_key = 'customer'
      AND role_name = 'Customer';
  END IF;
END $$;
