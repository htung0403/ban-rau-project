import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Package, Save, Loader2, Clock } from 'lucide-react';
import { useInventoryTransferRule, useUpsertSystemSetting } from '../../../hooks/queries/useSystemSettings';
import { SETTING_KEYS, DEFAULT_INVENTORY_TRANSFER } from '../../../constants/systemSettings';
import LoadingSkeleton from '../../shared/LoadingSkeleton';
import ErrorState from '../../shared/ErrorState';
import type { InventoryTransferRule } from '../../../types/systemSettings';

type Mode = 'hours_after_confirm' | 'fixed_time';

interface FormData {
  mode: Mode;
  hours: number;
  fixed_time: string;
}

const GoodsConversionConfig: React.FC = () => {
  const { data, isLoading, isError, refetch } = useInventoryTransferRule();
  const upsertSystemSetting = useUpsertSystemSetting();

  const [form, setForm] = useState<FormData>({
    mode: 'hours_after_confirm',
    hours: 24,
    fixed_time: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize form from API data
  useEffect(() => {
    if (data) {
      const rule = data as InventoryTransferRule;
      setForm({
        mode: rule.mode,
        hours: rule.hours ?? DEFAULT_INVENTORY_TRANSFER.hours ?? 24,
        fixed_time: rule.fixed_time ?? '',
      });
    }
  }, [data]);

  const validate = (): boolean => {
    setValidationError(null);

    if (form.mode === 'hours_after_confirm') {
      if (!form.hours || form.hours < 1 || form.hours > 168) {
        setValidationError('Số giờ phải từ 1 đến 168');
        return false;
      }
    } else {
      if (!form.fixed_time || !/^\d{2}:\d{2}$/.test(form.fixed_time)) {
        setValidationError('Vui lòng chọn mốc giờ hợp lệ (HH:mm)');
        return false;
      }
    }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    const value: InventoryTransferRule = {
      mode: form.mode,
      hours: form.mode === 'hours_after_confirm' ? form.hours : undefined,
      fixed_time: form.mode === 'fixed_time' ? form.fixed_time : undefined,
      timezone: 'Asia/Ho_Chi_Minh',
    };

    upsertSystemSetting.mutate({
      key: SETTING_KEYS.INVENTORY_TRANSFER,
      value,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-primary" />
            <h2 className="text-[14px] font-bold text-foreground">Chuyển hàng mới sang hàng cũ</h2>
          </div>
        </div>
        <div className="p-6">
          <LoadingSkeleton type="form" rows={2} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-primary" />
            <h2 className="text-[14px] font-bold text-foreground">Chuyển hàng mới sang hàng cũ</h2>
          </div>
        </div>
        <div className="p-6">
          <ErrorState onRetry={refetch} />
        </div>
      </div>
    );
  }

  const modes: { id: Mode; label: string }[] = [
    { id: 'hours_after_confirm', label: 'Theo số giờ sau xác nhận' },
    { id: 'fixed_time', label: 'Theo mốc giờ trong ngày' },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-primary" />
          <h2 className="text-[14px] font-bold text-foreground">Chuyển hàng mới sang hàng cũ</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={upsertSystemSetting.isPending}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all",
            upsertSystemSetting.isPending
              ? "bg-primary/50 text-white/70 cursor-not-allowed"
              : "bg-primary text-white hover:bg-primary/90 shadow-sm"
          )}
        >
          {upsertSystemSetting.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {upsertSystemSetting.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Mode Toggle */}
        <div className="space-y-3">
          <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" />
            Chế độ chuyển hàng
          </h3>
          <div className="flex bg-muted rounded-xl w-fit p-1">
            {modes.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setForm((prev) => ({ ...prev, mode: item.id }));
                  setValidationError(null);
                }}
                className={clsx(
                  "flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-medium transition-all",
                  form.mode === item.id
                    ? "bg-card text-primary shadow-sm ring-1 ring-black/5"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conditional Input */}
        {form.mode === 'hours_after_confirm' ? (
          <div className="space-y-2">
            <label className="text-[12px] font-semibold text-foreground">
              Số giờ sau khi xác nhận
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={168}
                value={form.hours}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, hours: parseInt(e.target.value, 10) || 0 }));
                  setValidationError(null);
                }}
                className="w-32 h-10 px-3 rounded-xl border border-border bg-card text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <span className="text-[13px] text-muted-foreground font-medium">giờ</span>
            </div>
            {validationError && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{validationError}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Hàng mới sẽ tự động chuyển sang hàng cũ sau số giờ này (tối đa 168 giờ = 7 ngày).
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-[12px] font-semibold text-foreground">
              Mốc giờ cố định
            </label>
            <input
              type="time"
              value={form.fixed_time}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, fixed_time: e.target.value }));
                setValidationError(null);
              }}
              className="h-10 px-3 rounded-xl border border-border bg-card text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            {validationError && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{validationError}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Hàng mới sẽ tự động chuyển sang hàng cũ vào mốc giờ này mỗi ngày.
            </p>
          </div>
        )}

        {/* Timezone (readonly) */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Clock size={12} className="text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground font-medium">
            Múi giờ: Asia/Ho_Chi_Minh
          </span>
          <span className="text-[10px] font-bold text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full">
            Không đổi
          </span>
        </div>
      </div>
    </div>
  );
};

export default GoodsConversionConfig;
