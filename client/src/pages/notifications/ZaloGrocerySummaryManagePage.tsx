import React from 'react';
import ZaloSummaryDispatchPage from './ZaloSummaryDispatchPage';

const ZaloGrocerySummaryManagePage: React.FC = () => {
  return (
    <ZaloSummaryDispatchPage
      type="grocery"
      title="Tổng kết Zalo khách tạp hóa"
      description="Theo dõi trạng thái gửi tổng kết cuối ngày cho khách hàng tạp hóa và gửi lại khi cần."
    />
  );
};

export default ZaloGrocerySummaryManagePage;

