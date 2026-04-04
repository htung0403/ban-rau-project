import React, { useState } from 'react';
import { usePaymentCollections } from '../../../hooks/queries/usePaymentCollections';
import { Search, CheckCircle } from 'lucide-react';
import EmptyState from '../../../components/shared/EmptyState';
import ErrorState from '../../../components/shared/ErrorState';
import ConfirmReceptionDialog from './dialogs/ConfirmReceptionDialog';
import { formatCurrency, formatDate, formatTime } from '../../../utils/formatters';
import type { PaymentCollection } from '../../../types';

const StaffConfirmationTab: React.FC = () => {
  const { data: collections, isLoading, isError, refetch } = usePaymentCollections();
  
  const [filterSearch, setFilterSearch] = useState('');
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedPC, setSelectedPC] = useState<PaymentCollection | null>(null);

  // Lọc chỉ lấy những phiếu đang ở trạng thái submitted (chờ xác nhận)
  // Trong thực tế có thể lọc thêm c.receiverId === user.id
  let filtered = collections?.filter(c => c.status === 'submitted') || [];

  if (filterSearch) {
    const term = filterSearch.toLowerCase();
    filtered = filtered.filter(c => 
      c.deliveryOrderCode.toLowerCase().includes(term) ||
      c.driverName?.toLowerCase().includes(term) ||
      c.customerName?.toLowerCase().includes(term)
    );
  }

  const handleConfirm = (pc: PaymentCollection) => {
    setSelectedPC(pc);
    setIsConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
               type="text" 
               placeholder="Tìm mã đơn, tài xế..." 
               value={filterSearch} 
               onChange={e => setFilterSearch(e.target.value)} 
               className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-[13px] w-full sm:w-[300px]" 
             />
          </div>
        </div>
      </div>

      {/* Lists & Tables */}
      <div className="bg-transparent md:bg-white border-0 md:border border-slate-200 md:rounded-xl md:shadow-sm md:overflow-hidden">
        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-40"><p>Đang tải...</p></div>
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState title="Không có phiếu thu nào đang rảnh xác nhận" />
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="md:hidden flex flex-col gap-3 pb-6">
                {filtered.map(pc => (
                  <div key={pc.id} className="bg-white rounded-xl border border-yellow-200/50 p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-500" />
                    
                    <div className="flex justify-between items-start mb-3 pl-2">
                      <div>
                        <h3 className="font-bold text-slate-800 text-[14px]">{pc.deliveryOrderCode}</h3>
                        <p className="text-[12px] text-slate-500">{pc.customerName}</p>
                      </div>
                      <span className="bg-yellow-100 text-yellow-700 text-[11px] px-2 py-0.5 rounded font-bold">Chờ XN</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 pl-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div>
                        <p className="text-slate-500 text-[11px]">Tài xế</p>
                        <p className="font-bold text-slate-800 text-[13px]">{pc.driverName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 text-[11px]">Tiền Thực Thu</p>
                        <p className="font-bold text-slate-800 text-[13px]">{formatCurrency(pc.collectedAmount)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 pl-2">
                       <div className="text-[11px] text-slate-500">
                         {pc.submittedAt ? (
                           <>{formatDate(pc.submittedAt)} {formatTime(pc.submittedAt)}</>
                         ) : '-'}
                       </div>
                       <button 
                         onClick={() => handleConfirm(pc)} 
                         className="text-[12px] font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm shadow-green-600/20"
                       >
                         <CheckCircle size={14} /> Xác Nhận
                       </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto pb-6">
                <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[12px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-4 py-3">Phiếu / Khách Hàng</th>
                  <th className="px-4 py-3">Tài Xế</th>
                  <th className="px-4 py-3">Tiền Thực Thu</th>
                  <th className="px-4 py-3">Người Nhận</th>
                  <th className="px-4 py-3">Trạng Thái</th>
                  <th className="px-4 py-3">Ngày Nộp</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(pc => (
                  <tr key={pc.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-[13px]">
                      <div className="font-bold text-slate-800">{pc.deliveryOrderCode}</div>
                      <div className="text-slate-500">{pc.customerName}</div>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium text-slate-600">
                      {pc.driverName}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-bold text-slate-800">
                      {formatCurrency(pc.collectedAmount)}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">
                      {pc.receiverName ? (
                        <span className="font-medium">{pc.receiverName}</span>
                      ) : (
                        <span className="text-slate-400 italic">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium text-slate-600 space-y-1">
                      {pc.difference < 0 ? (
                        <span className="inline-block text-red-600 border border-red-200 bg-red-50 px-2 py-0.5 rounded-md">Thiếu {formatCurrency(Math.abs(pc.difference))}</span>
                      ) : pc.difference > 0 ? (
                        <span className="inline-block text-green-600 border border-green-200 bg-green-50 px-2 py-0.5 rounded-md">Thừa {formatCurrency(pc.difference)}</span>
                      ) : (
                        <span className="inline-block text-slate-500">Đủ đơn</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">
                      {pc.submittedAt ? (
                        <>
                          <div>{formatDate(pc.submittedAt)}</div>
                          <div className="text-slate-400">{formatTime(pc.submittedAt)}</div>
                        </>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button 
                        onClick={() => handleConfirm(pc)} 
                        className="text-[12px] font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md flex items-center gap-1 inline-flex"
                      >
                        <CheckCircle size={14} /> Xác Nhận
                      </button>
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

      {isConfirmOpen && selectedPC && (
        <ConfirmReceptionDialog isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} payment={selectedPC} />
      )}
    </div>
  );
};

export default StaffConfirmationTab;
