import React, { useState } from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { Calendar, PlusCircle, Truck, CheckCircle } from 'lucide-react';
import { DateRangePicker } from '../../components/shared/DateRangePicker';
import PageHeader from '../../components/shared/PageHeader';
import { useDeliveryOrders } from '../../hooks/queries/useDelivery';
import { useVehicles } from '../../hooks/queries/useVehicles';
import { useAuth } from '../../context/AuthContext';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import AssignVehicleDialog from './dialogs/AssignVehicleDialog';

const formatNumber = (val?: number) => {
  if (val == null) return '0.00';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

const VegetableDeliveryPage: React.FC = () => {
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const { user } = useAuth();
  const { data: orders, isLoading: ordersLoading, isError, refetch } = useDeliveryOrders(startDate, endDate, 'vegetable');
  const { data: vehicles } = useVehicles();

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAssignClosing, setIsAssignClosing] = useState(false);



  const isLoading = ordersLoading;
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const myVehicle = vehicles?.find(v => v.driver_id === user?.id);

  const openAssign = (order: any, vehicleId?: string) => {
    setSelectedOrder(order);
    setSelectedVehicleId(vehicleId || null);
    setIsAssignOpen(true);
  };

  const closeAssign = () => {
    setIsAssignClosing(true);
    setTimeout(() => {
      setIsAssignOpen(false);
      setIsAssignClosing(false);
      setSelectedOrder(null);
      setSelectedVehicleId(null);
    }, 350);
  };



  // Grouping logic: Date -> [Orders]
  const groupedOrders = (orders || []).reduce((acc: Record<string, any[]>, order: any) => {
    const date = order.delivery_date || 'N/A';
    if (!acc[date]) acc[date] = [];
    acc[date].push(order);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a)); // Newest first

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="hidden md:block">
          <PageHeader title="Giao hàng rau" description="Danh sách đơn hàng rau cần giao" backPath="/hang-hoa" />
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            initialDateFrom={startDate}
            initialDateTo={endDate}
            onUpdate={(values) => {
              if (values.range.from) {
                setStartDate(format(values.range.from, 'yyyy-MM-dd'));
              } else {
                setStartDate('');
              }
              if (values.range.to) {
                setEndDate(format(values.range.to, 'yyyy-MM-dd'));
              } else {
                setEndDate('');
              }
            }}
          />
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
          <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/30 md:bg-transparent relative">
            {/* Desktop View */}
            <div className="hidden md:block">
              <table className="w-full border-collapse bg-white">
              <thead className="sticky top-0 z-20">
                <tr className="bg-white border-b border-slate-200 text-slate-600">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-tight text-left w-48 border-r border-slate-100">Mã đơn</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-tight text-left min-w-[80px] border-r border-slate-100">Người nhận</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-tight text-left border-r border-slate-100">Hàng</th>
                  <th className="px-2 py-3 text-[11px] font-bold uppercase tracking-tight text-center w-20 border-r border-slate-100">SL Tổng</th>
                  <th className="px-2 py-3 text-[11px] font-bold uppercase tracking-tight text-center w-20 border-r border-slate-200">Còn lại</th>
                  {vehicles?.map(v => (
                    <th key={v.id} className={clsx(
                      "px-2 py-3 text-[11px] font-bold uppercase tracking-tight text-center w-28 border-r border-slate-100 last:border-r-0",
                      v.id === myVehicle?.id && "bg-primary/5 text-primary"
                    )}>
                      {v.license_plate}
                    </th>
                  ))}
                  {(!vehicles || vehicles.length === 0) && ['1', '2', '3', '4', '5', '6', '7', '8', 'ba', 'kho'].map(col => (
                    <th key={col} className="px-2 py-3 text-[11px] font-bold uppercase tracking-tight text-center w-12 border-r border-slate-100 last:border-r-0">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedDates.map((date) => (
                  <React.Fragment key={date}>
                    {/* Date separator row */}
                    <tr className="bg-slate-100/80 border-y border-slate-200 shadow-sm overflow-hidden">
                      <td colSpan={5 + (vehicles?.length || 10)} className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary">
                            <Calendar size={14} />
                          </div>
                          <span className="text-[13px] font-black text-slate-800 uppercase tracking-wider">Ngày giao: {new Date(date).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </td>
                    </tr>
                    {/* Items for this date */}
                    {groupedOrders[date].map((o: any) => {
                      const totalAssigned = (o.delivery_vehicles || []).reduce(
                        (sum: number, dv: any) => sum + (dv.assigned_quantity || 0),
                        0
                      );
                      const remainingQty = o.total_quantity - totalAssigned;

                      return (
                        <tr key={o.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-bold text-primary">{o.import_orders?.order_code || 'N/A'}</span>
                              {isAdmin && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAssign(o);
                                  }}
                                  className={clsx(
                                    "p-1.5 rounded-md transition-colors",
                                    remainingQty > 0 
                                      ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  )}
                                  title={remainingQty > 0 ? "Phân xe" : "Chỉnh sửa phân xe"}
                                >
                                  <Truck size={14} strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[12px] font-bold text-slate-700 border-r border-slate-100">
                            {o.import_orders?.customers?.name || o.import_orders?.receiver_name || '-'}
                          </td>
                          <td className="px-4 py-3 text-[13px] font-medium text-slate-600 border-r border-slate-100">
                            {o.product_name.includes(' - ') ? o.product_name.split(' - ').slice(1).join(' - ') : o.product_name}
                          </td>
                          <td className="px-2 py-3 text-[13px] font-bold text-slate-500 text-center tabular-nums border-r border-slate-100">
                            {formatNumber(o.total_quantity)}
                          </td>
                          <td className="px-2 py-3 text-[13px] font-black text-orange-600 text-center tabular-nums border-r border-slate-200">
                            {formatNumber(remainingQty)}
                          </td>
                        {vehicles?.map(v => {
                          const dv = (o.delivery_vehicles || []).find((dv: any) => dv.vehicle_id === v.id);
                          const qty = dv?.assigned_quantity || 0;
                          const isEditableByMe = v.id === myVehicle?.id;
                          const canEdit = isEditableByMe || isAdmin;

                          const isPaid = (o.payment_collections || []).some(
                            (pc: any) => pc.vehicle_id === v.id && (pc.status === 'confirmed' || pc.status === 'self_confirmed')
                          );

                          return (
                            <td 
                              key={v.id} 
                              onClick={() => {
                                if (canEdit && (qty > 0 || remainingQty > 0)) {
                                  openAssign(o, v.id);
                                }
                              }}
                              className={clsx(
                                "px-1 py-1 text-[13px] text-center tabular-nums border-r border-slate-100 last:border-r-0 transition-all relative",
                                qty > 0 ? "font-bold text-blue-600 bg-blue-50/10" : "text-slate-300",
                                canEdit && (qty > 0 || remainingQty > 0) && "cursor-pointer hover:bg-primary/5 active:scale-95"
                              )}
                            >
                              <div className="flex flex-col items-center justify-center">
                                <span>
                                  {qty > 0 ? formatNumber(qty) : (canEdit && remainingQty > 0 ? <PlusCircle size={14} className="mx-auto opacity-10 group-hover:opacity-40" /> : '-')}
                                </span>
                                {isPaid && (
                                  <div className="mt-0.5 flex items-center justify-center gap-0.5 text-green-600 bg-green-100 rounded-sm px-1" title="Đã xác nhận thu tiền">
                                    <CheckCircle size={8} strokeWidth={3} />
                                    <span className="text-[9px] font-black leading-none pb-[1px]">Thu</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        {(!vehicles || vehicles.length === 0) && ['1', '2', '3', '4', '5', '6', '7', '8', 'ba', 'kho'].map(col => {
                          const getQtyForCol = (col: string) => {
                            const matches = (o.delivery_vehicles || []).filter((dv: any) => {
                              const plate = (dv.vehicles?.license_plate || '').toLowerCase();
                              if (col === 'ba') return plate.includes('ba');
                              if (col === 'kho') return plate.includes('kho');
                              return plate.includes(col);
                            });
                            return matches.reduce((sum: number, dv: any) => sum + (dv.assigned_quantity || 0), 0);
                          };
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

            {/* Mobile View */}
            <div className="md:hidden flex flex-col gap-4 px-3 pt-0 pb-20 relative">
              {sortedDates.map((date) => (
                <div key={`mobile-${date}`} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 sticky top-0 bg-slate-50/95 backdrop-blur-sm p-3 -mx-3 px-5 z-10 border-b border-border/50 shadow-sm">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Calendar size={14} />
                    </div>
                    <span className="text-[13px] font-black text-slate-800 uppercase tracking-wider">
                      Ngày giao: {new Date(date).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-3 px-1">
                    {groupedOrders[date].map((o: any) => {
                      const totalAssigned = (o.delivery_vehicles || []).reduce(
                        (sum: number, dv: any) => sum + (dv.assigned_quantity || 0),
                        0
                      );
                      const remainingQty = o.total_quantity - totalAssigned;
                      
                      return (
                        <div 
                          key={`mobile-order-${o.id}`}
                          onClick={() => openAssign(o)}
                          className={clsx(
                            "bg-white rounded-2xl p-4 border shadow-sm transition-all relative overflow-hidden flex flex-col gap-2",
                            "cursor-pointer active:scale-[0.98]",
                            remainingQty > 0 ? "border-orange-200 hover:border-orange-300" : "border-slate-200 hover:border-slate-300"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col pr-4">
                              <span className="text-[14px] font-bold text-primary mb-0.5">{o.import_orders?.order_code || 'N/A'}</span>
                              <span className="text-[13px] font-bold text-slate-700 leading-snug">
                                {o.product_name.includes(' - ') ? o.product_name.split(' - ').slice(1).join(' - ') : o.product_name}
                              </span>
                            </div>
                            {remainingQty > 0 ? (
                              <div className="px-2 py-1 bg-orange-100 text-orange-600 rounded-lg text-[10px] font-bold shrink-0 border border-orange-200 shadow-sm">
                                Thiếu {formatNumber(remainingQty)}
                              </div>
                            ) : (
                              <div className="px-2 py-1 bg-green-100 text-green-600 rounded-lg text-[10px] font-bold shrink-0 border border-green-200 shadow-sm">
                                Đã đủ
                              </div>
                            )}
                          </div>

                          <div className="flex text-[12px] text-slate-500">
                            Người nhận: <span className="font-semibold text-slate-700 ml-1">{o.import_orders?.customers?.name || o.import_orders?.receiver_name || '-'}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-1 pt-3 border-t border-slate-100">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Tổng SL</span>
                              <span className="text-[14px] font-bold text-slate-700 tabular-nums">{formatNumber(o.total_quantity)}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Còn lại</span>
                              <span className="text-[14px] font-black text-orange-600 tabular-nums">{formatNumber(remainingQty)}</span>
                            </div>
                          </div>

                          {/* Show assigned vehicles */}
                          {o.delivery_vehicles?.length > 0 && o.delivery_vehicles.some((dv: any) => dv.assigned_quantity > 0) && (
                            <div className="mt-1 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                              {o.delivery_vehicles.filter((dv: any) => dv.assigned_quantity > 0).map((dv: any) => {
                                const isPaid = (o.payment_collections || []).some(
                                  (pc: any) => pc.vehicle_id === dv.vehicle_id && (pc.status === 'confirmed' || pc.status === 'self_confirmed')
                                );
                                return (
                                  <div key={dv.id} className={clsx("flex items-center gap-1.5 px-2 py-1 rounded-md border", isPaid ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-100")} title={isPaid ? "Đã thu tiền" : undefined}>
                                    <Truck size={12} className={isPaid ? "text-green-500" : "text-blue-500"} />
                                    <span className={clsx("text-[11px] font-bold", isPaid ? "text-green-700" : "text-blue-700")}>{dv.vehicles?.license_plate || '-'}</span>
                                    <span className="text-[11px] font-black text-slate-700 ml-1">{formatNumber(dv.assigned_quantity)}</span>
                                    {isPaid && <CheckCircle size={12} className="text-green-600 ml-0.5" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AssignVehicleDialog
        isOpen={isAssignOpen}
        isClosing={isAssignClosing}
        order={selectedOrder}
        initialVehicleId={selectedVehicleId}
        onClose={closeAssign}
      />
    </div>
  );
};

export default VegetableDeliveryPage;
