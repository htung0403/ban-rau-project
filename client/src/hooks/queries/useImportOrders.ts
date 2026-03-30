import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importOrdersApi } from '../../api/importOrdersApi';
import type { ImportOrderFilters, ImportOrderCreatePayload } from '../../types';
import toast from 'react-hot-toast';

export const importOrderKeys = {
  all: ['import-orders'] as const,
  list: (filters?: ImportOrderFilters) => [...importOrderKeys.all, 'list', filters] as const,
  detail: (id: string) => [...importOrderKeys.all, 'detail', id] as const,
};

export function useImportOrders(filters?: ImportOrderFilters) {
  return useQuery({
    queryKey: importOrderKeys.list(filters),
    queryFn: () => importOrdersApi.getAll(filters),
  });
}

export function useImportOrder(id: string) {
  return useQuery({
    queryKey: importOrderKeys.detail(id),
    queryFn: () => importOrdersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateImportOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ImportOrderCreatePayload) => importOrdersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importOrderKeys.all });
      toast.success('Tạo đơn nhập hàng thành công');
    },
    onError: () => {
      toast.error('Lỗi khi tạo đơn nhập hàng');
    },
  });
}

export function useUpdateImportOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ImportOrderCreatePayload> }) =>
      importOrdersApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importOrderKeys.all });
      toast.success('Cập nhật đơn nhập hàng thành công');
    },
    onError: () => {
      toast.error('Lỗi khi cập nhật đơn nhập hàng');
    },
  });
}

export function useDeleteImportOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => importOrdersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importOrderKeys.all });
      toast.success('Xóa đơn nhập hàng thành công');
    },
    onError: () => {
      toast.error('Lỗi khi xóa đơn nhập hàng');
    },
  });
}
