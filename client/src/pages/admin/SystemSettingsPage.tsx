import React from 'react';
import { Settings } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import ZaloConfig from '../../components/shared/ZaloConfig';
import ZaloSummarySchedulerConfig from '../../components/admin/settings/ZaloSummarySchedulerConfig';
import LockTimeConfig from '../../components/admin/settings/LockTimeConfig';
import GoodsConversionConfig from '../../components/admin/settings/GoodsConversionConfig';

const SystemSettingsPage: React.FC = () => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      {/* PageHeader - hidden on mobile, shown on md+ */}
      <div className="hidden md:block">
        <PageHeader
          title="Cài đặt hệ thống"
          description="Quản lý các thiết lập hệ thống như khung giờ truy cập, quy tắc chuyển hàng, và cấu hình Zalo."
          backPath="/hanh-chinh-nhan-su"
        />
      </div>

      {/* Mobile header */}
      <div className="md:hidden mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Settings size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Cài đặt hệ thống</h1>
            <p className="text-[12px] text-muted-foreground">Quản lý thiết lập hệ thống</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        <ZaloConfig />
        <ZaloSummarySchedulerConfig />
        <LockTimeConfig />
        <GoodsConversionConfig />
      </div>
    </div>
  );
};

export default SystemSettingsPage;
