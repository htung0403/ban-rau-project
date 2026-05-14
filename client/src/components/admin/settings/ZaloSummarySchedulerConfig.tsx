import React, { useState, useEffect } from 'react';
import { Clock, Save, Loader2 } from 'lucide-react';
import { useZaloSummarySchedules, useUpsertSystemSetting } from '../../../hooks/queries/useSystemSettings';
import { SETTING_KEYS } from '../../../constants/systemSettings';
import LoadingSkeleton from '../../shared/LoadingSkeleton';
import ErrorState from '../../shared/ErrorState';
import { TimePicker24h } from '../../shared/TimePicker24h';

const ZaloSummarySchedulerConfig: React.FC = () => {
  const { data: schedules, isLoading, isError, refetch } = useZaloSummarySchedules();
  const upsertSetting = useUpsertSystemSetting();

  const [times, setTimes] = useState({
    grocery: '17:00',
    supplier: '17:00',
    sender: '17:00'
  });

  useEffect(() => {
    if (schedules) {
      setTimes({
        grocery: schedules.grocery,
        supplier: schedules.supplier,
        sender: schedules.sender
      });
    }
  }, [schedules]);

  const handleSave = async () => {
    await Promise.all([
      upsertSetting.mutateAsync({ key: SETTING_KEYS.ZALO_SUMMARY_TIME_GROCERY, value: times.grocery, description: 'Giờ gửi tin nhắn tổng kết khách tạp hóa' }),
      upsertSetting.mutateAsync({ key: SETTING_KEYS.ZALO_SUMMARY_TIME_SUPPLIER, value: times.supplier, description: 'Giờ gửi tin nhắn tổng kết chủ vựa' }),
      upsertSetting.mutateAsync({ key: SETTING_KEYS.ZALO_SUMMARY_TIME_SENDER, value: times.sender, description: 'Giờ gửi tin nhắn tổng kết người gửi' })
    ]);
    refetch();
  };

  if (isLoading) return <LoadingSkeleton type="form" rows={1} />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-[#0068FF]" />
          <h2 className="text-[14px] font-bold text-foreground">Giờ gửi tin nhắn tổng kết Zalo</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={upsertSetting.isPending}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-[13px] font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-md shadow-primary/10"
        >
          {upsertSetting.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Lưu cài đặt
        </button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Khách tạp hóa</label>
            <TimePicker24h 
              value={times.grocery}
              onChange={(val) => setTimes(prev => ({ ...prev, grocery: val }))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Chủ vựa (Nhà cung cấp)</label>
            <TimePicker24h 
              value={times.supplier}
              onChange={(val) => setTimes(prev => ({ ...prev, supplier: val }))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Người gửi (Hàng gửi)</label>
            <TimePicker24h 
              value={times.sender}
              onChange={(val) => setTimes(prev => ({ ...prev, sender: val }))}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
          <p className="text-[12px] text-blue-700 leading-relaxed">
            <b>Lưu ý:</b> Hệ thống sẽ tự động quét và gửi tin nhắn tổng kết vào các khung giờ đã chọn hàng ngày. 
            Nếu có nhiều đơn hàng, quá trình gửi có thể mất vài phút.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ZaloSummarySchedulerConfig;
