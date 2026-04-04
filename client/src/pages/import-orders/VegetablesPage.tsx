import React, { useState, useMemo } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useImportOrders } from '../../hooks/queries/useImportOrders';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Search, Calendar, Filter, X } from 'lucide-react';
import { format } from 'date-fns';

import MobileFilterSheet from '../../components/shared/MobileFilterSheet';

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN').format(value);
};

const getAssignedVehicles = (item: any) => {
  const plates = new Set<string>();
  
  if (item.order?.delivery_orders) {
    const matchedDeliveryOrders = item.order.delivery_orders.filter(
      (doItem: any) => doItem.product_id === item.product_id
    );
    
    matchedDeliveryOrders.forEach((d: any) => {
      if (d.delivery_vehicles) {
         d.delivery_vehicles.forEach((dv: any) => {
           if (dv.vehicles?.license_plate) plates.add(dv.vehicles.license_plate);
         });
      }
    });
  }
  
  if (plates.size > 0) {
    return Array.from(plates).join(', ');
  }
  
  return item.order?.license_plate || '-';
};

const VegetablesPage: React.FC = () => {
  const [filterDate, setFilterDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);

  const openFilter = () => setIsFilterOpen(true);
  const closeFilter = () => {
    setIsFilterClosing(true);
    setTimeout(() => {
      setIsFilterOpen(false);
      setIsFilterClosing(false);
    }, 300);
  };

  const filters: any = {};
  if (filterDate) filters.date = filterDate;
  filters.order_category = 'vegetable';

  const { data: orders, isLoading, isError, refetch } = useImportOrders(filters);

  // Flatten items for table display
  const flattenedItems = useMemo(() => {
    if (!orders) return [];

    // Group by license_plate (Nhà Xe) if we wanted to visually group, but we will just list all
    const items: any[] = [];
    orders.forEach(order => {
      if (order.import_order_items && order.import_order_items.length > 0) {
        order.import_order_items.forEach(item => {
          items.push({
            ...item,
            order: order,
          });
        });
      }
    });

    // Sort logic could go here
    return items;
  }, [orders]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return flattenedItems;
    const q = searchQuery.toLowerCase();
    return flattenedItems.filter(i => {
      const vua = (i.order?.sender_name || i.order?.customers?.name || '').toLowerCase();
      const hang = (i.products?.name || '').toLowerCase();
      return vua.includes(q) || hang.includes(q);
    });
  }, [flattenedItems, searchQuery]);

  const totalAmount = filteredItems.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="hidden md:block">
        <PageHeader
          title="Bảng Hàng Rau"
          description="Xem danh sách chi tiết các mặt hàng rau nhập trong ngày"
          backPath="/hang-hoa"
        />
      </div>

      <div className="bg-card flex flex-col md:flex-row md:flex-nowrap gap-2 items-center rounded-xl shadow-sm border border-border p-2 md:mb-6 mb-3">
        <div className="flex w-full md:w-auto flex-1 gap-2 relative">
          <div className="relative w-full flex-1 md:max-w-sm">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/60">
              <Search size={16} />
            </div>
            <input
              type="text"
              className="w-full text-[13px] bg-transparent border border-border rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/60"
              placeholder="Tìm kiếm theo tên vựa hoặc tên hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X size={14} />
              </button>
            )}
          </div>
          
          <button
            onClick={openFilter}
            className="md:hidden flex items-center justify-center w-[38px] shrink-0 border border-border/80 rounded-xl transition-all bg-muted/20 text-muted-foreground hover:bg-muted"
          >
             <Filter size={18} />
          </button>
        </div>

        <div className="hidden md:block relative w-full md:max-w-[200px]">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/60">
            <Calendar size={16} />
          </div>
          <input
            type="date"
            className="w-full text-[13px] bg-transparent border border-border rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton type="table" rows={10} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !filteredItems?.length ? (
        <EmptyState
          title="Không có dữ liệu hàng rau"
          description={filterDate ? `Không có mặt hàng nào được nhập vào ngày ${format(new Date(filterDate), 'dd/MM/yyyy')}` : "Chưa có mặt hàng nào."}
        />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Desktop Table View */}
          <div className="hidden md:flex flex-1 bg-white rounded-2xl border border-border shadow-sm flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full border-collapse min-w-[800px] border-hidden">
                <thead className="sticky top-0 z-10 bg-muted/60">
                <tr>
                  <th className="px-4 py-3 border border-border text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest text-left">Tên Vựa</th>
                  <th className="px-4 py-3 border border-border text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest text-center w-36">Tài</th>
                  <th className="px-4 py-3 border border-border text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest text-center w-24">SL</th>
                  <th className="px-4 py-3 border border-border text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest text-left">Tên Hàng</th>
                  <th className="px-4 py-3 border border-border text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest text-right w-32">Tiền</th>
                  <th className="px-4 py-3 border border-border text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest text-right w-40">Thành Tiền</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-muted/10 transition-colors group">
                    <td className="px-4 py-3 border border-border">
                      <div className="font-bold text-[13px] text-foreground">
                        {item.order?.sender_name || item.order?.customers?.name || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 border border-border text-center">
                      <span className="text-[13px] font-medium text-muted-foreground">
                        {getAssignedVehicles(item)}
                      </span>
                    </td>
                    <td className="px-4 py-3 border border-border text-center">
                      <span className="font-bold text-[13px] text-primary tabular-nums">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 border border-border">
                      <div className="font-medium text-[13px] text-foreground">
                        {item.products?.name || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 border border-border text-right">
                      <span className="text-[13px] font-medium text-muted-foreground tabular-nums">
                        {item.unit_price ? formatCurrency(item.unit_price) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border border-border text-right">
                      <span className="text-[13px] font-bold text-primary tabular-nums">
                        {item.total_amount ? formatCurrency(item.total_amount) : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 z-10 bg-muted/60 shadow-[0_-2px_6px_rgba(0,0,0,0.05)]">
                <tr>
                  <td colSpan={5} className="px-4 py-3 border border-border text-center text-[14px] font-black uppercase text-foreground">
                    Tổng
                  </td>
                  <td className="px-4 py-3 border border-border text-right text-[15px] font-black text-primary tabular-nums">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-2 mt-1">
            {filteredItems.map((item, idx) => (
              <div key={item.id || idx} className="bg-white rounded-2xl border border-border shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2 min-w-0">
                    <div className="text-[14px] font-bold text-foreground mb-2 whitespace-normal leading-snug">
                      {item.order?.sender_name || item.order?.customers?.name || '-'}
                    </div>
                    <div className="space-y-1">
                      <div className="text-[12px] text-muted-foreground flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase w-8 shrink-0">Tài</span>
                        <span className="font-medium text-foreground truncate">{getAssignedVehicles(item)}</span>
                      </div>
                      <div className="text-[12px] text-muted-foreground flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase w-8 shrink-0">Hàng</span>
                        <span className="font-medium text-foreground truncate">{item.products?.name || '-'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <div className="text-[14px] font-black text-primary tabular-nums mb-1">
                       {item.total_amount ? formatCurrency(item.total_amount) : '-'}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                       <span className="font-bold text-foreground">{item.quantity}</span> x {item.unit_price ? formatCurrency(item.unit_price) : '-'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Total Bar */}
          <div className="shrink-0 bg-white border border-border p-4 shadow-sm rounded-xl mt-2 flex items-center justify-between">
            <span className="text-[14px] font-black uppercase text-foreground">Tổng cộng</span>
            <span className="text-[16px] font-black text-primary tabular-nums">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>
      )}

      <MobileFilterSheet
        isOpen={isFilterOpen}
        isClosing={isFilterClosing}
        onClose={closeFilter}
        onApply={(filters) => {
          setFilterDate(filters.dateFrom || '');
        }}
        initialDateFrom={filterDate}
        initialDateTo={filterDate}
        dateLabel="Chọn ngày"
      />
    </div>
  );
};

export default VegetablesPage;
