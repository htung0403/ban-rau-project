import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi } from '../../api/warehouseApi';
import toast from 'react-hot-toast';

export const warehouseKeys = {
  all: ['warehouses'] as const,
  list: () => [...warehouseKeys.all, 'list'] as const,
  detail: (id: string) => [...warehouseKeys.all, 'detail', id] as const,
};

export function useWarehouses(enabled = true) {
  return useQuery({
    queryKey: warehouseKeys.list(),
    queryFn: () => warehouseApi.getAll(),
    enabled,
  });
}

export function useWarehouse(id: string) {
  return useQuery({
    queryKey: warehouseKeys.detail(id),
    queryFn: () => warehouseApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: warehouseApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.all });
      toast.success('Tạo kho thành công');
    },
    onError: () => toast.error('Lỗi khi tạo kho'),
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof warehouseApi.update>[1] }) =>
      warehouseApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.all });
      toast.success('Cập nhật kho thành công');
    },
    onError: () => toast.error('Lỗi khi cập nhật kho'),
  });
}
