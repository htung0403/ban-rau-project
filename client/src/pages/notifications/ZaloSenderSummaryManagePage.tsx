import React from 'react';
import ZaloSummaryDispatchPage from './ZaloSummaryDispatchPage';

const ZaloSenderSummaryManagePage: React.FC = () => {
  return (
    <ZaloSummaryDispatchPage
      type="sender"
      title="Tổng kết Zalo người gửi rau"
      description="Theo dõi trạng thái gửi tổng kết cuối ngày cho người gửi rau và gửi lại khi cần."
    />
  );
};

export default ZaloSenderSummaryManagePage;

