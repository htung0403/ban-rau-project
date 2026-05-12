import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../api/settingsApi';
import toast from 'react-hot-toast';
import {
  SETTING_KEYS,
  DEFAULT_LOCK_SCHEDULE,
  DEFAULT_INVENTORY_TRANSFER,
} from '../../constants/systemSettings';
import type { LockSchedule, InventoryTransferRule } from '../../types/systemSettings';

export const systemSettingsKeys = {
  all: ['system-settings'] as const,
  lockSchedule: ['system-settings', 'lock'] as const,
  inventoryTransfer: ['system-settings', 'inventory'] as const,
};

export function useLockSchedule() {
  return useQuery({
    queryKey: systemSettingsKeys.lockSchedule,
    queryFn: async () => {
      try {
        const data = await settingsApi.getGeneralSettingByKey(SETTING_KEYS.LOCK_SCHEDULE);
        return (data?.setting_value as LockSchedule) || DEFAULT_LOCK_SCHEDULE;
      } catch {
        return DEFAULT_LOCK_SCHEDULE;
      }
    },
  });
}

export function useInventoryTransferRule() {
  return useQuery({
    queryKey: systemSettingsKeys.inventoryTransfer,
    queryFn: async () => {
      try {
        const data = await settingsApi.getGeneralSettingByKey(SETTING_KEYS.INVENTORY_TRANSFER);
        return (data?.setting_value as InventoryTransferRule) || DEFAULT_INVENTORY_TRANSFER;
      } catch {
        return DEFAULT_INVENTORY_TRANSFER;
      }
    },
  });
}

export function useUpsertSystemSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value, description }: { key: string; value: any; description?: string }) =>
      settingsApi.upsertGeneralSetting(key, { value, description }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: systemSettingsKeys.all });
      if (variables.key === SETTING_KEYS.LOCK_SCHEDULE) {
        queryClient.invalidateQueries({ queryKey: systemSettingsKeys.lockSchedule });
      }
      if (variables.key === SETTING_KEYS.INVENTORY_TRANSFER) {
        queryClient.invalidateQueries({ queryKey: systemSettingsKeys.inventoryTransfer });
      }
      toast.success('Cập nhật cấu hình thành công');
    },
    onError: () => {
      toast.error('Lỗi khi cập nhật cấu hình');
    },
  });
}