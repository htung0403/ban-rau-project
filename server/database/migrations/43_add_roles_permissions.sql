-- 43_add_roles_permissions.sql
-- Introduce application-level roles and page permissions.

CREATE TABLE IF NOT EXISTS public.app_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key VARCHAR(100) UNIQUE NOT NULL,
  role_name VARCHAR(255) NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key VARCHAR(150) UNIQUE NOT NULL,
  page_path VARCHAR(255) UNIQUE NOT NULL,
  page_name VARCHAR(255) NOT NULL,
  module_key VARCHAR(100) NOT NULL,
  module_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.app_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.app_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.app_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.app_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_app_permissions_module_key ON public.app_permissions(module_key);
CREATE INDEX IF NOT EXISTS idx_app_role_permissions_role_id ON public.app_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_app_role_permissions_permission_id ON public.app_role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_app_user_roles_user_id ON public.app_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_app_user_roles_role_id ON public.app_user_roles(role_id);

-- Seed all routable pages in current system.
INSERT INTO public.app_permissions (permission_key, page_path, page_name, module_key, module_name)
VALUES
  ('page.view.dashboard', '/', 'Trang chủ', 'utility', 'Tiện ích'),
  ('page.view.profile', '/ho-so', 'Hồ sơ', 'utility', 'Tiện ích'),
  ('page.view.settings', '/cai-dat', 'Cài đặt', 'utility', 'Tiện ích'),
  ('page.view.copyright', '/ban-quyen', 'Bản quyền', 'utility', 'Tiện ích'),

  ('page.view.products.module', '/hang-hoa', 'Tổng quan hàng hóa', 'products', 'Hàng hóa'),
  ('page.view.products.import', '/hang-hoa/nhap-hang', 'Nhập hàng', 'products', 'Hàng hóa'),
  ('page.view.products.vegetableImport', '/hang-hoa/nhap-hang-rau', 'Nhập hàng rau', 'products', 'Hàng hóa'),
  ('page.view.products.vegetables', '/hang-hoa/hang-rau', 'Bảng hàng rau', 'products', 'Hàng hóa'),
  ('page.view.products.vegetableDelivery', '/hang-hoa/giao-hang-rau', 'Giao hàng rau', 'products', 'Hàng hóa'),
  ('page.view.products.vegetableWarehouse', '/hang-hoa/kho-rau', 'Kho rau', 'products', 'Hàng hóa'),
  ('page.view.products.export', '/hang-hoa/xuat-hang', 'Xuất hàng', 'products', 'Hàng hóa'),
  ('page.view.products.delivery', '/hang-hoa/giao-hang', 'Giao hàng', 'products', 'Hàng hóa'),
  ('page.view.products.warehouse', '/hang-hoa/kho', 'Tồn kho thực tế', 'products', 'Hàng hóa'),
  ('page.view.products.settings', '/hang-hoa/cai-dat', 'Cài đặt hàng tạp hóa', 'products', 'Hàng hóa'),
  ('page.view.products.vegetableSettings', '/hang-hoa/cai-dat-rau', 'Cài đặt hàng rau', 'products', 'Hàng hóa'),

  ('page.view.hr.module', '/hanh-chinh-nhan-su', 'Tổng quan HR', 'hr', 'Hành chính nhân sự'),
  ('page.view.hr.employees', '/hanh-chinh-nhan-su/nhan-su', 'Nhân sự', 'hr', 'Hành chính nhân sự'),
  ('page.view.hr.leaveRequests', '/hanh-chinh-nhan-su/nghi-phep', 'Nghỉ phép', 'hr', 'Hành chính nhân sự'),
  ('page.view.hr.attendance', '/hanh-chinh-nhan-su/cham-cong', 'Chấm công', 'hr', 'Hành chính nhân sự'),
  ('page.view.hr.payroll', '/hanh-chinh-nhan-su/luong', 'Bảng lương', 'hr', 'Hành chính nhân sự'),
  ('page.view.hr.salarySettings', '/hanh-chinh-nhan-su/cai-dat-luong', 'Cài đặt lương', 'hr', 'Hành chính nhân sự'),
  ('page.view.hr.salaryAdvance', '/hanh-chinh-nhan-su/ung-luong', 'Ứng lương', 'hr', 'Hành chính nhân sự'),
  ('page.view.hr.approvals', '/hanh-chinh-nhan-su/duyet-don', 'Duyệt đơn', 'hr', 'Hành chính nhân sự'),
  ('page.view.hr.permissions', '/hanh-chinh-nhan-su/phan-quyen', 'Phân quyền', 'hr', 'Hành chính nhân sự'),

  ('page.view.accounting.module', '/ke-toan', 'Tổng quan kế toán', 'accounting', 'Kế toán'),
  ('page.view.accounting.groceryCustomers', '/ke-toan/khach-hang-tap-hoa', 'Danh sách KH tạp hóa', 'accounting', 'Kế toán'),
  ('page.view.accounting.vegetableCustomers', '/ke-toan/khach-hang-rau', 'Danh sách KH rau', 'accounting', 'Kế toán'),
  ('page.view.accounting.wholesaleCustomers', '/ke-toan/vua-rau', 'Danh sách vựa', 'accounting', 'Kế toán'),
  ('page.view.accounting.customerDebt', '/ke-toan/cong-no', 'Công nợ KH', 'accounting', 'Kế toán'),
  ('page.view.accounting.revenue', '/ke-toan/doanh-thu', 'Báo cáo doanh thu', 'accounting', 'Kế toán'),

  ('page.view.vehicles.module', '/quan-ly-xe', 'Tổng quan quản lý xe', 'vehicles', 'Quản lý xe'),
  ('page.view.vehicles.list', '/quan-ly-xe/danh-sach', 'Danh sách xe', 'vehicles', 'Quản lý xe'),
  ('page.view.vehicles.checkin', '/quan-ly-xe/check-in', 'Check-in tài xế', 'vehicles', 'Quản lý xe'),
  ('page.view.vehicles.paymentCollections', '/quan-ly-xe/thu-tien', 'Thu tiền hàng', 'vehicles', 'Quản lý xe')
ON CONFLICT (permission_key) DO UPDATE
SET
  page_path = EXCLUDED.page_path,
  page_name = EXCLUDED.page_name,
  module_key = EXCLUDED.module_key,
  module_name = EXCLUDED.module_name,
  updated_at = NOW();

-- Seed legacy roles as system roles.
INSERT INTO public.app_roles (role_key, role_name, description, is_system)
VALUES
  ('admin', 'Admin', 'Quản trị hệ thống', true),
  ('manager', 'Manager', 'Quản lý', true),
  ('staff', 'Staff', 'Nhân viên', true),
  ('driver', 'Driver', 'Tài xế', true),
  ('customer', 'Customer', 'Khách hàng', true)
ON CONFLICT (role_key) DO NOTHING;

-- Migrate current single-role users to user-role mapping.
INSERT INTO public.app_user_roles (user_id, role_id)
SELECT p.id, ar.id
FROM public.profiles p
JOIN public.app_roles ar ON ar.role_key = p.role
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Default role-permission mapping for existing system roles.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT ar.id, ap.id
FROM public.app_roles ar
JOIN public.app_permissions ap ON
  (
    ar.role_key = 'admin'
    OR ar.role_key = 'manager'
    OR (
      ar.role_key = 'staff'
      AND ap.permission_key IN (
        'page.view.dashboard','page.view.profile',
        'page.view.products.module','page.view.products.import','page.view.products.vegetableImport',
        'page.view.products.vegetables','page.view.products.vegetableDelivery','page.view.products.vegetableWarehouse',
        'page.view.products.export','page.view.products.delivery','page.view.products.warehouse',
        'page.view.hr.module','page.view.hr.leaveRequests','page.view.hr.attendance','page.view.hr.payroll','page.view.hr.salaryAdvance',
        'page.view.accounting.module','page.view.accounting.groceryCustomers','page.view.accounting.vegetableCustomers',
        'page.view.accounting.wholesaleCustomers','page.view.accounting.customerDebt','page.view.accounting.revenue',
        'page.view.vehicles.module','page.view.vehicles.paymentCollections'
      )
    )
    OR (
      ar.role_key = 'driver'
      AND ap.permission_key IN (
        'page.view.dashboard','page.view.profile',
        'page.view.products.module','page.view.products.delivery','page.view.products.vegetableDelivery',
        'page.view.hr.module','page.view.hr.leaveRequests','page.view.hr.attendance','page.view.hr.salaryAdvance',
        'page.view.vehicles.module','page.view.vehicles.checkin','page.view.vehicles.paymentCollections'
      )
    )
    OR (
      ar.role_key = 'customer'
      AND ap.permission_key IN ('page.view.profile')
    )
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
