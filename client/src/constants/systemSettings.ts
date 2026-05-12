import type { LockSchedule, InventoryTransferRule } from '../types/systemSettings';

export const SETTING_KEYS = {
  LOCK_SCHEDULE: 'system_lock_schedule',
  INVENTORY_TRANSFER: 'inventory_transfer_rule',
} as const;

export const DEFAULT_LOCK_SCHEDULE: LockSchedule = { schedules: [] };

export const DEFAULT_INVENTORY_TRANSFER: InventoryTransferRule = {
  mode: 'hours_after_confirm',
  hours: 24,
  timezone: 'Asia/Ho_Chi_Minh',
};