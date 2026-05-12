export interface LockSchedule {
  schedules: Array<{
    role_key: string;
    start_time: string; // "HH:mm"
    end_time: string;   // "HH:mm"
    days: number[];     // 0=Sun, 1=Mon, ... 6=Sat. Default [1,2,3,4,5,6]
  }>;
}

export interface InventoryTransferRule {
  mode: 'hours_after_confirm' | 'fixed_time';
  hours?: number;       // required if mode='hours_after_confirm', min 1
  fixed_time?: string;  // "HH:mm", required if mode='fixed_time'
  timezone: string;     // always 'Asia/Ho_Chi_Minh'
}