import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../api/customersApi';
import toast from 'react-hot-toast';

export const customerKeys = {
  all: ['customers'] as const,
  list: () => [...customerKeys.all, 'list'] as const,
  detail: (id: string) => [...customerKeys.all, 'detail', id] as const,
  orders: (id: string) => [...customerKeys.all, 'orders', id] as const,
  exportOrders: (id: string) => [...customerKeys.all, 'export-orders', id] as const,
  receipts: (id: string) => [...customerKeys.all, 'receipts', id] as const,
};

export function useCustomers(enabled = true) {
  return useQuery({
    queryKey: customerKeys.list(),
    queryFn: () => customersApi.getAll(),
    enabled,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customersApi.getById(id),
    enabled: !!id,
  });
}

export function useCustomerByUserId(userId: string) {
  return useQuery({
    queryKey: [...customerKeys.all, 'user', userId],
    queryFn: () => customersApi.getByUserId(userId),
    enabled: !!userId,
  });
}

export function useCustomerOrders(id: string) {
  return useQuery({
    queryKey: customerKeys.orders(id),
    queryFn: () => customersApi.getOrders(id),
    enabled: !!id,
  });
}

export function useCustomerExportOrders(id: string) {
  return useQuery({
    queryKey: customerKeys.exportOrders(id),
    queryFn: () => customersApi.getExportOrders(id),
    enabled: !!id,
  });
}

export function useCustomerReceipts(id: string) {
  return useQuery({
    queryKey: customerKeys.receipts(id),
    queryFn: () => customersApi.getReceipts(id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      toast.success('Thêm khách hàng thành công');
    },
    onError: () => toast.error('Lỗi khi thêm khách hàng'),
  });
}

export function useUpdateCustomerPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { amount: number, payment_date?: string, payment_time?: string, collector_id?: string, notes?: string } }) => customersApi.updatePayment(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.list() });
      queryClient.invalidateQueries({ queryKey: customerKeys.exportOrders(variables.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.receipts(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['export-orders'] });
      toast.success('Thanh toán công nợ thành công');
    },
    onError: () => toast.error('Lỗi khi thanh toán công nợ'),
  });
}
