import React, { useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useDeliveryOrders } from '../../hooks/queries/useDelivery';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Leaf, Search, Calendar, User, Truck } from 'lucide-react';
import AssignVehicleDialog from '../delivery/dialogs/AssignVehicleDialog';

const formatNumber = (val?: number) => {
  if (val == null) return '0.00';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

const VegetableWarehousePage: React.FC = () => {
  // Fetch only vegetable delivery orders (no date filter => all pending)
  const { data: deliveries, isLoading, isError, refetch } = useDeliveryOrders(undefined, undefined, 'vegetable');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAssignClosing, setIsAssignClosing] = useState(false);

  const openAssign = (order: any) => {
    setSelectedOrder(order);
    setIsAssignOpen(true);
  };

  const closeAssign = () => {
    setIsAssignClosing(true);
    setTimeout(() => {
      setIsAssignOpen(false);
      setIsAssignClosing(false);
      setSelectedOrder(null);
    }, 350);
  };

  // Calculate remaining for each delivery order and filter for > 0
  const inventoryItems = (deliveries || [])
    .map((d: any) => {
      const totalAssigned = (d.delivery_vehicles || []).reduce(
        (sum: number, dv: any) => sum + (dv.assigned_quantity || 0),
        0
      );
      const remaining = d.total_quantity - totalAssigned;
      return { ...d, remaining };
    })
    .filter((item: any) => item.remaining > 0);

  // Search filter
  const filteredItems = inventoryItems.filter((item: any) => {
    const orderData = item.vegetable_orders || item.import_orders || {};
    const rName = orderData.receiver_name?.trim() || orderData.customers?.name || '';
    const sName = orderData.sender_name || orderData.customers?.name || '';
    const code = orderData.order_code || '';

    return item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="hidden md:block">
        <PageHeader
          title="Tồn kho hàng rau"
          description="Hàng rau tồn kho chờ giao hàng (Còn lại > 0)"
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
              placeholder="Tìm kiếm hàng rau, mã đơn..."
              className="w-full pl-9 pr-4 py-2 bg-muted/20 border border-border/80 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 px-3 py-2 bg-emerald-500/5 text-emerald-600 border border-emerald-500/10 rounded-xl text-[12px] font-bold">
            <Leaf size={14} />
            <span className="hidden sm:inline">Tổng cộng: {filteredItems.length} mặt hàng rau</span>
            <span className="sm:hidden">{filteredItems.length} MH</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={10} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="Không có hàng rau tồn kho"
            description={searchQuery ? "Không tìm thấy hàng rau khớp với từ khóa." : "Tất cả đơn hàng rau đã được gán hết xe."}
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block flex-1 overflow-auto custom-scrollbar">
              <table className="w-full border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-emerald-50/60 border-b border-border">
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-left">Thông tin sản phẩm</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Thao tác</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-left">Người nhận</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-left">Người gửi</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-left">NV nhận</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Tổng số lượng</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Còn lại (Chưa gán)</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Ngày dự kiến</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                            <Leaf size={20} />
                          </div>
                          <div>
                            <h4 className="text-[14px] font-bold text-foreground">{item.product_name}</h4>
                            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-500/5 px-2 py-0.5 rounded-full inline-block mt-1 uppercase tracking-tight">
                              {(item.vegetable_orders || item.import_orders)?.order_code || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); openAssign(item); }}
                          className="px-3 py-1.5 bg-orange-100 text-orange-600 hover:bg-orange-200 font-bold text-[12px] rounded-lg transition-colors inline-flex items-center gap-1.5"
                        >
                          <Truck size={14} /> Phân xe
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[13px] font-bold text-slate-700">
                          <User size={14} className="text-muted-foreground" />
                          {(() => {
                            const o = item.vegetable_orders || item.import_orders || {};
                            return o.receiver_name?.trim() || o.customers?.name || '-';
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-[13px] font-medium text-slate-600">
                          {(() => {
                            const o = item.vegetable_orders || item.import_orders || {};
                            const sender = o.sender_name;
                            return sender || '-';
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-[13px] font-medium text-amber-700">
                          {(() => {
                            const o = item.vegetable_orders || item.import_orders || {};
                            return o.profiles?.full_name || '-';
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[14px] font-bold text-slate-500 tabular-nums">
                          {formatNumber(item.total_quantity)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-[16px] font-black text-emerald-600 tabular-nums">
                            {formatNumber(item.remaining)}
                          </span>
                          <div className="w-16 h-1 bg-emerald-100 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, (item.remaining / item.total_quantity) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[12px] font-bold text-foreground inline-flex items-center gap-1.5">
                            <Calendar size={14} className="text-emerald-500" />
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
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex shrink-0 items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                        <User size={20} />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-foreground line-clamp-1">
                          {(() => {
                            const o = item.vegetable_orders || item.import_orders || {};
                            return o.receiver_name?.trim() || o.customers?.name || '-';
                          })()}
                        </h4>
                        <span className="text-[11px] font-medium text-emerald-600 bg-emerald-500/5 px-2 py-0.5 rounded-full inline-block mt-1 uppercase tracking-tight">
                          {(item.vegetable_orders || item.import_orders)?.order_code || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); openAssign(item); }}
                      className="shrink-0 ml-2 px-3 py-1.5 bg-orange-100 text-orange-600 hover:bg-orange-200 font-bold text-[12px] rounded-xl transition-colors inline-flex items-center gap-1.5"
                    >
                      <Truck size={14} /> Phân xe
                    </button>
                  </div>

                  <div className="space-y-1.5 p-3 bg-emerald-50/40 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Leaf size={12} className="text-emerald-500 shrink-0" />
                      <span className="text-[13px] font-bold text-slate-700">{item.product_name}</span>
                    </div>
                    {(() => {
                      const o = item.vegetable_orders || item.import_orders || {};
                      const sender = o.sender_name;
                      return sender ? (
                        <div className="flex items-center gap-2">
                          <span className="w-3 shrink-0" />
                          <span className="text-[11px] text-muted-foreground font-medium">Gửi: {sender}</span>
                        </div>
                      ) : null;
                    })()}
                    {(() => {
                      const o = item.vegetable_orders || item.import_orders || {};
                      const nv = o.profiles?.full_name;
                      return nv ? (
                        <div className="flex items-center gap-2">
                          <span className="w-3 shrink-0" />
                          <span className="text-[11px] text-amber-600 font-medium">NV: {nv}</span>
                        </div>
                      ) : null;
                    })()}
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
                      <span className="text-[14px] font-black text-emerald-600 tabular-nums">
                        {formatNumber(item.remaining)}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Ngày giao</span>
                      <span className="text-[12px] font-bold text-foreground inline-flex items-center gap-1">
                        <Calendar size={12} className="text-emerald-500" />
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

      <AssignVehicleDialog
        isOpen={isAssignOpen}
        isClosing={isAssignClosing}
        order={selectedOrder}
        onClose={closeAssign}
      />
    </div>
  );
};

export default VegetableWarehousePage;
