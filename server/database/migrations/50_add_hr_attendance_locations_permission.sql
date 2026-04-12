-- Trang cấu hình nhiều điểm chấm công (geofence) trong module HR
INSERT INTO public.app_permissions (permission_key, page_path, page_name, module_key, module_name)
VALUES
  (
    'page.view.hr.attendanceLocations',
    '/hanh-chinh-nhan-su/cau-hinh-cham-cong',
    'Cấu hình chấm công',
    'hr',
    'Hành chính nhân sự'
  )
ON CONFLICT (permission_key) DO UPDATE
SET
  page_path = EXCLUDED.page_path,
  page_name = EXCLUDED.page_name,
  module_key = EXCLUDED.module_key,
  module_name = EXCLUDED.module_name,
  updated_at = NOW();

INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT ar.id, ap.id
FROM public.app_roles ar
JOIN public.app_permissions ap ON ap.permission_key = 'page.view.hr.attendanceLocations'
WHERE ar.role_key IN ('admin', 'manager')
ON CONFLICT (role_id, permission_id) DO NOTHING;
