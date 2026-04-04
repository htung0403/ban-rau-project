import React, { useState } from 'react';
import { useVehicleCollectionSummary } from '../../../hooks/queries/usePaymentCollections';
import { Download, DollarSign } from 'lucide-react';
import EmptyState from '../../../components/shared/EmptyState';
import ErrorState from '../../../components/shared/ErrorState';
import { DateRangePicker } from '../../../components/shared/DateRangePicker';
import { formatCurrency } from '../../../utils/formatters';
import { format } from 'date-fns';

const ManagerSummaryTab: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const { data: collections, isLoading, isError, refetch } = useVehicleCollectionSummary({ dateFrom, dateTo });

  // Group by Driver/Vehicle for summary
  const summaryByDriver = React.useMemo(() => {
    if (!collections) return [];
    
    // Chỉ lấy những phiếu đã xác nhận (confirmed hoặc self_confirmed) để tính tổng hợp chính xác
    const validCollections = collections.filter(c => c.status === 'confirmed' || c.status === 'self_confirmed');
    
    const map = new Map<string, { driverName: string, vehiclePlate: string, totalAmount: number, count: number }>();
    
    validCollections.forEach(c => {
      const key = `${c.driverId}-${c.vehicleId}`;
      if (!map.has(key)) {
        map.set(key, { driverName: c.driverName, vehiclePlate: c.licensePlate, totalAmount: 0, count: 0 });
      }
      const existing = map.get(key)!;
      existing.totalAmount += c.collectedAmount;
      existing.count += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [collections]);

  const totalCollected = summaryByDriver.reduce((sum, d) => sum + d.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-500">Tổng Tiền Đã Thu (Đã XN)</p>
            <p className="text-[20px] font-bold text-slate-800">{formatCurrency(totalCollected)}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-row items-center justify-between gap-2 sm:gap-4 w-full">
        <div className="flex-1 min-w-0">
          <DateRangePicker 
            initialDateFrom={dateFrom}
            initialDateTo={dateTo}
            onUpdate={({ range }) => {
              setDateFrom(range.from ? format(range.from, 'yyyy-MM-dd') : '');
              setDateTo(range.to ? format(range.to, 'yyyy-MM-dd') : '');
            }}
          />
        </div>
        <button className="shrink-0 h-[38px] px-3 sm:px-4 py-2 bg-white border border-slate-200 text-slate-700 text-[13px] font-bold rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2">
          <Download size={16} className="shrink-0" />
          <span className="hidden sm:inline">Xuất Báo Cáo</span>
        </button>
      </div>

      {/* Table & Cards */}
      <div className="bg-transparent md:bg-white border-0 md:border border-slate-200 md:rounded-xl md:shadow-sm md:overflow-hidden">
        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-40"><p>Đang tải...</p></div>
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : summaryByDriver.length === 0 ? (
            <EmptyState title="Không có dữ liệu thu tiền trong khoảng thời gian này" />
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="md:hidden flex flex-col gap-3 pb-6">
                {summaryByDriver.map((summary, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-800 text-[14px]">{summary.driverName}</h3>
                        <p className="text-[12px] text-slate-500">{summary.vehiclePlate || 'Không có xe'}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center rounded-lg bg-slate-50 p-3 border border-slate-100">
                      <div className="text-center w-1/2 border-r border-slate-200 pr-3">
                        <p className="text-[11px] text-slate-500 mb-1">Số Phiếu</p>
                        <p className="font-bold text-slate-800 text-[14px]">{summary.count}</p>
                      </div>
                      <div className="text-center w-1/2 pl-3">
                        <p className="text-[11px] text-slate-500 mb-1">Tổng Thu (Đã XN)</p>
                        <p className="font-extrabold text-green-600 text-[15px]">{formatCurrency(summary.totalAmount)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto pb-6">
                <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[12px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-6 py-4">Tài Xế</th>
                  <th className="px-6 py-4">Xe Giao Hàng</th>
                  <th className="px-6 py-4 text-center">Số Lượng Phiếu</th>
                  <th className="px-6 py-4 text-right">Tổng Tiền Thu Về</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryByDriver.map((summary, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-[14px]">
                      <div className="font-bold text-slate-800">{summary.driverName}</div>
                    </td>
                    <td className="px-6 py-4 text-[14px] font-medium text-slate-600">
                      {summary.vehiclePlate || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-[14px] font-bold text-slate-800 text-center">
                      {summary.count} phiếu
                    </td>
                    <td className="px-6 py-4 text-[14px] font-bold text-green-700 text-right">
                      {formatCurrency(summary.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerSummaryTab;
