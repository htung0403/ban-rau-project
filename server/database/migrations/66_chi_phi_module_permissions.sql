-- 66_chi_phi_module_permissions.sql
-- Trang module Chi phí (/chi-phi) và các trang con cho RBAC (app_permissions)
INSERT INTO public.app_permissions (permission_key, page_path, page_name, module_key, module_name, is_active)
VALUES
  ('page.view.chiPhi.hub', '/chi-phi', 'Chi phí', 'chi-phi', 'Chi phí', true),
  ('page.view.chiPhi.phieu', '/chi-phi/phieu', 'Phiếu chi phí', 'chi-phi', 'Chi phí', true),
  ('page.view.chiPhi.lichSu', '/chi-phi/lich-su', 'Lịch sử chi phí', 'chi-phi', 'Chi phí', true)
ON CONFLICT (page_path) DO NOTHING;
