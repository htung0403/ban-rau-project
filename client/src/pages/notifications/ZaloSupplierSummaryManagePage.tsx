import React from 'react';
import ZaloSummaryDispatchPage from './ZaloSummaryDispatchPage';

const ZaloSupplierSummaryManagePage: React.FC = () => {
  return (
    <ZaloSummaryDispatchPage
      type="supplier"
      title="Tổng kết Zalo vựa rau"
      description="Theo dõi trạng thái gửi tổng kết cuối ngày cho vựa rau và gửi lại khi cần."
    />
  );
};

export default ZaloSupplierSummaryManagePage;

