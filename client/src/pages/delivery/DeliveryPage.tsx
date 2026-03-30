import React from 'react';
import { Truck } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import { useDeliveryOrders } from '../../hooks/queries/useDelivery';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import StatusBadge from '../../components/shared/StatusBadge';

const statusLabels: Record<string, string> = {
  pending: 'Chờ giao',
  in_progress: 'Đang giao',
  completed: 'Đã giao xong',
};

const formatNumber = (val?: number) => {
  if (val == null) return '0.00';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const DeliveryPage: React.FC = () => {
  const { data: orders, isLoading, isError, refetch } = useDeliveryOrders();

  // Grouping logic
  const groupedOrders = (orders || []).reduce((acc: Record<string, any[]>, order: any) => {
    const customerName = order.import_orders?.customers?.name || order.import_orders?.receiver_name || 'Khách lẻ/Khác';
    if (!acc[customerName]) acc[customerName] = [];
    acc[customerName].push(order);
    return acc;
  }, {});

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader title="Hàng cần giao" description="Danh sách đơn hàng cần giao hôm nay" backPath="/hang-hoa" />
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={10} columns={6} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !orders?.length ? (
          <EmptyState title="Không có đơn cần giao" description="Hôm nay không có đơn hàng nào cần giao." />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse border-spacing-0">
              <thead className="sticky top-0 z-20">
                <tr className="bg-white border-b border-border shadow-sm">
                  <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Sản phẩm</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right w-24">Số lượng</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right w-32">Giá</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right w-24">Số hàng còn lại</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Ghép xe</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center w-28">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {Object.entries(groupedOrders).map(([customerName, items]) => (
                  <React.Fragment key={customerName}>
                    {/* Level 1: Customer Header */}
                    <tr className="bg-muted/10 group">
                      <td colSpan={6} className="px-6 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-foreground/80">{customerName}</span>
                          <span className="bg-muted px-2 py-0.5 rounded-full text-[10px] font-bold text-muted-foreground border border-border">
                            {items.length}
                          </span>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Level 2: Products */}
                    {items.map((o) => {
                      // Format vehicle string: License(assigned_quantity)
                      const vehicleString = (o.delivery_vehicles || [])
                        .map((dv: any) => `${dv.vehicles?.license_plate || 'N/A'}(${dv.assigned_quantity})`)
                        .join(' , ');

                      return (
                        <tr key={o.id} className="hover:bg-muted/5 transition-colors group">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="p-1 px-2.5 rounded-lg bg-orange-50 border border-orange-100/50">
                                <Truck size={14} className="text-orange-500" />
                              </div>
                              <span className="text-[13px] font-bold text-foreground">{o.product_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[13px] font-bold text-foreground text-right tabular-nums">
                            {formatNumber(o.total_quantity)}
                          </td>
                          <td className="px-4 py-3 text-[13px] font-bold text-foreground text-right tabular-nums">
                            {formatCurrency(o.unit_price)}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-amber-600 font-bold text-right tabular-nums">
                            {formatNumber(o.remaining_quantity)}
                          </td>
                          <td className="px-6 py-3 text-[12px] font-medium text-blue-600/80 italic break-words">
                            {vehicleString || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={o.status} label={statusLabels[o.status]} />
                          </td>
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
