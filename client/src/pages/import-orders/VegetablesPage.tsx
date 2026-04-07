import React, { useState, useMemo } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useImportOrders } from '../../hooks/queries/useImportOrders';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Filter, FileDown, Search, X, Store, Truck, UserCircle, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { MultiSearchableSelect } from '../../components/ui/MultiSearchableSelect';
import { DateRangePicker } from '../../components/shared/DateRangePicker';
import * as XLSX from 'xlsx';

import MobileFilterSheet from '../../components/shared/MobileFilterSheet';
import { ColumnSettings } from '../../components/shared/ColumnSettings';

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

const COL_DEF: Record<string, { thClass: string, tdClass: string, render: (item: any) => React.ReactNode }> = {
  nguoi_nhan: { thClass: 'text-left', tdClass: '', render: (item: any) => <div className="font-bold text-[13px] text-foreground">{item.order?.receiver_name || item.order?.profiles?.full_name || item.order?.received_by || '-'}</div> },
  chu_hang: { thClass: 'text-left', tdClass: '', render: (item: any) => <div className="font-bold text-[13px] text-foreground">{item.order?.sender_name || item.order?.customers?.name || '-'}</div> },
  tai: { thClass: 'text-center w-36', tdClass: 'text-center', render: (item: any) => <span className="text-[13px] font-medium text-muted-foreground">{getAssignedVehicles(item)}</span> },
  sl: { thClass: 'text-center w-24', tdClass: 'text-center', render: (item: any) => <span className="font-bold text-[13px] text-primary tabular-nums">{item.quantity}</span> },
  so_hang: { thClass: 'text-center w-28', tdClass: 'text-center', render: (item: any) => <span className="text-[13px] font-medium text-foreground tabular-nums">{item.weight_kg ? `${item.weight_kg} Kg` : '-'}</span> },
  ten_hang: { thClass: 'text-left', tdClass: '', render: (item: any) => <div className="font-medium text-[13px] text-foreground">{item.products?.name || '-'}</div> },
  tien: { thClass: 'text-right w-32', tdClass: 'text-right', render: (item: any) => <span className="text-[13px] font-medium text-muted-foreground tabular-nums">{item.unit_price ? formatCurrency(item.unit_price) : '-'}</span> },
  thanh_tien: { thClass: 'text-right w-40', tdClass: 'text-right', render: (item: any) => <span className="text-[13px] font-bold text-primary tabular-nums">{item.total_amount ? formatCurrency(item.total_amount) : '-'}</span> },
};

const VegetablesPage: React.FC = () => {
  const [columns, setColumns] = useState([
    { id: 'nguoi_nhan', label: 'Người Nhận', isVisible: true },
    { id: 'chu_hang', label: 'Chủ Hàng', isVisible: true },
    { id: 'tai', label: 'Tài', isVisible: true },
    { id: 'sl', label: 'SL', isVisible: true },
    { id: 'so_hang', label: 'Số Kg', isVisible: true },
    { id: 'ten_hang', label: 'Tên Hàng', isVisible: true },
    { id: 'tien', label: 'Tiền', isVisible: true },
    { id: 'thanh_tien', label: 'Thành Tiền', isVisible: true },
  ]);

  const visibleColumns = columns.filter(c => c.isVisible);

  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [filterCustomer, setFilterCustomer] = useState<string[]>([]);
  const [filterVehicle, setFilterVehicle] = useState<string[]>([]);
  const [filterReceiver, setFilterReceiver] = useState<string[]>([]);

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
  if (filterDateFrom) filters.dateFrom = filterDateFrom;
  if (filterDateTo) filters.dateTo = filterDateTo;
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

  const { vuaOptions, taiOptions, nguoiNhapOptions } = useMemo(() => {
    if (!flattenedItems) return { vuaOptions: [], taiOptions: [], nguoiNhapOptions: [] };
    const vuaSet = new Set<string>();
    const taiSet = new Set<string>();
    const receiverSet = new Set<string>();

    flattenedItems.forEach(i => {
      const chuHang = i.order?.sender_name || i.order?.customers?.name;
      if (chuHang) vuaSet.add(chuHang);

      const tai = getAssignedVehicles(i);
      if (tai && tai !== '-') {
        tai.split(', ').forEach((t: string) => taiSet.add(t));
      }

      const receiver = i.order?.profiles?.full_name || i.order?.receiver_name || i.order?.received_by;
      if (receiver) receiverSet.add(receiver);
    });

    return {
      vuaOptions: Array.from(vuaSet).map(v => ({ label: v, value: v })),
      taiOptions: Array.from(taiSet).map(v => ({ label: v, value: v })),
      nguoiNhapOptions: Array.from(receiverSet).map(v => ({ label: v, value: v }))
    };
  }, [flattenedItems]);

  const filteredItems = useMemo(() => {
    return flattenedItems.filter(i => {
      const chuHang = i.order?.sender_name || i.order?.customers?.name;
      const tai = getAssignedVehicles(i);
      const receiver = i.order?.profiles?.full_name || i.order?.receiver_name || i.order?.received_by;

      let matches = false;
      if (!searchQuery) {
        matches = true;
      } else {
        const q = searchQuery.toLowerCase();
        matches = (chuHang?.toLowerCase() || '').includes(q) || (receiver?.toLowerCase() || '').includes(q) || (i.products?.name?.toLowerCase() || '').includes(q);
      }

      if (!matches) return false;
      if (filterCustomer.length > 0 && chuHang && !filterCustomer.includes(chuHang)) return false;

      if (filterVehicle.length > 0) {
        if (!tai) return false;
        const itemPlates = tai.split(', ');
        const hasMatch = filterVehicle.some(v => itemPlates.includes(v));
        if (!hasMatch) return false;
      }

      if (filterReceiver.length > 0 && receiver && !filterReceiver.includes(receiver)) return false;

      return true;
    });
  }, [flattenedItems, searchQuery, filterCustomer, filterVehicle, filterReceiver]);

  const totalAmount = filteredItems.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

  const exportExcel = () => {
    const wsData = filteredItems.map(item => ({
      "Người Nhận": item.order?.receiver_name || item.order?.profiles?.full_name || item.order?.received_by || '-',
      "Chủ Hàng": item.order?.sender_name || item.order?.customers?.name || '-',
      "Tài (Xe)": getAssignedVehicles(item),
      "Người nhập": item.order?.profiles?.full_name || item.order?.receiver_name || item.order?.received_by || '-',
      "Số lượng": item.quantity,
      "Số Kg": item.weight_kg ? `${item.weight_kg} Kg` : '-',
      "Tên Hàng": item.products?.name || '-',
      "Đơn giá": item.unit_price || 0,
      "Thành Tiền": item.total_amount || 0
    }));

    wsData.push({
      "Người Nhận": "TỔNG CỘNG",
      "Chủ Hàng": "",
      "Tài (Xe)": "",
      "Người nhập": "",
      "Số lượng": "",
      "Số Kg": "",
      "Tên Hàng": "",
      "Đơn giá": "",
      "Thành Tiền": totalAmount
    } as any);

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bảng Hàng Rau");
    const fileNameDate = filterDateFrom && filterDateTo && filterDateFrom !== filterDateTo
      ? `${filterDateFrom}_den_${filterDateTo}`
      : filterDateFrom || 'Tat_Ca';
    XLSX.writeFile(wb, `BangHangRau_${fileNameDate}.xlsx`);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="hidden md:block">
        <PageHeader
          title="Bảng Hàng Rau"
          description="Xem danh sách chi tiết các mặt hàng rau nhập trong ngày"
          backPath="/hang-hoa"
        />
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
            placeholder="Tên vựa, hàng..."
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
              options={vuaOptions}
              value={filterCustomer}
              onValueChange={setFilterCustomer}
              placeholder="Chủ hàng"
              className="bg-transparent"
              icon={<Store size={15} />}
            />
          </div>
          <div className="w-[200px]">
            <MultiSearchableSelect
              options={taiOptions}
              value={filterVehicle}
              onValueChange={setFilterVehicle}
              placeholder="Tài"
              className="bg-transparent"
              icon={<Truck size={15} />}
            />
          </div>
          <div className="w-[200px]">
            <MultiSearchableSelect
              options={nguoiNhapOptions}
              value={filterReceiver}
              onValueChange={setFilterReceiver}
              placeholder="Người nhập"
              className="bg-transparent"
              icon={<UserCircle size={15} />}
            />
          </div>
        </div>

        {/* DESKTOP DATE FILTER */}
        <div className="hidden md:block shrink-0">
          <DateRangePicker
            initialDateFrom={filterDateFrom}
            initialDateTo={filterDateTo}
            onUpdate={({ range }) => {
              const f = range.from ? format(range.from, 'yyyy-MM-dd') : '';
              const t = range.to ? format(range.to, 'yyyy-MM-dd') : f;
              setFilterDateFrom(f);
              setFilterDateTo(t);
            }}
            icon={<CalendarDays size={15} />}
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

          <div className="hidden md:block">
            <ColumnSettings columns={columns} onColumnsChange={setColumns} />
          </div>

          <button
            onClick={exportExcel}
            title="Xuất dữ liệu Excel"
            className="flex items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 h-[38px] w-[38px] md:w-auto md:px-3 rounded-xl shadow-sm transition-colors shrink-0"
          >
            <FileDown size={17} className="md:mr-2" />
            <span className="hidden md:inline text-[13px] font-bold">Xuất Excel</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton type="table" rows={10} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !filteredItems?.length ? (
        <EmptyState
          title="Không có dữ liệu hàng rau"
          description={
            (filterDateFrom && filterDateTo && filterDateFrom !== filterDateTo)
              ? `Không có mặt hàng nào từ ngày ${format(new Date(filterDateFrom), 'dd/MM/yyyy')} đến ${format(new Date(filterDateTo), 'dd/MM/yyyy')}`
              : filterDateFrom
                ? `Không có mặt hàng nào được nhập vào ngày ${format(new Date(filterDateFrom), 'dd/MM/yyyy')}`
                : "Chưa có mặt hàng nào được tạo."
          }
        />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Desktop Table View */}
          <div className="hidden md:flex flex-1 bg-white rounded-2xl border border-border shadow-sm flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full border-collapse min-w-[800px] border-hidden">
                <thead className="sticky top-0 z-10 bg-muted/60">
                  <tr>
                    {visibleColumns.map((col) => (
                      <th key={col.id} className={`px-4 py-3 border border-border text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest ${COL_DEF[col.id].thClass}`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-muted/10 transition-colors group">
                      {visibleColumns.map((col) => (
                        <td key={col.id} className={`px-4 py-3 border border-border ${COL_DEF[col.id].tdClass}`}>
                          {COL_DEF[col.id].render(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 z-10 bg-muted/60 shadow-[0_-2px_6px_rgba(0,0,0,0.05)]">
                  <tr>
                    {visibleColumns.map((col, idx) => {
                      if (col.id === 'thanh_tien') {
                        return (
                          <td key={col.id} className={`px-4 py-3 border border-border text-right text-[15px] font-black text-primary tabular-nums`}>
                            {formatCurrency(totalAmount)}
                          </td>
                        );
                      }
                      return (
                        <td key={col.id} className={`px-4 py-3 border border-border ${COL_DEF[col.id].tdClass} text-[14px] font-black uppercase text-foreground`}>
                          {idx === 0 ? 'Tổng' : ''}
                        </td>
                      );
                    })}
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
                      <div className="text-[14px] font-bold text-foreground mb-1 whitespace-normal leading-snug">
                        {item.order?.receiver_name || item.order?.profiles?.full_name || item.order?.received_by || '-'}
                      </div>
                      <div className="text-[12px] font-medium text-muted-foreground mb-2 whitespace-normal leading-snug">
                        Chủ hàng: {item.order?.sender_name || item.order?.customers?.name || '-'}
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
                        {item.weight_kg && (
                          <div className="text-[12px] text-muted-foreground flex items-center gap-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase w-8 shrink-0">Số Kg</span>
                            <span className="font-medium text-foreground truncate">{item.weight_kg} Kg</span>
                          </div>
                        )}
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
          setFilterDateFrom(filters.dateFrom || '');
          setFilterDateTo(filters.dateTo || '');
        }}
        onClear={() => {
          setFilterCustomer([]);
          setFilterVehicle([]);
          setFilterReceiver([]);
        }}
        showClearButton={filterCustomer.length > 0 || filterVehicle.length > 0 || filterReceiver.length > 0}
        initialDateFrom={filterDateFrom}
        initialDateTo={filterDateTo}
        dateLabel="Khoảng thời gian"
      >
        <div className="space-y-1.5 z-30">
          <label className="text-[13px] font-bold text-muted-foreground">Chủ hàng</label>
          <MultiSearchableSelect
            options={vuaOptions}
            value={filterCustomer}
            onValueChange={setFilterCustomer}
            placeholder="Tất cả..."
            className="w-full bg-muted/10 h-[42px] border-border/80 rounded-xl"
            inline
            icon={<Store size={15} />}
          />
        </div>
        <div className="space-y-1.5 z-20">
          <label className="text-[13px] font-bold text-muted-foreground">Tài (Xe)</label>
          <MultiSearchableSelect
            options={taiOptions}
            value={filterVehicle}
            onValueChange={setFilterVehicle}
            placeholder="Tất cả..."
            className="w-full bg-muted/10 h-[42px] border-border/80 rounded-xl"
            inline
            icon={<Truck size={15} />}
          />
        </div>
        <div className="space-y-1.5 z-10">
          <label className="text-[13px] font-bold text-muted-foreground">Người Nhập</label>
          <MultiSearchableSelect
            options={nguoiNhapOptions}
            value={filterReceiver}
            onValueChange={setFilterReceiver}
            placeholder="Tất cả..."
            className="w-full bg-muted/10 h-[42px] border-border/80 rounded-xl"
            inline
            icon={<UserCircle size={15} />}
          />
        </div>
      </MobileFilterSheet>
    </div>
  );
};

export default VegetablesPage;
