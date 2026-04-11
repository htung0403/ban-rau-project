export const PAGE_POLICIES = {
  PROFILE_VIEW: ['/ho-so'],

  PRODUCTS_IMPORT_ACCESS: ['/hang-hoa/nhap-hang', '/hang-hoa/nhap-hang-rau'],
  PRODUCTS_EXPORT_ACCESS: ['/hang-hoa/xuat-hang'],
  PRODUCTS_DELIVERY_ACCESS: ['/hang-hoa/giao-hang', '/hang-hoa/giao-hang-rau'],
  PRODUCTS_WAREHOUSE_ACCESS: ['/hang-hoa/kho', '/hang-hoa/kho-rau'],
  PRODUCTS_SETTINGS: ['/hang-hoa/cai-dat', '/hang-hoa/cai-dat-rau'],
  PRODUCTS_CATALOG_ACCESS: ['/hang-hoa/cai-dat', '/hang-hoa/cai-dat-rau', '/hang-hoa/nhap-hang', '/hang-hoa/nhap-hang-rau'],

  CUSTOMERS_DIRECTORY_READ: ['/ke-toan/khach-hang-tap-hoa', '/ke-toan/khach-hang-rau', '/ke-toan/vua-rau'],
  CUSTOMERS_SHARED_LOOKUP: [
    '/ke-toan/khach-hang-tap-hoa',
    '/ke-toan/khach-hang-rau',
    '/ke-toan/vua-rau',
    '/hang-hoa/nhap-hang',
    '/hang-hoa/nhap-hang-rau',
  ],
  ACCOUNTING_DEBT_MANAGE: ['/ke-toan/cong-no'],
  ACCOUNTING_REVENUE_VIEW: ['/ke-toan/doanh-thu'],
  ACCOUNTING_REPORTS_VIEW: ['/ke-toan/cong-no', '/ke-toan/doanh-thu'],

  VEHICLES_OPERATIONS: [
    '/quan-ly-xe/danh-sach',
    '/quan-ly-xe/check-in',
    '/hang-hoa/nhap-hang',
    '/hang-hoa/nhap-hang-rau',
    '/hang-hoa/giao-hang',
    '/hang-hoa/giao-hang-rau',
  ],
  VEHICLES_PAYMENT_COLLECTIONS: ['/quan-ly-xe/thu-tien'],

  HR_PERMISSIONS_MANAGE: ['/hanh-chinh-nhan-su/phan-quyen'],
  HR_EMPLOYEES_VIEW: ['/hanh-chinh-nhan-su/nhan-su', '/hang-hoa/nhap-hang', '/hang-hoa/nhap-hang-rau'],
  HR_EMPLOYEES_MANAGE: ['/hanh-chinh-nhan-su/nhan-su'],
  HR_LEAVE_REQUESTS: ['/hanh-chinh-nhan-su/nghi-phep'],
  HR_APPROVALS: ['/hanh-chinh-nhan-su/duyet-don'],
  HR_SALARY_ADVANCE: ['/hanh-chinh-nhan-su/ung-luong'],
  HR_SALARY_SETTINGS: ['/hanh-chinh-nhan-su/cai-dat-luong'],
  HR_PAYROLL_VIEW: ['/hanh-chinh-nhan-su/luong'],
  HR_ATTENDANCE_VIEW: ['/hanh-chinh-nhan-su/cham-cong'],

  GENERAL_SETTINGS_VIEW: ['/cai-dat', '/hanh-chinh-nhan-su/cham-cong'],
  GENERAL_SETTINGS_MANAGE: ['/cai-dat'],
} as const;

export type PermissionPolicyName = keyof typeof PAGE_POLICIES;
