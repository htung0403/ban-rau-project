import React, { useState } from 'react';
import { useVehicleCollectionSummary } from '../../../hooks/queries/usePaymentCollections';
import { Download, DollarSign } from 'lucide-react';
import EmptyState from '../../../components/shared/EmptyState';
import ErrorState from '../../../components/shared/ErrorState';
import { formatCurrency } from '../../../utils/formatters';

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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)} 
              className="px-3 py-2 border border-slate-200 rounded-lg text-[13px] outline-none" 
            />
            <span className="text-slate-500">-</span>
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)} 
              className="px-3 py-2 border border-slate-200 rounded-lg text-[13px] outline-none" 
            />
          </div>
        </div>
        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-[13px] font-bold rounded-lg hover:bg-slate-50 flex items-center gap-2">
          <Download size={16} /> Xuất Báo Cáo
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-40"><p>Đang tải...</p></div>
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : summaryByDriver.length === 0 ? (
            <EmptyState title="Không có dữ liệu thu tiền trong khoảng thời gian này" />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerSummaryTab;
