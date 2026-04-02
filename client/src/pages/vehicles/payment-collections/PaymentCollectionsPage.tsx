import React, { useState } from 'react';
import PageHeader from '../../../components/shared/PageHeader';
import { useAuth } from '../../../context/AuthContext';
import { clsx } from 'clsx';
import DriverPaymentTab from './DriverPaymentTab';
import StaffConfirmationTab from './StaffConfirmationTab';
import ManagerSummaryTab from './ManagerSummaryTab';

const PaymentCollectionsPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'driver';

  // Default tab logic based on role
  const getDefaultTab = () => {
    if (role === 'driver') return 'thu-tien';
    return 'xac-nhan';
  };

  const [activeTab, setActiveTab] = useState<'thu-tien' | 'xac-nhan' | 'tong-hop'>(getDefaultTab());

  const tabs = [];
  if (role === 'driver' || role === 'staff' || role === 'manager' || role === 'admin') {
    tabs.push({ id: 'thu-tien', label: 'Thu Tiền' });
  }
  if (role === 'staff' || role === 'manager' || role === 'admin') {
    tabs.push({ id: 'xac-nhan', label: 'Xác Nhận Thu Tiền' });
  }
  if (role === 'manager' || role === 'admin') {
    tabs.push({ id: 'tong-hop', label: 'Tổng Hợp Thu Tiền' });
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader
        title="Quản lý thu tiền hàng"
        description="Quản lý phiếu thu tiền, nộp tiền, và xác nhận công nợ"
        backPath="/quan-ly-xe"
      />

      <div className="bg-card rounded-xl shadow-sm border border-border p-2 mb-6 flex bg-muted/30">
        <div className="flex bg-muted rounded-lg p-1 w-full overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                "flex-1 sm:flex-none px-4 py-2 rounded-md text-[13px] font-bold transition-all duration-200 whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-card text-primary shadow-sm ring-1 ring-black/5"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'thu-tien' && <DriverPaymentTab readonly={role !== 'driver'} />}
        {activeTab === 'xac-nhan' && <StaffConfirmationTab />}
        {activeTab === 'tong-hop' && <ManagerSummaryTab />}
      </div>
    </div>
  );
};

export default PaymentCollectionsPage;
