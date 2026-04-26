import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryApi } from '../../api/deliveryApi';
import toast from 'react-hot-toast';
import { importOrderKeys } from './useImportOrders';
import { exportOrderKeys } from './useExportOrders';

export const deliveryKeys = {
  all: ['delivery'] as const,
  today: () => [...deliveryKeys.all, 'today'] as const,
  inventory: () => [...deliveryKeys.all, 'inventory'] as const,
};

export function useDeliveryOrders(startDate?: string, endDate?: string, orderCategory?: 'standard' | 'vegetable') {
  return useQuery({
    queryKey: [...deliveryKeys.all, 'filter', startDate, endDate, orderCategory],
    queryFn: () => deliveryApi.getAllToday(startDate || undefined, endDate || undefined, orderCategory),
  });
}

export function useDeliveryInventory(orderCategory?: 'standard' | 'vegetable') {
  return useQuery({
    queryKey: [...deliveryKeys.inventory(), orderCategory],
    queryFn: () => deliveryApi.getInventory(orderCategory),
  });
}

export function useAllPendingDeliveries() {
  return useQuery({
    queryKey: [...deliveryKeys.all, 'all-pending'],
    queryFn: () => deliveryApi.getAllToday(), // No params means all (based on service change)
  });
}

export function useCreateDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deliveryApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      toast.success('Tạo đơn giao hàng thành công');
    },
    onError: () => toast.error('Lỗi khi tạo đơn giao hàng'),
  });
}

export function useUpdateDeliveryOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => deliveryApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      toast.success('Cập nhật đơn giao hàng thành công');
    },
    onError: () => toast.error('Lỗi khi cập nhật đơn giao hàng'),
  });
}

export function useAssignVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      deliveryApi.assignVehicle(id, payload as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: importOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: exportOrderKeys.all });
      toast.success('Gắn xe thành công');
    },
    onError: () => toast.error('Lỗi khi gắn xe'),
  });
}

export function useConfirmDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deliveryApi.confirmOrders(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      toast.success('Đã xác nhận giao hàng');
    },
    onError: () => toast.error('Lỗi khi xác nhận'),
  });
}

export function useConfirmWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deliveryApi.confirmWarehouse(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      toast.success('Đã xác nhận giao hàng tồn kho');
    },
    onError: () => toast.error('Lỗi khi xác nhận tồn kho'),
  });
}

export function useDeleteDeliveryOrders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deliveryApi.deleteOrders(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      toast.success('Đã xóa đơn giao hàng');
    },
    onError: () => toast.error('Lỗi khi xóa đơn giao hàng'),
  });
}

export function useRevertVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vehicleId }: { id: string; vehicleId: string }) =>
      deliveryApi.revertVehicle(id, vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: exportOrderKeys.all });
      toast.success('Đã hoàn tác xe');
    },
    onError: () => toast.error('Lỗi khi hoàn tác xe'),
  });
}
