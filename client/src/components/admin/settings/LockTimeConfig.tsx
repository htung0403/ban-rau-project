import React, { useState } from 'react';
import { Clock, Save, Loader2 } from 'lucide-react';
import { useAppRoles } from '../../../hooks/queries/useRoles';
import { useLockSchedule, useUpsertSystemSetting } from '../../../hooks/queries/useSystemSettings';
import { SETTING_KEYS } from '../../../constants/systemSettings';
import LoadingSkeleton from '../../shared/LoadingSkeleton';
import ErrorState from '../../shared/ErrorState';
import type { AppRole } from '../../../types';
import type { LockSchedule } from '../../../types/systemSettings';

interface RoleScheduleState {
  start_time: string;
  end_time: string;
  days: number[];
}

const DAY_LABELS = [
  { label: 'T2', value: 1 },
  { label: 'T3', value: 2 },
  { label: 'T4', value: 3 },
  { label: 'T5', value: 4 },
  { label: 'T6', value: 5 },
  { label: 'T7', value: 6 },
  { label: 'CN', value: 0 },
];

const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6];

const LockTimeConfig: React.FC = () => {
  const { data: roles, isLoading: rolesLoading, isError: rolesError, refetch: refetchRoles } = useAppRoles();
  const { data: lockSchedule, isLoading: scheduleLoading, isError: scheduleError, refetch: refetchSchedule } = useLockSchedule();
  const upsertSystemSetting = useUpsertSystemSetting();

  const [schedules, setSchedules] = useState<Record<string, RoleScheduleState>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize schedules from API data
  React.useEffect(() => {
    if (roles && lockSchedule) {
      const activeRoles = roles.filter((r: AppRole) => r.is_active);
      const initial: Record<string, RoleScheduleState> = {};

      activeRoles.forEach((role: AppRole) => {
        const existing = lockSchedule.schedules.find((s) => s.role_key === role.role_key);
        if (existing) {
          initial[role.role_key] = {
            start_time: existing.start_time,
            end_time: existing.end_time,
            days: existing.days,
          };
        } else {
          initial[role.role_key] = {
            start_time: '',
            end_time: '',
            days: DEFAULT_DAYS,
          };
        }
      });

      setSchedules(initial);
    }
  }, [roles, lockSchedule]);

  const isPending = upsertSystemSetting.isPending;
  const isLoading = rolesLoading || scheduleLoading;
  const isError = rolesError || scheduleError;

  const handleTimeChange = (roleKey: string, field: 'start_time' | 'end_time', value: string) => {
    setSchedules((prev) => ({
      ...prev,
      [roleKey]: { ...prev[roleKey], [field]: value },
    }));
    setValidationError(null);
  };

  const handleDayToggle = (roleKey: string, dayValue: number) => {
    setSchedules((prev) => {
      const current = prev[roleKey];
      const days = current.days.includes(dayValue)
        ? current.days.filter((d) => d !== dayValue)
        : [...current.days, dayValue].sort((a, b) => {
            if (a === 0) return 1;
            if (b === 0) return -1;
            return a - b;
          });
      return { ...prev, [roleKey]: { ...current, days } };
    });
    setValidationError(null);
  };

  const handleSave = () => {
    setValidationError(null);

    const formatted: LockSchedule['schedules'] = [];
    const errors: string[] = [];

    Object.entries(schedules).forEach(([roleKey, schedule]) => {
      const hasData = schedule.start_time && schedule.end_time;
      if (!hasData) return;

      if (schedule.start_time >= schedule.end_time) {
        errors.push(`Giờ bắt đầu phải nhỏ hơn giờ kết thúc`);
        return;
      }
      if (schedule.days.length === 0) {
        errors.push(`Phải chọn ít nhất 1 ngày`);
        return;
      }

      formatted.push({
        role_key: roleKey,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        days: schedule.days,
      });
    });

    if (errors.length > 0) {
      setValidationError(errors.join('. '));
      return;
    }

    upsertSystemSetting.mutate({
      key: SETTING_KEYS.LOCK_SCHEDULE,
      value: { schedules: formatted },
    });
  };

  const handleRetry = () => {
    refetchRoles();
    refetchSchedule();
  };

  if (isLoading) {
    return <LoadingSkeleton type="form" rows={3} />;
  }

  if (isError) {
    return <ErrorState onRetry={handleRetry} />;
  }

  const activeRoles = roles?.filter((r: AppRole) => r.is_active) ?? [];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-primary" />
          <h2 className="text-[14px] font-bold text-foreground">Khung giờ truy cập hệ thống</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Lưu cấu hình
        </button>
      </div>

      <div className="p-6 space-y-6">
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Cấu hình khung giờ cho phép mỗi vai trò truy cập hệ thống. Ngoài khung giờ đã định nghĩa, người dùng sẽ bị từ chối truy cập.
        </p>

        {validationError && (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-red-500 text-[11px] font-bold">!</span>
            </div>
            <p className="text-[13px] font-medium text-red-700">{validationError}</p>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block overflow-hidden rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-5 py-3 text-[12px] font-bold text-muted-foreground uppercase tracking-wider w-[200px]">Vai trò</th>
                <th className="text-left px-5 py-3 text-[12px] font-bold text-muted-foreground uppercase tracking-wider w-[160px]">Giờ bắt đầu</th>
                <th className="text-left px-5 py-3 text-[12px] font-bold text-muted-foreground uppercase tracking-wider w-[160px]">Giờ kết thúc</th>
                <th className="text-left px-5 py-3 text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Các ngày trong tuần</th>
              </tr>
            </thead>
            <tbody>
              {activeRoles.map((role: AppRole, idx: number) => {
                const schedule = schedules[role.role_key] ?? { start_time: '', end_time: '', days: DEFAULT_DAYS };
                const rowBg = idx % 2 === 0 ? 'bg-card' : 'bg-muted/10';
                return (
                  <tr key={role.role_key} className={`border-b border-border/50 last:border-b-0 ${rowBg}`}>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-[14px] font-bold text-foreground">{role.role_name}</p>
                        {role.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{role.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="time"
                        value={schedule.start_time}
                        onChange={(e) => handleTimeChange(role.role_key, 'start_time', e.target.value)}
                        className="w-full px-3 py-2 text-[13px] font-medium rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="time"
                        value={schedule.end_time}
                        onChange={(e) => handleTimeChange(role.role_key, 'end_time', e.target.value)}
                        className="w-full px-3 py-2 text-[13px] font-medium rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {DAY_LABELS.map((day) => {
                          const isActive = schedule.days.includes(day.value);
                          return (
                            <button
                              key={day.value}
                              onClick={() => handleDayToggle(role.role_key, day.value)}
                              className={`w-[38px] h-[32px] rounded-lg text-[12px] font-bold transition-all ${
                                isActive
                                  ? 'bg-primary text-white shadow-sm'
                                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked cards */}
        <div className="md:hidden space-y-4">
          {activeRoles.map((role: AppRole) => {
            const schedule = schedules[role.role_key] ?? { start_time: '', end_time: '', days: DEFAULT_DAYS };
            return (
              <div key={role.role_key} className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
                <div>
                  <h3 className="text-[14px] font-bold text-foreground">{role.role_name}</h3>
                  {role.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{role.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Giờ bắt đầu</label>
                    <input
                      type="time"
                      value={schedule.start_time}
                      onChange={(e) => handleTimeChange(role.role_key, 'start_time', e.target.value)}
                      className="w-full px-3 py-2 text-[13px] font-medium rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Giờ kết thúc</label>
                    <input
                      type="time"
                      value={schedule.end_time}
                      onChange={(e) => handleTimeChange(role.role_key, 'end_time', e.target.value)}
                      className="w-full px-3 py-2 text-[13px] font-medium rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Các ngày</label>
                  <div className="flex gap-1.5">
                    {DAY_LABELS.map((day) => {
                      const isActive = schedule.days.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          onClick={() => handleDayToggle(role.role_key, day.value)}
                          className={`flex-1 h-[36px] rounded-lg text-[12px] font-bold transition-all ${
                            isActive
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {activeRoles.length === 0 && (
          <div className="text-center py-12">
            <Clock size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-[13px] font-medium text-muted-foreground">Không có vai trò nào đang hoạt động.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LockTimeConfig;
