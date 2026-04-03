import React, { useState, useMemo } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useImportOrders } from '../../hooks/queries/useImportOrders';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN').format(value);
};

const VegetablesPage: React.FC = () => {
  const [filterDate, setFilterDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');

  const filters: any = {};
  if (filterDate) filters.date = filterDate;

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
      <PageHeader
        title="Bảng Hàng Rau"
        description="Xem danh sách chi tiết các mặt hàng rau nhập trong ngày"
        backPath="/hang-hoa"
      />

      <div className="bg-card flex flex-wrap sm:flex-nowrap gap-2 items-center rounded-xl shadow-sm border border-border p-2 mb-6">
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/60">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="w-full text-[13px] bg-transparent border border-border rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/60"
            placeholder="Tìm kiếm theo tên vựa hoặc tên hàng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="relative w-full max-w-[200px]">
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
        <div className="flex-1 bg-white rounded-2xl border border-border shadow-sm flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-auto custom-scrollbar p-1">
            <table className="w-full border-collapse border border-border min-w-[800px]">
              <thead className="sticky top-0 z-10 bg-muted/60">
                <tr>
                  <th className="px-4 py-3 border border-border text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest text-left">Tên Vựa</th>
                  <th className="px-4 py-3 border border-border text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest text-center w-24">Tài</th>
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
                        {item.order?.driver_name || '-'}
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
      )}
    </div>
  );
};

export default VegetablesPage;
