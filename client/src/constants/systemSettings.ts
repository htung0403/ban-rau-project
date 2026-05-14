import type { LockSchedule, InventoryTransferRule } from '../types/systemSettings';

export const SETTING_KEYS = {
  LOCK_SCHEDULE: 'system_lock_schedule',
  INVENTORY_TRANSFER: 'inventory_transfer_rule',
  ZALO_SUMMARY_TIME_GROCERY: 'zalo_summary_time_grocery',
  ZALO_SUMMARY_TIME_SUPPLIER: 'zalo_summary_time_supplier',
  ZALO_SUMMARY_TIME_SENDER: 'zalo_summary_time_sender',
} as const;

export const DEFAULT_LOCK_SCHEDULE: LockSchedule = { schedules: [] };

export const DEFAULT_INVENTORY_TRANSFER: InventoryTransferRule = {
  mode: 'hours_after_confirm',
  hours: 24,
  timezone: 'Asia/Ho_Chi_Minh',
};