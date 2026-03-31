import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '../../api/hrApi';
import toast from 'react-hot-toast';

export const hrKeys = {
  all: ['hr'] as const,
  employees: () => [...hrKeys.all, 'employees'] as const,
  employee: (id: string) => [...hrKeys.all, 'employee', id] as const,
  leaveRequests: () => [...hrKeys.all, 'leave-requests'] as const,
  attendance: (employeeId: string, weekStart: string) => [...hrKeys.all, 'attendance', employeeId, weekStart] as const,
};

export function useEmployees(enabled = true) {
  return useQuery({
    queryKey: hrKeys.employees(),
    queryFn: () => hrApi.getEmployees(),
    enabled,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: hrKeys.employee(id),
    queryFn: () => hrApi.getEmployeeById(id),
    enabled: !!id,
  });
}

export function useLeaveRequests(employeeId?: string) {
  return useQuery({
    queryKey: hrKeys.leaveRequests(),
    queryFn: () => hrApi.getLeaveRequests(employeeId),
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hrApi.createLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.leaveRequests() });
      toast.success('Tạo đơn nghỉ phép thành công');
    },
    onError: () => toast.error('Lỗi khi tạo đơn nghỉ phép'),
  });
}

export function useReviewLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status: 'approved' | 'rejected'; review_note?: string } }) =>
      hrApi.reviewLeaveRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.leaveRequests() });
      toast.success('Duyệt đơn nghỉ phép thành công');
    },
    onError: () => toast.error('Lỗi khi duyệt đơn nghỉ phép'),
  });
}

export function useAttendance(employeeId: string, weekStart: string) {
  return useQuery({
    queryKey: hrKeys.attendance(employeeId, weekStart),
    queryFn: () => hrApi.getAttendance(employeeId, weekStart),
    enabled: !!employeeId && !!weekStart,
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hrApi.markAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.all });
      toast.success('Chấm công thành công');
    },
    onError: () => toast.error('Lỗi khi chấm công'),
  });
}
