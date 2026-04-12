-- Thu tiền SG: xác nhận NV đã nộp tiền cước thu khi nhập tạp hóa (đã trả)
ALTER TABLE public.import_orders
  ADD COLUMN IF NOT EXISTS sg_cash_handover_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sg_cash_handover_confirmed_by UUID REFERENCES public.profiles(id);

INSERT INTO public.app_permissions (permission_key, page_path, page_name, module_key, module_name)
VALUES
  (
    'page.view.accounting.sgCash',
    '/ke-toan/thu-tien-sg',
    'Thu tiền SG',
    'accounting',
    'Kế toán'
  )
ON CONFLICT (permission_key) DO UPDATE
SET
  page_path = EXCLUDED.page_path,
  page_name = EXCLUDED.page_name,
  module_key = EXCLUDED.module_key,
  module_name = EXCLUDED.module_name,
  updated_at = NOW();

-- Mặc định: admin, kế toán (ke_toan), quản lý; tài xế (driver hoặc role_key bắt đầu bằng tai_xe)
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT ar.id, ap.id
FROM public.app_roles ar
JOIN public.app_permissions ap ON ap.permission_key = 'page.view.accounting.sgCash'
WHERE ar.role_key IN ('admin', 'manager', 'ke_toan', 'driver')
   OR ar.role_key ~* '^tai_xe'
ON CONFLICT (role_id, permission_id) DO NOTHING;
