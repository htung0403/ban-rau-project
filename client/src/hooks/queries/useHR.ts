import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '../../api/hrApi';
import toast from 'react-hot-toast';
import { payrollKeys } from './usePayroll';

export const hrKeys = {
  all: ['hr'] as const,
  employees: () => [...hrKeys.all, 'employees'] as const,
  employee: (id: string) => [...hrKeys.all, 'employee', id] as const,
  leaveRequests: () => [...hrKeys.all, 'leave-requests'] as const,
  salaryAdvances: () => [...hrKeys.all, 'salary-advances'] as const,
  compensatoryAttendances: () => [...hrKeys.all, 'compensatory-attendances'] as const,
  attendance: (date: string) => [...hrKeys.all, 'attendance', date] as const,
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

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hrApi.createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
      toast.success('Thêm nhân sự mới thành công');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Lỗi khi thêm nhân sự'),
  });
}

export function useUpdateEmployeeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      hrApi.updateEmployeeStatus(id, is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.all });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: () => toast.error('Lỗi khi cập nhật trạng thái'),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hrApi.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.all });
      toast.success('Đã xóa nhân sự thành công');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Lỗi khi xóa nhân sự'),
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

export function useAttendance(date: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: startDate && endDate ? [...hrKeys.attendance(date), startDate, endDate] : hrKeys.attendance(date),
    queryFn: () => hrApi.getAttendanceByDate(date, startDate, endDate),
    enabled: !!date,
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
    onError: (err: any) => toast.error(err.response?.data?.error || 'Lỗi khi chấm công'),
  });
}

export function useSalaryAdvances() {
  return useQuery({
    queryKey: hrKeys.salaryAdvances(),
    queryFn: () => hrApi.getSalaryAdvances(),
  });
}

export function useCreateSalaryAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hrApi.createSalaryAdvance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.salaryAdvances() });
      toast.success('Tạo đơn ứng lương thành công');
    },
    onError: () => toast.error('Lỗi khi tạo đơn ứng lương'),
  });
}

export function useApproveSalaryAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hrApi.approveSalaryAdvance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.salaryAdvances() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.all });
      toast.success('Duyệt đơn ứng lương thành công');
    },
    onError: () => toast.error('Lỗi khi duyệt đơn ứng lương'),
  });
}

export function useCompensatoryAttendances() {
  return useQuery({
    queryKey: hrKeys.compensatoryAttendances(),
    queryFn: () => hrApi.getCompensatoryAttendances(),
  });
}

export function useCreateCompensatoryAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hrApi.createCompensatoryAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.compensatoryAttendances() });
      toast.success('Tạo phiếu chấm công bù thành công');
    },
    onError: () => toast.error('Lỗi khi tạo phiếu chấm công bù'),
  });
}

export function useReviewCompensatoryAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => 
      hrApi.reviewCompensatoryAttendance(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.compensatoryAttendances() });
      queryClient.invalidateQueries({ queryKey: hrKeys.all });
      toast.success('Duyệt chấm công bù thành công');
    },
    onError: () => toast.error('Lỗi khi duyệt chấm công bù'),
  });
}
