import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../api/settingsApi';
import toast from 'react-hot-toast';

export const priceSettingsKeys = {
  all: ['price-settings'] as const,
  roles: ['role-salaries'] as const,
};

export function usePriceSettings() {
  return useQuery({
    queryKey: priceSettingsKeys.all,
    queryFn: () => settingsApi.getPrices(),
  });
}

export function useUpdatePriceSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value, description }: { key: string; value: number; description?: string }) => 
      settingsApi.updatePrice(key, { value, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: priceSettingsKeys.all });
      toast.success('Cập nhật mức lương thành công');
    },
    onError: () => toast.error('Lỗi khi cập nhật mức lương'),
  });
}

export function useRoleSalaries() {
  return useQuery({
    queryKey: priceSettingsKeys.roles,
    queryFn: () => settingsApi.getRoleSalaries(),
  });
}

export function useUpsertRoleSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { role_key: string; role_name: string; daily_wage: number; description?: string }) => 
      settingsApi.upsertRoleSalary(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: priceSettingsKeys.roles });
      toast.success('Cập nhật cấp bậc thành công');
    },
    onError: () => toast.error('Lỗi khi cập nhật cấp bậc'),
  });
}

export function useDeleteRoleSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => settingsApi.deleteRoleSalary(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: priceSettingsKeys.roles });
      toast.success('Xóa cấp bậc thành công');
    },
    onError: () => toast.error('Lỗi khi xóa cấp bậc'),
  });
}
