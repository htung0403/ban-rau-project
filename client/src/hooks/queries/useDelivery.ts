import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryApi } from '../../api/deliveryApi';
import toast from 'react-hot-toast';

export const deliveryKeys = {
  all: ['delivery'] as const,
  today: () => [...deliveryKeys.all, 'today'] as const,
  inventory: () => [...deliveryKeys.all, 'inventory'] as const,
};

export function useDeliveryOrders() {
  return useQuery({
    queryKey: deliveryKeys.today(),
    queryFn: () => deliveryApi.getAllToday(),
  });
}

export function useDeliveryInventory() {
  return useQuery({
    queryKey: deliveryKeys.inventory(),
    queryFn: () => deliveryApi.getInventory(),
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
    mutationFn: ({ id, payload }: { id: string; payload: { vehicle_id: string; driver_id: string; assigned_quantity: number } }) =>
      deliveryApi.assignVehicle(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      toast.success('Gắn xe thành công');
    },
    onError: () => toast.error('Lỗi khi gắn xe'),
  });
}
