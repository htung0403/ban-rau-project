import React, { useState } from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { Calendar, PlusCircle, Truck, CheckCircle, Check, Search, Store, Package, User } from 'lucide-react';
import { DateRangePicker } from '../../components/shared/DateRangePicker';
import PageHeader from '../../components/shared/PageHeader';
import { useDeliveryOrders, useAssignVehicle, useConfirmDelivery } from '../../hooks/queries/useDelivery';
import { useVehicles } from '../../hooks/queries/useVehicles';
import { useAuth } from '../../context/AuthContext';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import AssignVehicleDialog from './dialogs/AssignVehicleDialog';
import { MultiSearchableSelect } from '../../components/ui/MultiSearchableSelect';
import MobileFilterSheet from '../../components/shared/MobileFilterSheet';
import { Filter, X } from 'lucide-react';

const formatNumber = (val?: number) => {
  if (val == null) return '0.00';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

const STATUS_LABELS: Record<string, string> = {
  hang_o_sg: 'Hàng ở SG',
  can_giao: 'Cần giao',
  da_giao: 'Đã giao',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  hang_o_sg: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
  can_giao: { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-500' },
  da_giao: { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500' },
};

const DeliveryPage: React.FC = () => {
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<'can_giao' | 'hang_o_sg' | 'da_giao'>('can_giao');

  const { user } = useAuth();
  const { data: orders, isLoading: ordersLoading, isError, refetch } = useDeliveryOrders(startDate, endDate, 'standard');
  const { data: vehicles } = useVehicles();
  const assignMutation = useAssignVehicle();
  const confirmMutation = useConfirmDelivery();

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAssignClosing, setIsAssignClosing] = useState(false);



  const isLoading = ordersLoading;
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isDriver = user?.role === 'driver';
  const myVehicle = vehicles?.find(v => v.driver_id === user?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCustomer, setFilterCustomer] = useState<string[]>([]);
  const [filterReceiver, setFilterReceiver] = useState<string[]>([]);
  const [filterProduct, setFilterProduct] = useState<string[]>([]);

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

  const handleOrderClick = async (order: any, vehicleId?: string) => {
    const existingDvs = order.delivery_vehicles || [];
    const totalAssigned = existingDvs.reduce((sum: number, dv: any) => sum + (dv.assigned_quantity || 0), 0);
    const remainingQty = order.total_quantity - totalAssigned;

    const clickedVehicleId = vehicleId || myVehicle?.id;

    if (
      isDriver &&
      clickedVehicleId &&
      myVehicle?.id === clickedVehicleId &&
      existingDvs.length > 0 &&
      remainingQty > 0
    ) {
      const payload: any[] = [];
      existingDvs.forEach((dv: any) => {
        payload.push({
          vehicle_id: dv.vehicle_id,
          driver_id: dv.driver_id || '',
          quantity: dv.assigned_quantity,
          expected_amount: dv.expected_amount || (dv.assigned_quantity * (order.unit_price || 0))
        });
      });

      const myExistingIndex = payload.findIndex((p: any) => p.vehicle_id === clickedVehicleId);
      if (myExistingIndex >= 0) {
        payload[myExistingIndex].quantity += remainingQty;
        payload[myExistingIndex].expected_amount = payload[myExistingIndex].quantity * (order.unit_price || 0);
      } else {
        payload.push({
          vehicle_id: clickedVehicleId,
          driver_id: user?.id || '',
          quantity: remainingQty,
          expected_amount: remainingQty * (order.unit_price || 0)
        });
      }

      try {
        await assignMutation.mutateAsync({
           id: order.id,
           payload: payload as any
        });
        return;
      } catch (error) {
        // Fallback to dialog on error, or just do nothing
        return;
      }
    }

    openAssign(order, vehicleId);
  };

  const handleConfirm = async (orderIds: string[]) => {
    try {
      await confirmMutation.mutateAsync(orderIds);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Status counts for tabs
  const statusCounts = React.useMemo(() => {
    if (!orders) return { hang_o_sg: 0, can_giao: 0, da_giao: 0 };
    return {
      hang_o_sg: orders.filter((o: any) => o.status === 'hang_o_sg').length,
      can_giao: orders.filter((o: any) => o.status === 'can_giao').length,
      da_giao: orders.filter((o: any) => o.status === 'da_giao').length,
    };
  }, [orders]);

  const { customerOptions, receiverOptions, productOptions } = React.useMemo(() => {
    if (!orders) return { customerOptions: [], receiverOptions: [], productOptions: [] };
    const cSet = new Set<string>();
    const rSet = new Set<string>();
    const pSet = new Set<string>();
    orders.forEach(o => {
      const cName = o.import_orders?.sender_name || o.import_orders?.customers?.name;
      if (cName) cSet.add(cName);

      const rName = o.import_orders?.customers?.name || o.import_orders?.receiver_name?.trim() || o.import_orders?.profiles?.full_name;
      if (rName) rSet.add(rName);

      const pName = o.product_name.includes(' - ') ? o.product_name.split(' - ').slice(1).join(' - ') : o.product_name;
      if (pName) pSet.add(pName);
    });
    return {
      customerOptions: Array.from(cSet).map(c => ({ label: c, value: c })),
      receiverOptions: Array.from(rSet).map(c => ({ label: c, value: c })),
      productOptions: Array.from(pSet).map(p => ({ label: p, value: p })),
    };
  }, [orders]);

  const filteredOrders = React.useMemo(() => {
    let list = orders || [];

    // Filter by status
    list = list.filter(o => o.status === statusFilter);

    // Driver / Hiding logic (only for can_giao tab)
    if (statusFilter === 'can_giao') {
      list = list.filter(o => {
        if (isDriver) {
          const totalAssigned = (o.delivery_vehicles || []).reduce((s: number, dv: any) => s + (dv.assigned_quantity || 0), 0);
          const remainingQty = o.total_quantity - totalAssigned;
          const myAssigned = (o.delivery_vehicles || []).find((dv: any) => dv.vehicle_id === myVehicle?.id)?.assigned_quantity || 0;
          if (myAssigned > 0 || remainingQty > 0) return true;
          return false;
        }
        return true;
      });
    }

    // Text & Select Filters logic
    list = list.filter(o => {
      const cName = o.import_orders?.sender_name || o.import_orders?.customers?.name;
      const rName = o.import_orders?.customers?.name || o.import_orders?.receiver_name?.trim() || o.import_orders?.profiles?.full_name;
      const pName = o.product_name.includes(' - ') ? o.product_name.split(' - ').slice(1).join(' - ') : o.product_name;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!cName?.toLowerCase().includes(q) && !rName?.toLowerCase().includes(q) && !pName?.toLowerCase().includes(q) && !(o.import_orders?.order_code?.toLowerCase().includes(q))) {
          return false;
        }
      }
      if (filterCustomer.length > 0 && cName && !filterCustomer.includes(cName)) return false;
      if (filterReceiver.length > 0 && rName && !filterReceiver.includes(rName)) return false;
      if (filterProduct.length > 0 && pName && !filterProduct.includes(pName)) return false;

      return true;
    });

    return list;
  }, [orders, statusFilter, isDriver, myVehicle?.id, searchQuery, filterCustomer, filterReceiver, filterProduct]);

  // Grouping logic: Date -> [Orders]
  const groupedOrders = (filteredOrders || []).reduce((acc: Record<string, any[]>, order: any) => {
    const date = order.delivery_date || 'N/A';
    if (!acc[date]) acc[date] = [];
    acc[date].push(order);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a)); // Newest first

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="hidden md:block">
        <PageHeader title="Hàng cần giao" description="Danh sách đơn hàng cần giao" backPath="/hang-hoa" />
      </div>

      <div className="bg-card flex flex-row w-full gap-2 items-center rounded-2xl shadow-sm border border-border p-2.5 md:mb-6 mb-3 overflow-x-auto custom-scrollbar">
        {/* SEARCH BAR */}
        <div className="relative flex-1 min-w-[200px] md:max-w-full">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/60">
            <Search size={15} />
          </div>
          <input
            type="text"
            className="w-full text-[13px] bg-muted/20 border border-border/80 rounded-xl pl-9 pr-7 py-2 h-[38px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/60 font-medium"
            placeholder="Tìm mã, vựa, hàng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        {/* DESKTOP ADVANCED FILTERS */}
        <div className="hidden md:flex gap-2 items-center shrink-0">
          <div className="w-[200px]">
            <MultiSearchableSelect
              options={customerOptions}
              value={filterCustomer}
              onValueChange={setFilterCustomer}
              placeholder="Tên vựa / chủ"
              className="bg-transparent"
              icon={<Store size={15} />}
            />
          </div>

          <div className="w-[200px]">
            <MultiSearchableSelect
              options={receiverOptions}
              value={filterReceiver}
              onValueChange={setFilterReceiver}
              placeholder="Người nhận"
              className="bg-transparent"
              icon={<User size={15} />}
            />
          </div>

          <div className="w-[200px]">
            <MultiSearchableSelect
              options={productOptions}
              value={filterProduct}
              onValueChange={setFilterProduct}
              placeholder="Tên hàng"
              className="bg-transparent"
              icon={<Package size={15} />}
            />
          </div>
        </div>

        {/* DESKTOP DATE FILTER */}
        <div className="hidden md:block shrink-0">
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

        {/* ACTIONS */}
        <div className="flex items-center gap-2 shrink-0">
          {/* MOBILE FILTER BUTTON */}
          <button
            onClick={openFilter}
            className="md:hidden flex items-center justify-center w-[38px] h-[38px] shrink-0 border border-border/80 rounded-xl transition-all bg-muted/20 text-muted-foreground hover:bg-muted"
          >
            <Filter size={17} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Status Tabs */}
        <div className="flex flex-col shrink-0 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto custom-scrollbar">
            {(['can_giao', 'hang_o_sg', 'da_giao'] as const).map(status => {
              const colors = STATUS_COLORS[status];
              const isActive = statusFilter === status;
              const count = statusCounts[status];
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap",
                    isActive
                      ? `${colors.bg} ${colors.text} shadow-sm ring-1 ring-black/5`
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <div className={clsx("w-1.5 h-1.5 rounded-full", isActive ? colors.dot : "bg-muted-foreground/40")} />
                  {STATUS_LABELS[status]}
                  {count > 0 && (
                    <span className={clsx(
                      "text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                      isActive ? `${colors.bg} ${colors.text}` : "bg-muted/60 text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Confirm All Button - desktop only inline */}
            {statusFilter === 'hang_o_sg' && isAdmin && filteredOrders.length > 0 && (
              <button
                onClick={() => handleConfirm(filteredOrders.map(o => o.id))}
                disabled={confirmMutation.isPending}
                className="hidden md:flex ml-auto items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 whitespace-nowrap"
              >
                <Check size={14} strokeWidth={2.5} />
                {confirmMutation.isPending ? 'Đang xử lý...' : 'Xác nhận tất cả'}
              </button>
            )}
          </div>

          {/* Mobile Confirm All Button - separate row */}
          {statusFilter === 'hang_o_sg' && isAdmin && filteredOrders.length > 0 && (
            <div className="md:hidden px-3 pb-2">
              <button
                onClick={() => handleConfirm(filteredOrders.map(o => o.id))}
                disabled={confirmMutation.isPending}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
              >
                <Check size={15} strokeWidth={2.5} />
                {confirmMutation.isPending ? 'Đang xử lý...' : `Xác nhận tất cả (${filteredOrders.length})`}
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={10} columns={6} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !filteredOrders?.length ? (
          <EmptyState 
            title={statusFilter === 'can_giao' ? "Không có đơn cần giao" : statusFilter === 'hang_o_sg' ? "Không có hàng ở SG" : "Không có đơn đã giao"} 
            description={`Không có đơn hàng nào với trạng thái "${STATUS_LABELS[statusFilter]}" phù hợp với bộ lọc.`} 
          />
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
                    <th className="px-2 py-3 text-[11px] font-bold uppercase tracking-tight text-center w-[70px] border-r border-slate-100">Trạng thái</th>
                    <th className="px-2 py-3 text-[11px] font-bold uppercase tracking-tight text-center w-20 border-r border-slate-100">SL Tổng</th>
                    <th className="px-2 py-3 text-[11px] font-bold uppercase tracking-tight text-center w-20 border-r border-slate-100">Còn lại</th>
                    <th className="px-2 py-3 text-[11px] font-bold uppercase tracking-tight text-center w-20 border-r border-slate-200">Dư</th>
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
                        <td colSpan={7 + (vehicles?.length || 10)} className="px-4 py-2.5">
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
                        const statusColor = STATUS_COLORS[o.status] || STATUS_COLORS.can_giao;

                        return (
                          <tr key={o.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-4 py-3 border-r border-slate-100">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[13px] font-bold text-primary">{o.import_orders?.order_code || 'N/A'}</span>
                                <div className="flex items-center gap-1">
                                  {statusFilter === 'hang_o_sg' && isAdmin && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConfirm([o.id]);
                                      }}
                                      disabled={confirmMutation.isPending}
                                      className="p-1.5 rounded-md transition-colors bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50"
                                      title="Xác nhận giao"
                                    >
                                      <Check size={14} strokeWidth={2.5} />
                                    </button>
                                  )}
                                  {statusFilter === 'can_giao' && isAdmin && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOrderClick(o);
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
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[12px] font-bold text-slate-700 border-r border-slate-100">
                              {(() => {
                                const orderObj = o.import_orders || {};
                                const custName = orderObj.customers?.name;
                                const recName = orderObj.receiver_name?.trim();
                                return custName || recName || orderObj.profiles?.full_name || '-';
                              })()}
                            </td>
                            <td className="px-4 py-3 text-[13px] font-medium text-slate-600 border-r border-slate-100">
                              {o.product_name.includes(' - ') ? o.product_name.split(' - ').slice(1).join(' - ') : o.product_name}
                            </td>
                            <td className="px-2 py-3 border-r border-slate-100">
                              <div className={clsx("flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold mx-auto w-fit", statusColor.bg, statusColor.text)}>
                                <div className={clsx("w-1.5 h-1.5 rounded-full", statusColor.dot)} />
                                {STATUS_LABELS[o.status] || o.status}
                              </div>
                            </td>
                            <td className="px-2 py-3 text-[13px] font-bold text-slate-500 text-center tabular-nums border-r border-slate-100">
                              {formatNumber(o.total_quantity)}
                            </td>
                            <td className="px-2 py-3 text-[13px] font-black text-orange-600 text-center tabular-nums border-r border-slate-100">
                              {formatNumber(remainingQty > 0 ? remainingQty : 0)}
                            </td>
                            <td className="px-2 py-3 text-[13px] font-black text-red-600 text-center tabular-nums border-r border-slate-200">
                              {remainingQty < 0 ? formatNumber(remainingQty) : '-'}
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
                                    if (statusFilter === 'can_giao' && canEdit && (qty > 0 || remainingQty > 0)) {
                                      handleOrderClick(o, v.id);
                                    }
                                  }}
                                  className={clsx(
                                    "px-1 py-1 text-[13px] text-center tabular-nums border-r border-slate-100 last:border-r-0 transition-all relative",
                                    qty > 0 ? "font-bold text-blue-600 bg-blue-50/10" : "text-slate-300",
                                    statusFilter === 'can_giao' && canEdit && (qty > 0 || remainingQty > 0) && "cursor-pointer hover:bg-primary/5 active:scale-95"
                                  )}
                                >
                                  <div className="flex flex-col items-center justify-center">
                                    <span>
                                      {qty > 0 ? formatNumber(qty) : (statusFilter === 'can_giao' && canEdit && remainingQty > 0 ? <PlusCircle size={14} className="mx-auto opacity-10 group-hover:opacity-40" /> : '-')}
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
            <div className="md:hidden flex flex-col gap-3 px-3 pt-0 pb-20 relative">
              {sortedDates.map((date) => (
                <div key={`mobile-${date}`} className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 sticky top-0 bg-slate-50/95 backdrop-blur-sm p-3 -mx-3 px-5 z-10 border-b border-border/50 shadow-sm">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Calendar size={14} />
                    </div>
                    <span className="text-[13px] font-black text-slate-800 uppercase tracking-wider">
                      Ngày giao: {new Date(date).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5 px-0.5">
                    {groupedOrders[date].map((o: any) => {
                      const totalAssigned = (o.delivery_vehicles || []).reduce(
                        (sum: number, dv: any) => sum + (dv.assigned_quantity || 0),
                        0
                      );
                      const remainingQty = o.total_quantity - totalAssigned;

                      return (
                        <div
                          key={`mobile-order-${o.id}`}
                          onClick={() => {
                            if (statusFilter === 'can_giao') handleOrderClick(o);
                          }}
                          className={clsx(
                            "bg-white rounded-xl border shadow-sm transition-all relative overflow-hidden",
                            statusFilter === 'can_giao' && "cursor-pointer active:scale-[0.98]",
                            remainingQty > 0 && statusFilter === 'can_giao' ? "border-orange-200" : "border-slate-200"
                          )}
                        >
                          {/* Card body */}
                          <div className="p-3 flex flex-col gap-2">
                            {/* Row 1: Order code + Product name */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[13px] font-bold text-primary">{o.import_orders?.order_code || 'N/A'}</span>
                              <div className="w-1 h-1 rounded-full bg-slate-300" />
                              <span className="text-[13px] font-bold text-slate-700">
                                {o.product_name.includes(' - ') ? o.product_name.split(' - ').slice(1).join(' - ') : o.product_name}
                              </span>
                            </div>

                            {/* Row 2: Receiver + Quantity */}
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5 text-[12px] text-slate-500 truncate pr-2">
                                <User size={13} className="text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-700 truncate">
                                  {(() => {
                                    const orderObj = o.import_orders || {};
                                    const custName = orderObj.customers?.name;
                                    const recName = orderObj.receiver_name?.trim();
                                    return custName || recName || orderObj.profiles?.full_name || '-';
                                  })()}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">SL:</span>
                                  <span className="text-[14px] font-bold text-slate-700 tabular-nums">{formatNumber(o.total_quantity)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Show assigned vehicles */}
                            {o.delivery_vehicles?.length > 0 && o.delivery_vehicles.some((dv: any) => dv.assigned_quantity > 0) && (
                              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
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

                          {/* Bottom action bar for hang_o_sg */}
                          {statusFilter === 'hang_o_sg' && isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirm([o.id]);
                              }}
                              disabled={confirmMutation.isPending}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 border-t border-green-100 text-[12px] font-bold hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              <Check size={14} strokeWidth={2.5} />
                              Xác nhận giao
                            </button>
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

      <MobileFilterSheet
        isOpen={isFilterOpen}
        isClosing={isFilterClosing}
        onClose={closeFilter}
        onApply={(filters) => {
          setStartDate(filters.dateFrom || '');
          setEndDate(filters.dateTo || '');
        }}
        onClear={() => {
          setFilterCustomer([]);
          setFilterReceiver([]);
          setFilterProduct([]);
        }}
        showClearButton={filterCustomer.length > 0 || filterReceiver.length > 0 || filterProduct.length > 0}
        initialDateFrom={startDate}
        initialDateTo={endDate}
        dateLabel="Khoảng thời gian"
      >
        <div className="space-y-1.5 z-30">
          <label className="text-[13px] font-bold text-muted-foreground">Tên vựa / chủ</label>
          <MultiSearchableSelect
            options={customerOptions}
            value={filterCustomer}
            onValueChange={setFilterCustomer}
            placeholder="Tất cả..."
            className="w-full bg-muted/10 h-[42px] border-border/80 rounded-xl"
            inline
            icon={<Store size={15} />}
          />
        </div>
        <div className="space-y-1.5 z-[25]">
          <label className="text-[13px] font-bold text-muted-foreground">Người nhận</label>
          <MultiSearchableSelect
            options={receiverOptions}
            value={filterReceiver}
            onValueChange={setFilterReceiver}
            placeholder="Tất cả..."
            className="w-full bg-muted/10 h-[42px] border-border/80 rounded-xl"
            inline
            icon={<User size={15} />}
          />
        </div>
        <div className="space-y-1.5 z-20">
          <label className="text-[13px] font-bold text-muted-foreground">Tên hàng</label>
          <MultiSearchableSelect
            options={productOptions}
            value={filterProduct}
            onValueChange={setFilterProduct}
            placeholder="Tất cả..."
            className="w-full bg-muted/10 h-[42px] border-border/80 rounded-xl"
            inline
            icon={<Package size={15} />}
          />
        </div>
      </MobileFilterSheet>
    </div>
  );
};

export default DeliveryPage;
