-- 44_update_permission_labels_vi.sql
-- Normalize Vietnamese labels with accents for already-seeded role/permission data.
-- Safe to run even when migration 43 has not been applied yet.

DO $$
BEGIN
  IF to_regclass('public.app_permissions') IS NOT NULL THEN
    UPDATE public.app_permissions
    SET
      module_name = CASE module_key
        WHEN 'utility' THEN 'Tiện ích'
        WHEN 'products' THEN 'Hàng hóa'
        WHEN 'hr' THEN 'Hành chính nhân sự'
        WHEN 'accounting' THEN 'Kế toán'
        WHEN 'vehicles' THEN 'Quản lý xe'
        ELSE module_name
      END,
      page_name = CASE permission_key
        WHEN 'page.view.dashboard' THEN 'Trang chủ'
        WHEN 'page.view.profile' THEN 'Hồ sơ'
        WHEN 'page.view.settings' THEN 'Cài đặt'
        WHEN 'page.view.copyright' THEN 'Bản quyền'

        WHEN 'page.view.products.module' THEN 'Tổng quan hàng hóa'
        WHEN 'page.view.products.import' THEN 'Nhập hàng'
        WHEN 'page.view.products.vegetableImport' THEN 'Nhập hàng rau'
        WHEN 'page.view.products.vegetables' THEN 'Bảng hàng rau'
        WHEN 'page.view.products.vegetableDelivery' THEN 'Giao hàng rau'
        WHEN 'page.view.products.vegetableWarehouse' THEN 'Kho rau'
        WHEN 'page.view.products.export' THEN 'Xuất hàng'
        WHEN 'page.view.products.delivery' THEN 'Giao hàng'
        WHEN 'page.view.products.warehouse' THEN 'Tồn kho thực tế'
        WHEN 'page.view.products.settings' THEN 'Cài đặt hàng tạp hóa'
        WHEN 'page.view.products.vegetableSettings' THEN 'Cài đặt hàng rau'

        WHEN 'page.view.hr.module' THEN 'Tổng quan HR'
        WHEN 'page.view.hr.employees' THEN 'Nhân sự'
        WHEN 'page.view.hr.leaveRequests' THEN 'Nghỉ phép'
        WHEN 'page.view.hr.attendance' THEN 'Chấm công'
        WHEN 'page.view.hr.payroll' THEN 'Bảng lương'
        WHEN 'page.view.hr.salarySettings' THEN 'Cài đặt lương'
        WHEN 'page.view.hr.salaryAdvance' THEN 'Ứng lương'
        WHEN 'page.view.hr.approvals' THEN 'Duyệt đơn'
        WHEN 'page.view.hr.permissions' THEN 'Phân quyền'

        WHEN 'page.view.accounting.module' THEN 'Tổng quan kế toán'
        WHEN 'page.view.accounting.groceryCustomers' THEN 'Danh sách KH tạp hóa'
        WHEN 'page.view.accounting.vegetableCustomers' THEN 'Danh sách KH rau'
        WHEN 'page.view.accounting.wholesaleCustomers' THEN 'Danh sách vựa'
        WHEN 'page.view.accounting.customerDebt' THEN 'Công nợ KH'
        WHEN 'page.view.accounting.revenue' THEN 'Báo cáo doanh thu'

        WHEN 'page.view.vehicles.module' THEN 'Tổng quan quản lý xe'
        WHEN 'page.view.vehicles.list' THEN 'Danh sách xe'
        WHEN 'page.view.vehicles.checkin' THEN 'Check-in tài xế'
        WHEN 'page.view.vehicles.paymentCollections' THEN 'Thu tiền hàng'
        ELSE page_name
      END,
      updated_at = NOW();
  END IF;

  IF to_regclass('public.app_roles') IS NOT NULL THEN
    UPDATE public.app_roles
    SET
      description = CASE role_key
        WHEN 'admin' THEN 'Quản trị hệ thống'
        WHEN 'manager' THEN 'Quản lý'
        WHEN 'staff' THEN 'Nhân viên'
        WHEN 'driver' THEN 'Tài xế'
        WHEN 'customer' THEN 'Khách hàng'
        ELSE description
      END,
      updated_at = NOW();
  END IF;
END $$;
