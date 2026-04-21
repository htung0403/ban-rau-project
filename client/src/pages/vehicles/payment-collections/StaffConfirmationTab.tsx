import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { clsx } from 'clsx';
import { isDriverLikeRoleKey } from '../../../utils/routePermissions';
import { usePaymentCollections } from '../../../hooks/queries/usePaymentCollections';
import { useEmployees } from '../../../hooks/queries/useHR';
import { useVehicles } from '../../../hooks/queries/useVehicles';
import { Search, CheckCircle } from 'lucide-react';
import { DatePicker } from '../../../components/shared/DatePicker';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import MobileFilterSheet from '../../../components/shared/MobileFilterSheet';
import EmptyState from '../../../components/shared/EmptyState';
import ErrorState from '../../../components/shared/ErrorState';
import ConfirmReceptionDialog from './dialogs/ConfirmReceptionDialog';
import { formatCurrency, formatDate, formatTime } from '../../../utils/formatters';
import type { PaymentCollection } from '../../../types';
import { Filter } from 'lucide-react';

const StaffConfirmationTab: React.FC = () => {
  const { user } = useAuth();
  const isDriver = isDriverLikeRoleKey(user?.role || '');
  
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDriverId, setFilterDriverId] = useState('');
  const [filterVehicleId, setFilterVehicleId] = useState('');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);

  const closeFilter = () => {
    setIsFilterClosing(true);
    setTimeout(() => {
      setIsFilterOpen(false);
      setIsFilterClosing(false);
    }, 300);
  };

  const { data: collections, isLoading, isError, refetch } = usePaymentCollections({
    driverId: isDriver ? user?.id : (filterDriverId || undefined),
    vehicleId: filterVehicleId || undefined,
    status: 'submitted',
    dateFrom: filterDate || undefined,
    dateTo: filterDate || undefined,
  });

  const { data: employees } = useEmployees(!isDriver);
  const { data: vehicles } = useVehicles();
  
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

  const hasActiveFilters = filterDate || filterDriverId || filterVehicleId;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:flex-1">
          <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
               type="text" 
               placeholder="Tìm mã đơn, khách..." 
               value={filterSearch} 
               onChange={e => setFilterSearch(e.target.value)} 
               className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-[13px] w-full bg-white h-[38px]" 
             />
          </div>
          <button 
            onClick={() => setIsFilterOpen(true)}
            className={clsx(
              "md:hidden flex items-center justify-center w-[38px] h-[38px] rounded-lg border border-slate-200 bg-white text-slate-600 shrink-0 relative",
              hasActiveFilters && "text-primary border-primary bg-primary/5"
            )}
          >
            <Filter size={18} />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white" />
            )}
          </button>
        </div>

        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1 w-full max-w-[800px]">
          <DatePicker value={filterDate} onChange={setFilterDate} placeholder="Chọn ngày..." className="bg-white h-[38px]" />

          {!isDriver && (
            <SearchableSelect
              value={filterDriverId}
              onValueChange={setFilterDriverId}
              placeholder="Tất cả tài xế"
              options={employees?.filter(e => isDriverLikeRoleKey(e.role)).map(e => ({ value: e.id, label: e.full_name })) || []}
              className="bg-white h-[38px] border-slate-200 rounded-lg"
            />
          )}

          <SearchableSelect
            value={filterVehicleId}
            onValueChange={setFilterVehicleId}
            placeholder="Tất cả xe"
            options={vehicles?.map(v => ({ value: v.id, label: v.license_plate })) || []}
            className="bg-white h-[38px] border-slate-200 rounded-lg"
          />
        </div>
      </div>

      <MobileFilterSheet
        isOpen={isFilterOpen}
        isClosing={isFilterClosing}
        onClose={closeFilter}
        onApply={(filters) => {
          setFilterDate(filters.dateFrom);
        }}
        onClear={() => {
          setFilterDate('');
          setFilterDriverId('');
          setFilterVehicleId('');
        }}
        initialDateFrom={filterDate}
        initialDateTo={filterDate}
        dateLabel="Lọc theo ngày nộp"
      >
        {!isDriver && (
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-muted-foreground">Tài xế</label>
            <SearchableSelect
              value={filterDriverId}
              onValueChange={setFilterDriverId}
              placeholder="Tất cả tài xế"
              options={employees?.filter(e => isDriverLikeRoleKey(e.role)).map(e => ({ value: e.id, label: e.full_name })) || []}
              className="bg-muted/20 border-border/40 h-[44px]"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-[13px] font-bold text-muted-foreground">Biển số xe</label>
          <SearchableSelect
            value={filterVehicleId}
            onValueChange={setFilterVehicleId}
            placeholder="Tất cả xe"
            options={vehicles?.map(v => ({ value: v.id, label: v.license_plate })) || []}
            className="bg-muted/20 border-border/40 h-[44px]"
          />
        </div>
      </MobileFilterSheet>

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
                        <p className="font-bold text-slate-800 text-[13px]">{pc.driverName || '--'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 text-[11px]">Biển số xe</p>
                        <p className="font-bold text-slate-800 text-[13px]">{pc.licensePlate || '--'}</p>
                      </div>
                      <div className="col-span-2 flex justify-between items-center pt-1 border-t border-slate-200/60 mt-1">
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
                  <th className="px-4 py-3">Biển Số Xe</th>
                  <th className="px-4 py-3">Tiền Thực Thu</th>
                  <th className="px-4 py-3">Người Nhận</th>
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
                      {pc.driverName || '--'}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium text-slate-600">
                      {pc.licensePlate || '--'}
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
