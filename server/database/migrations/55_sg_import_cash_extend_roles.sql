-- Bổ sung quyền Thu tiền SG cho ke_toan và các role tài xế (tai_xe*).
-- Idempotent: an toàn nếu đã chạy 54 phiên bản mới.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT ar.id, ap.id
FROM public.app_roles ar
JOIN public.app_permissions ap ON ap.permission_key = 'page.view.accounting.sgCash'
WHERE ar.role_key IN ('admin', 'manager', 'ke_toan', 'driver')
   OR ar.role_key ~* '^tai_xe'
ON CONFLICT (role_id, permission_id) DO NOTHING;
