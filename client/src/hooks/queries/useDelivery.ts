import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryApi } from '../../api/deliveryApi';
import toast from 'react-hot-toast';
import { importOrderKeys } from './useImportOrders';

export const deliveryKeys = {
  all: ['delivery'] as const,
  today: () => [...deliveryKeys.all, 'today'] as const,
  inventory: () => [...deliveryKeys.all, 'inventory'] as const,
};

export function useDeliveryOrders(startDate?: string, endDate?: string, orderCategory?: 'standard' | 'vegetable') {
  return useQuery({
    queryKey: [...deliveryKeys.all, 'filter', startDate, endDate, orderCategory],
    queryFn: () => deliveryApi.getAllToday(startDate, endDate, orderCategory),
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

export function useAssignVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { vehicle_id: string; driver_id: string; quantity: number } }) =>
      deliveryApi.assignVehicle(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: importOrderKeys.all });
      toast.success('Gắn xe thành công');
    },
    onError: () => toast.error('Lỗi khi gắn xe'),
  });
}
