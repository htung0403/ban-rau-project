import React, { useState } from 'react';

import { usePaymentCollections, useRevertPaymentCollection } from '../../../hooks/queries/usePaymentCollections';
import { Plus, Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import EmptyState from '../../../components/shared/EmptyState';
import ErrorState from '../../../components/shared/ErrorState';
import CreateEditPaymentDialog from './dialogs/CreateEditPaymentDialog';
import SubmitPaymentDialog from './dialogs/SubmitPaymentDialog';
import SelfConfirmDialog from './dialogs/SelfConfirmDialog';
import DraggableFAB from '../../../components/shared/DraggableFAB';
import { DatePicker } from '../../../components/shared/DatePicker';
import { CustomSelect } from '../../../components/shared/CustomSelect';
import { formatCurrency, formatDate, formatTime } from '../../../utils/formatters';
import type { PaymentCollection, PaymentCollectionStatus } from '../../../types';

interface Props {
  readonly?: boolean;
}

const DriverPaymentTab: React.FC<Props> = ({ readonly }) => {
  const { data: collections, isLoading, isError, refetch } = usePaymentCollections();

  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<PaymentCollectionStatus | ''>('');

  // Dialogs state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPC, setSelectedPC] = useState<PaymentCollection | null>(null);

  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isSelfConfirmOpen, setIsSelfConfirmOpen] = useState(false);

  const { mutate: revert } = useRevertPaymentCollection();

  const filtered = collections?.filter(c => {
    if (filterDate && c.collectedAt.substring(0, 10) !== filterDate) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  }) || [];

  const handleAction = (action: string, pc: PaymentCollection) => {
    setSelectedPC(pc);
    if (action === 'submit') setIsSubmitOpen(true);
    if (action === 'self_confirm') setIsSelfConfirmOpen(true);
    if (action === 'edit') setIsCreateOpen(true);
  };

  const getStatusBadge = (status: PaymentCollectionStatus) => {
    switch (status) {
      case 'draft': return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-600">Chưa Nộp</span>;
      case 'submitted': return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-yellow-100 text-yellow-700">Chờ Xác Nhận</span>;
      case 'confirmed': return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-green-100 text-green-700">Đã Xác Nhận</span>;
      case 'self_confirmed': return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-100 text-blue-700">Tự Xác Nhận</span>;
      default: return null;
    }
  };

  // Summary logic
  const today = new Date().toISOString().substring(0, 10);
  const todayCollections = collections?.filter(c => c.collectedAt.startsWith(today)) || [];
  const totalCollectedToday = todayCollections.reduce((sum, c) => sum + c.collectedAmount, 0);

  const pendingCount = collections?.filter(c => c.status === 'submitted').length || 0;
  const confirmedCount = collections?.filter(c => c.status === 'confirmed' || c.status === 'self_confirmed').length || 0;
  const missingAmount = collections?.filter(c => c.difference < 0 && c.status !== 'draft').reduce((sum, c) => sum + Math.abs(c.difference), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Download size={20} />
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-500">Tổng Thu Hôm Nay</p>
            <p className="text-[16px] font-bold text-slate-800">{formatCurrency(totalCollectedToday)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
            <RefreshCw size={20} />
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-500">Chờ Xác Nhận</p>
            <p className="text-[16px] font-bold text-slate-800">{pendingCount} phiếu</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-500">Đã Xác Nhận</p>
            <p className="text-[16px] font-bold text-slate-800">{confirmedCount} phiếu</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-500">Còn Thiếu</p>
            <p className="text-[16px] font-bold text-slate-800">{formatCurrency(missingAmount)}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-[140px] sm:w-[150px] shrink-0">
            <DatePicker value={filterDate} onChange={setFilterDate} placeholder="Chọn ngày..." className="bg-white" />
          </div>
          <div className="w-full min-w-[150px] sm:w-[170px]">
            <CustomSelect
              value={filterStatus}
              onChange={(val) => setFilterStatus(val as any)}
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                { value: 'draft', label: 'Chưa Nộp' },
                { value: 'submitted', label: 'Chờ Xác Nhận' },
                { value: 'confirmed', label: 'Đã Xác Nhận' },
                { value: 'self_confirmed', label: 'Tự Xác Nhận' }
              ]}
              className="bg-white"
            />
          </div>
        </div>
        {!readonly && (
          <div className="hidden md:block">
            <button onClick={() => { setSelectedPC(null); setIsCreateOpen(true); }} className="px-4 py-2 bg-primary text-white text-[13px] font-bold rounded-lg hover:bg-primary/90 flex items-center gap-2">
              <Plus size={16} />
              Tạo Phiếu Thu
            </button>
          </div>
        )}
      </div>

      {!readonly && (
        <DraggableFAB icon={<Plus size={24} />} onClick={() => { setSelectedPC(null); setIsCreateOpen(true); }} />
      )}

      {/* Table */}
      <div className="bg-transparent md:bg-white border-0 md:border border-slate-200 md:rounded-xl md:shadow-sm md:overflow-hidden">
        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-40"><p>Đang tải...</p></div>
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState title="Không có phiếu thu nào" />
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="md:hidden flex flex-col gap-3 pb-20">
                {filtered.map(pc => (
                  <div key={pc.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden group">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${pc.status === 'confirmed' ? 'bg-green-500' : pc.status === 'submitted' ? 'bg-yellow-500' : pc.status === 'self_confirmed' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    <div className="flex justify-between items-start mb-3 pl-2">
                      <div>
                        <h3 className="font-bold text-slate-800 text-[14px]">{pc.deliveryOrderCode}</h3>
                        <p className="text-[12px] text-slate-500">{pc.customerName}</p>
                      </div>
                      <div>{getStatusBadge(pc.status)}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2 mb-3 pl-2 text-[13px]">
                       <div>
                         <p className="text-slate-500 text-[11px]">Tiền Theo Đơn</p>
                         <p className="font-bold text-slate-600">{formatCurrency(pc.expectedAmount)}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-slate-500 text-[11px]">Tiền Thực Thu</p>
                         <p className="font-bold text-slate-800">{formatCurrency(pc.collectedAmount)}</p>
                       </div>
                    </div>
                    {(pc.difference !== 0) && (
                      <div className="mb-3 pl-2">
                        {pc.difference < 0 ? (
                          <span className="text-[12px] text-red-600 border border-red-200 bg-red-50 px-2 py-0.5 rounded-md font-bold">Thiếu {formatCurrency(Math.abs(pc.difference))}</span>
                        ) : (
                          <span className="text-[12px] text-green-600 border border-green-200 bg-green-50 px-2 py-0.5 rounded-md font-bold">Thừa {formatCurrency(pc.difference)}</span>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 pl-2">
                       <div className="text-[11px] text-slate-500">
                         {formatDate(pc.collectedAt)} {formatTime(pc.collectedAt)}
                       </div>
                       {!readonly && (
                         <div className="flex space-x-2">
                          {pc.status === 'draft' && (
                            <>
                              <button onClick={() => handleAction('edit', pc)} className="text-[11px] font-medium text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-md bg-slate-50">Sửa</button>
                              <button onClick={() => handleAction('submit', pc)} className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1.5 rounded-md">Nộp</button>
                            </>
                          )}
                          {pc.status === 'submitted' && (
                            <button onClick={() => { if (confirm('Bạn có chắc muốn hủy nộp phiếu này?')) revert(pc.id); }} className="text-[11px] font-bold text-yellow-600 bg-yellow-50 px-2.5 py-1.5 rounded-md border border-yellow-200">Hủy</button>
                          )}
                         </div>
                       )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto pb-6">
                <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[12px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-4 py-3">Mã Đơn / Khách Hàng</th>
                  <th className="px-4 py-3">Tiền Theo Đơn</th>
                  <th className="px-4 py-3">Tiền Thực Thu</th>
                  <th className="px-4 py-3">Chênh Lệch</th>
                  <th className="px-4 py-3">Thu Lúc</th>
                  <th className="px-4 py-3">Người Nhận</th>
                  <th className="px-4 py-3">Trạng Thái</th>
                  {!readonly && <th className="px-4 py-3 text-right">Thao Tác</th>}
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
                      {formatCurrency(pc.expectedAmount)}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-bold text-slate-800">
                      {formatCurrency(pc.collectedAmount)}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium">
                      {pc.difference < 0 ? (
                        <span className="text-red-600 border border-red-200 bg-red-50 px-2 py-0.5 rounded-md">Thiếu {formatCurrency(Math.abs(pc.difference))}</span>
                      ) : pc.difference > 0 ? (
                        <span className="text-green-600 border border-green-200 bg-green-50 px-2 py-0.5 rounded-md">Thừa {formatCurrency(pc.difference)}</span>
                      ) : (
                        <span className="text-slate-500">Đủ</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">
                      {formatDate(pc.collectedAt)} {formatTime(pc.collectedAt)}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">
                      {pc.receiverName ? (
                        <span className="font-medium">{pc.receiverName}</span>
                      ) : (
                        <span className="text-slate-400 italic">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(pc.status)}
                    </td>
                    {!readonly && (
                      <td className="px-4 py-3 text-right space-x-2">
                        {pc.status === 'draft' && (
                          <>
                            <button onClick={() => handleAction('submit', pc)} className="text-[12px] font-bold text-primary hover:text-primary/80 bg-primary/10 px-3 py-1.5 rounded-md">
                              Nộp Tiền
                            </button>
                            <button onClick={() => handleAction('self_confirm', pc)} className="text-[12px] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-md">
                              Tự XN
                            </button>
                            <button onClick={() => handleAction('edit', pc)} className="text-[12px] font-medium text-slate-500 hover:text-slate-700">Sửa</button>
                          </>
                        )}
                        {pc.status === 'submitted' && (
                          <button onClick={() => { if (confirm('Bạn có chắc muốn hủy nộp phiếu này?')) revert(pc.id); }} className="text-[12px] font-bold text-yellow-600 hover:text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-md border border-yellow-200">
                            Hủy Nộp
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {isCreateOpen && <CreateEditPaymentDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} payment={selectedPC || undefined} />}
      {isSubmitOpen && selectedPC && <SubmitPaymentDialog isOpen={isSubmitOpen} onClose={() => setIsSubmitOpen(false)} payment={selectedPC} />}
      {isSelfConfirmOpen && selectedPC && <SelfConfirmDialog isOpen={isSelfConfirmOpen} onClose={() => setIsSelfConfirmOpen(false)} payment={selectedPC} />}
    </div>
  );
};

export default DriverPaymentTab;
