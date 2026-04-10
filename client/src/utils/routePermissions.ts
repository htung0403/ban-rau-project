type UserRole = 'admin' | 'manager' | 'staff' | 'driver' | 'customer' | string | undefined;

const LEGACY_ALLOWED_PATHS_BY_ROLE: Record<string, string[]> = {
  staff: [
    '/',
    '/ho-so',
    '/hang-hoa',
    '/hang-hoa/nhap-hang',
    '/hang-hoa/nhap-hang-rau',
    '/hang-hoa/hang-rau',
    '/hang-hoa/giao-hang-rau',
    '/hang-hoa/kho-rau',
    '/hang-hoa/xuat-hang',
    '/hang-hoa/giao-hang',
    '/hang-hoa/kho',
    '/hanh-chinh-nhan-su',
    '/hanh-chinh-nhan-su/nghi-phep',
    '/hanh-chinh-nhan-su/cham-cong',
    '/hanh-chinh-nhan-su/luong',
    '/hanh-chinh-nhan-su/ung-luong',
    '/ke-toan',
    '/ke-toan/khach-hang-tap-hoa',
    '/ke-toan/khach-hang-rau',
    '/ke-toan/vua-rau',
    '/ke-toan/cong-no',
    '/ke-toan/doanh-thu',
    '/quan-ly-xe',
    '/quan-ly-xe/thu-tien',
  ],
  driver: [
    '/',
    '/ho-so',
    '/hang-hoa',
    '/hang-hoa/giao-hang',
    '/hang-hoa/giao-hang-rau',
    '/hanh-chinh-nhan-su',
    '/hanh-chinh-nhan-su/nghi-phep',
    '/hanh-chinh-nhan-su/cham-cong',
    '/hanh-chinh-nhan-su/ung-luong',
    '/quan-ly-xe',
    '/quan-ly-xe/check-in',
    '/quan-ly-xe/thu-tien',
  ],
  customer: ['/ho-so'],
};

export const isAllRoutesAllowed = (role: UserRole): boolean => role === 'admin' || role === 'manager';

export const buildAllowedRouteSet = (role: UserRole): Set<string> => {
  if (isAllRoutesAllowed(role)) return new Set();
  return new Set(LEGACY_ALLOWED_PATHS_BY_ROLE[role || ''] || []);
};

export const canAccessRoute = (path: string | undefined, role: UserRole, allowedSet: Set<string>): boolean => {
  if (!path) return true;
  if (isAllRoutesAllowed(role)) return true;
  return allowedSet.has(path);
};

export const canAccessAnyRoute = (paths: string[], role: UserRole, allowedSet: Set<string>): boolean => {
  if (isAllRoutesAllowed(role)) return true;
  return paths.some((path) => canAccessRoute(path, role, allowedSet));
};

export const canAccessModuleRoute = (
  moduleRootPath: string,
  moduleChildPaths: string[],
  role: UserRole,
  allowedSet: Set<string>
): boolean => {
  if (isAllRoutesAllowed(role)) return true;

  if (canAccessRoute(moduleRootPath, role, allowedSet)) {
    return true;
  }

  return canAccessAnyRoute(moduleChildPaths, role, allowedSet);
};
