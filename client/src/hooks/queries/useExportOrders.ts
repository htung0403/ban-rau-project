import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exportOrdersApi } from '../../api/exportOrdersApi';
import toast from 'react-hot-toast';

export const exportOrderKeys = {
  all: ['export-orders'] as const,
  list: () => [...exportOrderKeys.all, 'list'] as const,
};

export function useExportOrders() {
  return useQuery({
    queryKey: exportOrderKeys.list(),
    queryFn: () => exportOrdersApi.getAll(),
  });
}

export function useCreateExportOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: exportOrdersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exportOrderKeys.all });
      toast.success('Tạo đơn xuất hàng thành công');
    },
    onError: () => toast.error('Lỗi khi tạo đơn xuất hàng'),
  });
}

export function useUpdateExportPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { paid_amount: number; payment_status: string } }) =>
      exportOrdersApi.updatePayment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exportOrderKeys.all });
      toast.success('Cập nhật thanh toán thành công');
    },
    onError: () => toast.error('Lỗi khi cập nhật thanh toán'),
  });
}
