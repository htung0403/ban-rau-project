-- 79_customer_self_service_orders.sql
-- Add role-manageable permissions for customer self-service orders.

INSERT INTO public.app_permissions (permission_key, page_path, page_name, module_key, module_name)
VALUES
  ('page.view.customer.myOrders', '/tai-khoan/don-hang', 'Đơn hàng của tôi', 'customer_account', 'Tài khoản khách hàng'),
  ('page.action.customer.selfCreateOrder', '/tai-khoan/don-hang/tao-don', 'Tạo đơn hàng của tôi', 'customer_account', 'Tài khoản khách hàng')
ON CONFLICT (permission_key) DO UPDATE
SET
  page_path = EXCLUDED.page_path,
  page_name = EXCLUDED.page_name,
  module_key = EXCLUDED.module_key,
  module_name = EXCLUDED.module_name,
  updated_at = NOW();

-- Keep "Đơn hàng của tôi" enabled by default for customer role.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT ar.id, ap.id
FROM public.app_roles ar
JOIN public.app_permissions ap ON ap.permission_key = 'page.view.customer.myOrders'
WHERE ar.role_key = 'customer'
ON CONFLICT (role_id, permission_id) DO NOTHING;
