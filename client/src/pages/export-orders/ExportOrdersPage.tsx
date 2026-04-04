import React, { useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useExportOrders } from '../../hooks/queries/useExportOrders';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import StatusBadge from '../../components/shared/StatusBadge';
import { Plus, Search, X, Filter } from 'lucide-react';
import { DateRangePicker } from '../../components/shared/DateRangePicker';
import { clsx } from 'clsx';
import MobileFilterSheet from '../../components/shared/MobileFilterSheet';
import DraggableFAB from '../../components/shared/DraggableFAB';
import AddEditExportOrderDialog from './dialogs/AddEditExportOrderDialog';

const paymentLabels: Record<string, string> = {
  unpaid: 'Chưa thanh toán',
  partial: 'Thanh toán một phần',
  paid: 'Đã thanh toán',
};

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const ExportOrdersPage: React.FC = () => {
  const { data: orders, isLoading, isError, refetch } = useExportOrders();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddClosing, setIsAddClosing] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);

  const closeFilter = () => {
    setIsFilterClosing(true);
    setTimeout(() => {
      setIsFilterOpen(false);
      setIsFilterClosing(false);
    }, 300);
  };

  const filteredOrders = (orders || []).filter((o) => {
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      if (!o.products?.name?.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (filterDateFrom && o.export_date < filterDateFrom) return false;
    if (filterDateTo && o.export_date > filterDateTo) return false;
    return true;
  });

  const closeAddDialog = () => {
    setIsAddClosing(true);
    setTimeout(() => {
      setIsAddOpen(false);
      setIsAddClosing(false);
    }, 350);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="hidden md:block">
        <PageHeader
          title="Xuất hàng"
          description="Quản lý phiếu xuất kho"
          backPath="/hang-hoa"
          actions={
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            >
              <Plus size={16} />
              Thêm phiếu xuất
            </button>
          }
        />
      </div>
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="p-3 border-b border-border flex flex-col md:flex-row items-stretch md:items-center gap-2">
          <div className="flex w-full md:flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <input
                type="text"
                placeholder="Tìm kiếm theo mặt hàng..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-muted/20 border border-border/80 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
              />
              {searchText && (
                <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <X size={14} />
                </button>
              )}
            </div>

            <button
               onClick={() => setIsFilterOpen(true)}
               className={clsx(
                 "md:hidden flex items-center justify-center w-[38px] shrink-0 border border-border/80 rounded-xl transition-all",
                 (filterDateFrom || filterDateTo) ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/20 text-muted-foreground hover:bg-muted"
               )}
            >
               <Filter size={18} />
            </button>
          </div>
          <div className="hidden md:block relative z-20 flex-none">
            <DateRangePicker
              initialDateFrom={filterDateFrom || undefined}
              initialDateTo={filterDateTo || undefined}
              onUpdate={({ range }) => {
                const format = (d: Date) => {
                  const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
                  return local.toISOString().split('T')[0];
                };
                setFilterDateFrom(range.from ? format(range.from) : '');
                setFilterDateTo(range.to ? format(range.to) : '');
              }}
            />
          </div>
          {(searchText || filterDateFrom || filterDateTo) && (
            <button
              onClick={() => { setSearchText(''); setFilterDateFrom(''); setFilterDateTo(''); }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-dashed border-red-300 text-red-500 text-[12px] font-bold hover:bg-red-50 transition-all shrink-0 justify-center"
            >
              <X size={14} />
              Xóa lọc
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={6} columns={6} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : filteredOrders.length === 0 ? (
          <EmptyState title="Không tìm thấy phiếu xuất" description="Thử thay đổi bộ lọc hoặc thêm phiếu xuất mới." />
        ) : (
          <>
          {/* Desktop Table */}
          <div className="hidden md:block flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse min-w-[700px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Ngày</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Mặt hàng</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">SL</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Công nợ</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Đã trả</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center">Thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-[12px] text-muted-foreground tabular-nums">{o.export_date}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-foreground">{o.products?.name}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-foreground text-right tabular-nums">{o.quantity}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-red-600 text-right tabular-nums">{formatCurrency(o.debt_amount)}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-emerald-600 text-right tabular-nums">{formatCurrency(o.paid_amount)}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={o.payment_status} label={paymentLabels[o.payment_status]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {filteredOrders.map((o) => (
              <div
                key={o.id}
                className="bg-white rounded-2xl border border-border shadow-sm p-4 cursor-pointer hover:shadow-md active:bg-muted/10 transition-all flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                   <div className="flex flex-col">
                      <span className="text-[14px] font-bold flex items-center gap-2">
                        <span className="text-foreground">{o.products?.name}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">SL: {o.quantity}</span>
                      </span>                     
                      <span className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">{o.export_date}</span>
                   </div>
                   <StatusBadge status={o.payment_status} label={paymentLabels[o.payment_status]} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                   <div className="flex flex-col">
                     <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Công nợ</span>
                     <span className="text-[13px] font-bold text-red-600 tabular-nums">
                      {formatCurrency(o.debt_amount)}
                    </span>
                   </div>

                   <div className="flex flex-col items-end">
                     <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Đã trả</span>
                     <span className="text-[13px] font-bold text-emerald-600 tabular-nums">
                      {formatCurrency(o.paid_amount)}
                    </span>
                   </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Mobile Floating Action Button */}
      <DraggableFAB 
        icon={<Plus size={24} />} 
        onClick={() => setIsAddOpen(true)} 
      />

      <AddEditExportOrderDialog
        isOpen={isAddOpen}
        isClosing={isAddClosing}
        onClose={closeAddDialog}
      />

      <MobileFilterSheet
        isOpen={isFilterOpen}
        isClosing={isFilterClosing}
        onClose={closeFilter}
        initialDateFrom={filterDateFrom}
        initialDateTo={filterDateTo}
        onApply={(filters) => {
          setFilterDateFrom(filters.dateFrom);
          setFilterDateTo(filters.dateTo);
          closeFilter();
        }}
        dateLabel="Khoảng thời gian"
      />
    </div>
  );
};

export default ExportOrdersPage;
