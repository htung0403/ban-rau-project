import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from './queries/useHR';

/**
 * Gets current date string in Vietnam timezone (YYYY-MM-DD)
 */
export function getVietnamTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/**
 * Gets current time string in Vietnam timezone (HH:mm)
 */
export function getVietnamNowTimeStr(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());
}

/**
 * Gets current hour in Vietnam timezone (0-23)
 */
export function getVietnamCurrentHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      hour12: false
    }).format(new Date())
  );
}

const ALLOWED_PATHS_BEFORE_CHECKIN = new Set([
  '/hanh-chinh-nhan-su',
  '/hanh-chinh-nhan-su/cham-cong',
  '/ho-so',
]);

export function useAttendanceGate() {
  const { user } = useAuth();
  const todayStr = getVietnamTodayStr();
  const currentHour = getVietnamCurrentHour();
  const isAdmin = user?.role === 'admin';
  const isNhanVienNhanHang = user?.role === 'nhan_vien_nhan_hang';

  const { data: attendanceData, isLoading } = useAttendance(todayStr, todayStr, todayStr);

  const hasCheckedIn = useMemo(() => {
    if (!user || !attendanceData) return false;
    return attendanceData.some((a) => a.employee_id === user.id && a.is_present);
  }, [user, attendanceData]);

  const isAfterHours = currentHour >= 19;
  const isLocked = !!user && !isAdmin && !isNhanVienNhanHang && isAfterHours;
  const mustCheckIn = !!user && !isAdmin && !isLoading && !hasCheckedIn && !isLocked;

  return { mustCheckIn, isLoading, hasCheckedIn, isLocked };
}

export function isPathAllowedBeforeCheckin(path: string): boolean {
  if (path === '/') return true;
  if (ALLOWED_PATHS_BEFORE_CHECKIN.has(path)) return true;
  if (path.startsWith('/ho-so/')) return true;
  return false;
}
