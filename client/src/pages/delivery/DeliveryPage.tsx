import React, { useState } from 'react';
import { clsx } from 'clsx';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, ChevronDown, Filter } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import { useDeliveryOrders } from '../../hooks/queries/useDelivery';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';

const formatNumber = (val?: number) => {
  if (val == null) return '0.00';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

const quickRanges = [
  { label: 'Hôm nay', getValue: () => ({ start: new Date(), end: new Date() }) },
  { label: 'Hôm qua', getValue: () => ({ start: subDays(new Date(), 1), end: subDays(new Date(), 1) }) },
  { label: '7 ngày qua', getValue: () => ({ start: subDays(new Date(), 6), end: new Date() }) },
  { label: '30 ngày qua', getValue: () => ({ start: subDays(new Date(), 29), end: new Date() }) },
  { label: 'Tháng này', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
];

const DeliveryPage: React.FC = () => {
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showQuickPick, setShowQuickPick] = useState(false);

  const { data: orders, isLoading, isError, refetch } = useDeliveryOrders(startDate, endDate);

  const handleQuickPick = (range: typeof quickRanges[0]) => {
    const { start, end } = range.getValue();
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
    setShowQuickPick(false);
  };

  // Grouping logic
  const groupedOrders = (orders || []).reduce((acc: Record<string, any[]>, order: any) => {
    const customerName = order.import_orders?.customers?.name || order.import_orders?.receiver_name || 'Khách lẻ/Khác';
    if (!acc[customerName]) acc[customerName] = [];
    acc[customerName].push(order);
    return acc;
  }, {});

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <PageHeader title="Hàng cần giao" description="Danh sách đơn hàng cần giao" backPath="/hang-hoa" />
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 px-3 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mr-1">
            <Filter size={14} className="text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Lọc ngày</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-muted/20 border-none rounded-xl text-[12px] font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <span className="text-muted-foreground text-[12px] font-medium">đến</span>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-muted/20 border-none rounded-xl text-[12px] font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <div className="relative">
            <button
              onClick={() => setShowQuickPick(!showQuickPick)}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 hover:bg-muted rounded-xl transition-all text-[12px] font-bold",
                startDate === format(new Date(), 'yyyy-MM-dd') && endDate === format(new Date(), 'yyyy-MM-dd')
                  ? "text-primary bg-primary/5"
                  : "text-foreground"
              )}
            >
              {quickRanges.find(r => {
                const { start, end } = r.getValue();
                return format(start, 'yyyy-MM-dd') === startDate && format(end, 'yyyy-MM-dd') === endDate;
              })?.label || 'Chọn nhanh'}
              <ChevronDown size={14} className={clsx("transition-transform", showQuickPick && "rotate-180")} />
            </button>

            {showQuickPick && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowQuickPick(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-border rounded-2xl shadow-xl z-40 p-2 py-3 animate-in fade-in zoom-in duration-200">
                  <div className="px-3 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                    Phạm vi thời gian
                  </div>
                  {quickRanges.map((range) => (
                    <button
                      key={range.label}
                      onClick={() => handleQuickPick(range)}
                      className="w-full text-left px-4 py-2 hover:bg-muted rounded-xl text-[13px] font-medium transition-colors"
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={10} columns={6} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !orders?.length ? (
          <EmptyState title="Không có đơn cần giao" description="Hôm nay không có đơn hàng nào cần giao." />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th colSpan={3} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border-r border-slate-200 text-center group">
                    <div className="flex items-center justify-center gap-2">
                       <span className="text-primary italic">Ngày:</span>
                       <span>
                         {startDate === endDate 
                           ? new Date(startDate).toLocaleDateString('vi-VN') 
                           : `${new Date(startDate).toLocaleDateString('vi-VN')} - ${new Date(endDate).toLocaleDateString('vi-VN')}`}
                       </span>
                    </div>
                  </th>
                  <th colSpan={10} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-center">
                    Tờ: 1
                  </th>
                </tr>
                <tr className="bg-white border-b border-slate-200 text-slate-600">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-tight text-left min-w-[200px] border-r border-slate-100">Tên khách</th>
                  <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-tight text-center w-24 border-r border-slate-100">Số lượng</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-tight text-left border-r border-slate-200">Hàng</th>
                  {['1', '2', '3', '4', '5', '6', '7', '8', 'ba', 'kho'].map(col => (
                    <th key={col} className="px-2 py-3 text-[11px] font-bold uppercase tracking-tight text-center w-12 border-r border-slate-100 last:border-r-0">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(groupedOrders).map(([customerName, items]) => (
                  <React.Fragment key={customerName}>
                    {items.map((o, index) => {
                      const getQtyForCol = (col: string) => {
                        const matches = (o.delivery_vehicles || []).filter((dv: any) => {
                          const plate = (dv.vehicles?.license_plate || '').toLowerCase();
                          if (col === 'ba') return plate.includes('ba');
                          if (col === 'kho') return plate.includes('kho');
                          // Simple match for vehicle numbers
                          return plate.includes(col);
                        });
                        return matches.reduce((sum: number, dv: any) => sum + (dv.assigned_quantity || 0), 0);
                      };

                      return (
                        <tr key={o.id} className="hover:bg-blue-50/30 transition-colors group">
                          {index === 0 ? (
                            <td 
                              rowSpan={items.length} 
                              className="px-4 py-3 text-[13px] font-bold text-slate-800 align-top border-r border-slate-100 bg-white"
                            >
                              {customerName}
                            </td>
                          ) : null}
                          <td className="px-3 py-3 text-[13px] font-bold text-slate-700 text-center tabular-nums border-r border-slate-100">
                            {formatNumber(o.total_quantity)}
                          </td>
                          <td className="px-4 py-3 text-[13px] font-medium text-slate-600 border-r border-slate-200">
                            {o.product_name.includes(' - ') ? o.product_name.split(' - ').slice(1).join(' - ') : o.product_name}
                          </td>
                          {['1', '2', '3', '4', '5', '6', '7', '8', 'ba', 'kho'].map(col => {
                            const qty = getQtyForCol(col);
                            return (
                              <td 
                                key={col} 
                                className={clsx(
                                  "px-2 py-3 text-[13px] text-center tabular-nums border-r border-slate-100 last:border-r-0",
                                  qty > 0 ? "font-bold text-orange-600 bg-orange-50/30" : "text-slate-300"
                                )}
                              >
                                {qty > 0 ? formatNumber(qty) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryPage;
