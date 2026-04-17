import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '../../api/accountingApi';
import toast from 'react-hot-toast';

export const invoiceOrderKeys = {
  all: ['invoice-orders'] as const,
  list: (category?: string, filters?: Record<string, string | undefined>) =>
    [...invoiceOrderKeys.all, 'list', category, filters] as const,
};

export function useInvoiceOrders(
  category: 'standard' | 'vegetable',
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    customer_id?: string;
    invoice_status?: string;
  }
) {
  return useQuery({
    queryKey: invoiceOrderKeys.list(category, filters as Record<string, string | undefined>),
    queryFn: () => accountingApi.getInvoiceOrders({ category, ...filters }),
  });
}

export function useBulkMarkInvoiceExported() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { ids: string[]; category: 'standard' | 'vegetable'; exported?: boolean }) =>
      accountingApi.bulkMarkInvoiceExported(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: invoiceOrderKeys.all });
      const action = variables.exported !== false ? 'xuất hóa đơn' : 'hủy xuất hóa đơn';
      toast.success(`Đã ${action} ${variables.ids.length} đơn hàng`);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message;
      toast.error(msg || 'Không thể cập nhật trạng thái hóa đơn');
    },
  });
}
