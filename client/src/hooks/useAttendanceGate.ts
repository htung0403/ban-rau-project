import { useMemo } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from './queries/useHR';

const ALLOWED_PATHS_BEFORE_CHECKIN = new Set([
  '/hanh-chinh-nhan-su',
  '/hanh-chinh-nhan-su/cham-cong',
  '/ho-so',
]);

export function useAttendanceGate() {
  const { user } = useAuth();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isAdmin = user?.role === 'admin';

  const { data: attendanceData, isLoading } = useAttendance(todayStr, todayStr, todayStr);

  const hasCheckedIn = useMemo(() => {
    if (!user || !attendanceData) return false;
    return attendanceData.some((a) => a.employee_id === user.id && a.is_present);
  }, [user, attendanceData]);

  const mustCheckIn = !!user && !isAdmin && !isLoading && !hasCheckedIn;

  return { mustCheckIn, isLoading, hasCheckedIn };
}

export function isPathAllowedBeforeCheckin(path: string): boolean {
  if (path === '/') return true;
  if (ALLOWED_PATHS_BEFORE_CHECKIN.has(path)) return true;
  if (path.startsWith('/ho-so/')) return true;
  return false;
}
