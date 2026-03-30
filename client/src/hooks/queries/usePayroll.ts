import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '../../api/payrollApi';
import toast from 'react-hot-toast';

export const payrollKeys = {
  all: ['payroll'] as const,
  list: () => [...payrollKeys.all, 'list'] as const,
  detail: (id: string) => [...payrollKeys.all, 'detail', id] as const,
};

export function usePayrolls() {
  return useQuery({
    queryKey: payrollKeys.list(),
    queryFn: () => payrollApi.getAll(),
  });
}

export function usePayroll(id: string) {
  return useQuery({
    queryKey: payrollKeys.detail(id),
    queryFn: () => payrollApi.getById(id),
    enabled: !!id,
  });
}

export function useGeneratePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekStart: string) => payrollApi.generate(weekStart),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.all });
      toast.success('Tạo bảng lương thành công');
    },
    onError: () => toast.error('Lỗi khi tạo bảng lương'),
  });
}

export function useConfirmPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.all });
      toast.success('Chốt lương thành công');
    },
    onError: () => toast.error('Lỗi khi chốt lương'),
  });
}
