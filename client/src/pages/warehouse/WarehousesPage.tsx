import React, { useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useAllPendingDeliveries } from '../../hooks/queries/useDelivery';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Package, Search, Box, Calendar, User } from 'lucide-react';

const formatNumber = (val?: number) => {
  if (val == null) return '0.00';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

const WarehousesPage: React.FC = () => {
  const { data: deliveries, isLoading, isError, refetch } = useAllPendingDeliveries();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Calculate remaining for each delivery order and filter for > 0
  const inventoryItems = (deliveries || [])
    .map(d => {
      const totalAssigned = (d.delivery_vehicles || []).reduce(
        (sum: number, dv: any) => sum + (dv.assigned_quantity || 0),
        0
      );
      const remaining = d.total_quantity - totalAssigned;
      return { ...d, remaining };
    })
    .filter(item => item.remaining > 0);

  // Search filter
  const filteredItems = inventoryItems.filter(item => 
    item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.import_orders?.order_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.import_orders?.customers?.name || item.import_orders?.receiver_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="hidden md:block">
        <PageHeader
          title="Tồn kho thực tế"
          description="Sản phẩm tồn kho chờ giao hàng (Còn lại > 0)"
          backPath="/hang-hoa"
        />
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {/* Search & Filter Bar */}
        <div className="p-3 border-b border-border flex flex-row items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={15} />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm, mã đơn..."
              className="w-full pl-9 pr-4 py-2 bg-muted/20 border border-border/80 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 px-3 py-2 bg-primary/5 text-primary border border-primary/10 rounded-xl text-[12px] font-bold">
            <Package size={14} />
            <span className="hidden sm:inline">Tổng cộng: {filteredItems.length} mặt hàng</span>
            <span className="sm:hidden">{filteredItems.length} MH</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={10} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : filteredItems.length === 0 ? (
          <EmptyState 
            title="Không có hàng tồn kho" 
            description={searchQuery ? "Không tìm thấy hàng khớp với từ khóa." : "Tất cả các đơn hàng đã được gán hết xe."} 
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block flex-1 overflow-auto custom-scrollbar">
              <table className="w-full border-collapse min-w-[900px]">
                <thead className="sticky top-0 z-10">
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-left">Thông tin sản phẩm</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-left">Khách hàng / Đơn nhập</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Tổng số lượng</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Còn lại (Chưa gán)</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Ngày dự kiến</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                          <Box size={20} />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-foreground">{item.product_name}</h4>
                          <span className="text-[11px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-full inline-block mt-1 uppercase tracking-tight">
                            {item.import_orders?.order_code || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[13px] font-bold text-slate-700">
                          <User size={14} className="text-muted-foreground" />
                          {item.import_orders?.customers?.name || item.import_orders?.receiver_name || '-'}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium pl-5">
                          {item.import_orders?.sender_name && `Người gửi: ${item.import_orders.sender_name}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[14px] font-bold text-slate-500 tabular-nums">
                        {formatNumber(item.total_quantity)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-[16px] font-black text-orange-600 tabular-nums">
                          {formatNumber(item.remaining)}
                        </span>
                        <div className="w-16 h-1 bg-orange-100 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="h-full bg-orange-500 rounded-full" 
                            style={{ width: `${Math.min(100, (item.remaining / item.total_quantity) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[12px] font-bold text-foreground inline-flex items-center gap-1.5">
                          <Calendar size={14} className="text-primary" />
                          {item.delivery_date ? new Date(item.delivery_date).toLocaleDateString('vi-VN') : '-'}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Ngày giao</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-border shadow-sm p-4 cursor-pointer hover:shadow-md active:bg-muted/10 transition-all flex flex-col gap-3 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex shrink-0 items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                      <Box size={20} />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-foreground line-clamp-1">{item.product_name}</h4>
                      <span className="text-[11px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-full inline-block mt-1 uppercase tracking-tight">
                        {item.import_orders?.order_code || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 p-3 bg-muted/20 rounded-xl">
                  <div className="flex items-center gap-2">
                     <User size={12} className="text-muted-foreground shrink-0" />
                     <span className="text-[13px] font-bold text-slate-700">{item.import_orders?.customers?.name || item.import_orders?.receiver_name || '-'}</span>
                  </div>
                  {item.import_orders?.sender_name && (
                    <div className="flex items-center gap-2">
                      <span className="w-3 shrink-0" />
                      <span className="text-[11px] text-muted-foreground font-medium">Người gửi: {item.import_orders.sender_name}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex flex-col">
                     <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Tổng SL</span>
                     <span className="text-[13px] font-bold text-slate-500 tabular-nums">
                      {formatNumber(item.total_quantity)}
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                     <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Còn lại</span>
                     <span className="text-[14px] font-black text-orange-600 tabular-nums">
                      {formatNumber(item.remaining)}
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                     <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Ngày giao</span>
                     <span className="text-[12px] font-bold text-foreground inline-flex items-center gap-1">
                        <Calendar size={12} className="text-primary" />
                        {item.delivery_date ? new Date(item.delivery_date).toLocaleDateString('vi-VN') : '-'}
                      </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WarehousesPage;
