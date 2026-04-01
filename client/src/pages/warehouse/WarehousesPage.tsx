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
      <PageHeader
        title="Tồn kho thực tế"
        description="Sản phẩm tồn kho chờ giao hàng (Còn lại > 0)"
        backPath="/hang-hoa"
      />

      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm, mã đơn hoặc khách hàng..."
              className="w-full pl-10 pr-4 py-2 bg-muted/20 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 text-primary rounded-xl text-[12px] font-bold">
            <Package size={14} />
            <span>Tổng cộng: {filteredItems.length} mặt hàng</span>
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
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse">
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
        )}
      </div>
    </div>
  );
};

export default WarehousesPage;
