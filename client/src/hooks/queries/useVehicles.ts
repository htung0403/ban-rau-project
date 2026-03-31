import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiclesApi } from '../../api/vehiclesApi';
import toast from 'react-hot-toast';

export const vehicleKeys = {
  all: ['vehicles'] as const,
  list: () => [...vehicleKeys.all, 'list'] as const,
  checkins: (id: string) => [...vehicleKeys.all, 'checkins', id] as const,
  collections: () => [...vehicleKeys.all, 'collections'] as const,
};

export function useVehicles(enabled = true) {
  return useQuery({
    queryKey: vehicleKeys.list(),
    queryFn: () => vehiclesApi.getAll(),
    enabled,
  });
}

export function useVehicleCheckins(id: string) {
  return useQuery({
    queryKey: vehicleKeys.checkins(id),
    queryFn: () => vehiclesApi.getCheckins(id),
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehiclesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      toast.success('Thêm xe thành công');
    },
    onError: () => toast.error('Lỗi khi thêm xe'),
  });
}

export function useCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof vehiclesApi.checkin>[1] }) =>
      vehiclesApi.checkin(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      toast.success('Điểm danh thành công');
    },
    onError: () => toast.error('Lỗi khi điểm danh'),
  });
}

export function useDriverCheckins(vehicleId?: string) {
  return useQuery({
    queryKey: vehicleKeys.checkins(vehicleId || 'all'),
    queryFn: () => vehicleId ? vehiclesApi.getCheckins(vehicleId) : Promise.resolve([]),
    enabled: !!vehicleId,
  });
}

export function useCheckinDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ vehicleId, payload }: { vehicleId: string; payload: Parameters<typeof vehiclesApi.checkin>[1] }) => {
      return vehiclesApi.checkin(vehicleId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      toast.success('Check-in thành công');
    },
    onError: () => toast.error('Lỗi khi check-in'),
  });
}

export function useVehicleAssignments(id?: string) {
  return useQuery({
    queryKey: [...vehicleKeys.all, 'assignments', id],
    queryFn: () => id ? vehiclesApi.getAssignments(id) : Promise.resolve([]),
    enabled: !!id,
  });
}
