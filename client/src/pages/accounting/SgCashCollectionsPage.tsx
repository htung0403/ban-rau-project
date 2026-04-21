import React, { useMemo, useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import ErrorState from '../../components/shared/ErrorState';
import EmptyState from '../../components/shared/EmptyState';
import { DateRangePicker } from '../../components/shared/DateRangePicker';
import MobileFilterSheet from '../../components/shared/MobileFilterSheet';
import { MultiSearchableSelect } from '../../components/ui/MultiSearchableSelect';
import { useAuth } from '../../context/AuthContext';
import { useConfirmSgHandover, useSgImportCashList } from '../../hooks/queries/useSgImportCash';
import { useCustomers } from '../../hooks/queries/useCustomers';
import { useVehicles } from '../../hooks/queries/useVehicles';
import { useEmployees } from '../../hooks/queries/useHR';
import { format, subMonths } from 'date-fns';
import { CheckCircle2, Clock, Store, Truck, User, Filter } from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';
import { matchesSearch } from '../../lib/str-utils';

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const isDriverLikeEmployeeRole = (role?: string | null) => {
  const r = (role || '').toLowerCase();
  return r === 'driver' || r.includes('tai_xe') || r.includes('tài xế');
};

type SgRow = {
  id: string;
  order_code: string;
  order_date: string;
  order_time: string;
  receiver_name?: string | null;
  license_plate?: string | null;
  driver_name?: string | null;
  total_amount?: number | null;
  received_by?: string | null;
  customers?: { id?: string; name?: string | null; phone?: string | null } | null;
  collector?: { id?: string; full_name?: string | null } | null;
  sg_cash_handover_confirmed_at?: string | null;
  confirmer?: { full_name?: string | null } | null;
};

const SgCashCollectionsPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || '';
  const r = role.toLowerCase();
  const canConfirm = r === 'admin' || r === 'manager' || r === 'ke_toan';

  const defaultFrom = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
  const defaultTo = format(new Date(), 'yyyy-MM-dd');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCustomer, setFilterCustomer] = useState<string[]>([]);
  const [filterDriver, setFilterDriver] = useState<string[]>([]);
  const [filterVehicle, setFilterVehicle] = useState<string[]>([]);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);

  const { data: customers } = useCustomers(undefined, true);
  const { data: vehicles } = useVehicles(true);
  const { data: employees } = useEmployees(true);

  const { data, isLoading, isError, refetch } = useSgImportCashList({ from, to });
  const confirmMut = useConfirmSgHandover();

  const rows = useMemo(() => (Array.isArray(data) ? (data as SgRow[]) : []), [data]);

  const customerOptions = useMemo(
    () =>
      (customers || []).map((c) => ({
        value: c.id,
        label: `${c.name}${c.phone ? ` (${c.phone})` : ''}`,
      })),
    [customers]
  );

  const vehicleOptions = useMemo(
    () =>
      (vehicles || [])
        .filter((v) => v.license_plate && String(v.license_plate).trim() !== '')
        .map((v) => ({
          value: String(v.license_plate).trim(),
          label: String(v.license_plate).trim(),
        })),
    [vehicles]
  );

  const driverOptions = useMemo(
    () =>
      (employees || [])
        .filter((e) => isDriverLikeEmployeeRole(e.role))
        .map((e) => ({
          value: e.id,
          label: e.full_name || e.id,
        })),
    [employees]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const custId = row.customers?.id;
      if (filterCustomer.length > 0) {
        if (!custId || !filterCustomer.includes(custId)) return false;
      }

      const recv = row.received_by;
      if (filterDriver.length > 0) {
        if (!recv || !filterDriver.includes(recv)) return false;
      }

      const plate = (row.license_plate || '').trim();
      if (filterVehicle.length > 0) {
        if (!plate || !filterVehicle.includes(plate)) return false;
      }

      if (searchQuery.trim()) {
        const code = (row.order_code || '');
        const cname = (row.customers?.name || '');
        const cphone = (row.customers?.phone || '');
        const recvName = (row.receiver_name || '');
        const drvName = (row.driver_name || '');
        const collName = (row.collector?.full_name || '');
        const lp = plate;

        const isHit =
          matchesSearch(code, searchQuery) ||
          matchesSearch(cname, searchQuery) ||
          matchesSearch(cphone, searchQuery) ||
          matchesSearch(recvName, searchQuery) ||
          matchesSearch(drvName, searchQuery) ||
          matchesSearch(collName, searchQuery) ||
          matchesSearch(lp, searchQuery);
          
        if (!isHit) return false;
      }

      return true;
    });
  }, [rows, filterCustomer, filterDriver, filterVehicle, searchQuery]);

  const openFilter = () => setIsFilterOpen(true);
  const closeFilter = () => {
    setIsFilterClosing(true);
    setTimeout(() => {
      setIsFilterOpen(false);
      setIsFilterClosing(false);
    }, 300);
  };

  const hasActiveFilters =
    filterCustomer.length > 0 || filterDriver.length > 0 || filterVehicle.length > 0 || searchQuery.trim() !== '';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col min-h-0">
      <div className="hidden md:block">
        <PageHeader
          title="Thu tiền SG"
          description="Phiếu nhập tạp hóa đã trả tiền tại SG — theo dõi và xác nhận NV đã nộp tiền về."
          backPath="/ke-toan"
        />
      </div>

      <div className="bg-card flex flex-row w-full gap-2 items-center rounded-2xl shadow-sm border border-border p-2.5 md:mb-6 mb-3 overflow-x-auto custom-scrollbar">
        <div className="flex-1 min-w-[200px] md:max-w-full">
          <SearchInput
            placeholder="Tìm mã đơn, khách, xe..."
            onSearch={(raw) => setSearchQuery(raw)}
            className="h-[38px]"
          />
        </div>

        <div className="hidden md:flex gap-2 items-center shrink-0">
          <div className="w-[200px]">
            <MultiSearchableSelect
              options={customerOptions}
              value={filterCustomer}
              onValueChange={setFilterCustomer}
              placeholder="Khách hàng"
              className="bg-transparent"
              icon={<Store size={15} />}
            />
          </div>
          <div className="w-[180px]">
            <MultiSearchableSelect
              options={driverOptions}
              value={filterDriver}
              onValueChange={setFilterDriver}
              placeholder="Tài xế"
              className="bg-transparent"
              icon={<User size={15} />}
            />
          </div>
          <div className="w-[180px]">
            <MultiSearchableSelect
              options={vehicleOptions}
              value={filterVehicle}
              onValueChange={setFilterVehicle}
              placeholder="Theo xe"
              className="bg-transparent"
              icon={<Truck size={15} />}
            />
          </div>
        </div>

        <div className="hidden md:flex flex-col gap-1.5 shrink-0 min-w-[280px]">
          <div className="flex items-center gap-3 px-1">
            <span className="flex-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Từ ngày</span>
            <span className="flex-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Đến ngày</span>
          </div>
          <DateRangePicker
            initialDateFrom={from}
            initialDateTo={to}
            onUpdate={(values) => {
              if (values.range.from) setFrom(format(values.range.from, 'yyyy-MM-dd'));
              else setFrom('');
              if (values.range.to) setTo(format(values.range.to, 'yyyy-MM-dd'));
              else setTo('');
            }}
            align="end"
            className="w-full min-w-[260px]"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 md:hidden">
          <button
            type="button"
            onClick={openFilter}
            className="flex items-center justify-center w-[38px] h-[38px] shrink-0 border border-border/80 rounded-xl transition-all bg-muted text-muted-foreground hover:bg-slate-100"
          >
            <Filter size={17} />
          </button>
        </div>
      </div>

      <div className="md:bg-card md:rounded-2xl md:border md:border-border md:shadow-sm flex flex-col flex-1 min-h-0 md:overflow-hidden -mx-4 sm:mx-0">
        {isLoading ? (
          <LoadingSkeleton className="h-64" />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="Không có phiếu" description="Không có phiếu nhập đã trả trong khoảng thời gian này." />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title="Không có phiếu khớp bộ lọc"
            description="Thử xóa tìm kiếm hoặc nới lỏng bộ lọc khách hàng / tài xế / xe."
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Mã phiếu</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Ngày / giờ</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Người nhận</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">KH</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">NV thu tiền</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight text-right">Số tiền</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Trạng thái nộp tiền</th>
                    {canConfirm && (
                      <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight w-40 text-right">
                        Thao tác
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const confirmed = !!row.sg_cash_handover_confirmed_at;
                    const receiver =
                      [row.receiver_name, row.customers?.name].filter(Boolean).join(' · ') || '—';
                    return (
                      <tr key={row.id} className="border-b border-border/80 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-[13px] font-bold tabular-nums">{row.order_code}</td>
                        <td className="px-4 py-3 text-[13px] text-muted-foreground whitespace-nowrap">
                          {row.order_date} {row.order_time}
                        </td>
                        <td className="px-4 py-3 text-[13px] max-w-[180px] truncate" title={receiver}>
                          {receiver}
                        </td>
                        <td className="px-4 py-3 text-[13px] max-w-[160px] truncate">
                          {row.customers?.name || '—'}
                          {row.customers?.phone ? (
                            <span className="block text-[11px] text-muted-foreground">{row.customers.phone}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[13px]">{row.collector?.full_name || '—'}</td>
                        <td className="px-4 py-3 text-[13px] font-bold text-primary text-right tabular-nums">
                          {formatCurrency(row.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-[13px]">
                          {confirmed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 size={14} />
                              Đã xác nhận
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                              <Clock size={14} />
                              Chưa xác nhận
                            </span>
                          )}
                          {confirmed && row.confirmer?.full_name ? (
                            <span className="block text-[11px] text-muted-foreground mt-0.5">
                              {row.confirmer.full_name}
                            </span>
                          ) : null}
                        </td>
                        {canConfirm && (
                          <td className="px-4 py-3 text-right">
                            {!confirmed ? (
                              <button
                                type="button"
                                disabled={confirmMut.isPending}
                                onClick={() => confirmMut.mutate(row.id)}
                                className="px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-bold hover:bg-primary/90 disabled:opacity-50"
                              >
                                Xác nhận đã nhận tiền
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden flex flex-col gap-3 p-3">
              {filteredRows.map((row) => {
                const confirmed = !!row.sg_cash_handover_confirmed_at;
                const receiver =
                  [row.receiver_name, row.customers?.name].filter(Boolean).join(' · ') || '—';
                return (
                  <div
                    key={row.id}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[13px] font-bold">{row.order_code}</span>
                      <span className="text-[12px] font-bold text-primary tabular-nums">
                        {formatCurrency(row.total_amount)}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      {row.order_date} {row.order_time}
                    </p>
                    <p className="text-[12px]">
                      <span className="text-muted-foreground">Người nhận: </span>
                      {receiver}
                    </p>
                    <p className="text-[12px]">
                      <span className="text-muted-foreground">NV thu tiền: </span>
                      {row.collector?.full_name || '—'}
                    </p>
                    <p className="text-[12px]">
                      {confirmed ? (
                        <span className="text-emerald-700 font-semibold">Đã xác nhận nộp tiền</span>
                      ) : (
                        <span className="text-amber-700 font-medium">Chưa xác nhận nộp tiền</span>
                      )}
                    </p>
                    {canConfirm && !confirmed && (
                      <button
                        type="button"
                        disabled={confirmMut.isPending}
                        onClick={() => confirmMut.mutate(row.id)}
                        className="w-full mt-2 py-2 rounded-xl bg-primary text-white text-[13px] font-bold"
                      >
                        Xác nhận đã nhận tiền
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <MobileFilterSheet
        isOpen={isFilterOpen}
        isClosing={isFilterClosing}
        onClose={closeFilter}
        onApply={(filters) => {
          if (filters.dateFrom) setFrom(filters.dateFrom);
          else setFrom('');
          if (filters.dateTo) setTo(filters.dateTo);
          else setTo('');
        }}
        onClear={() => {
          setFilterCustomer([]);
          setFilterDriver([]);
          setFilterVehicle([]);
          setSearchQuery('');
        }}
        showClearButton={hasActiveFilters}
        initialDateFrom={from}
        initialDateTo={to}
        dateLabel="Khoảng thời gian"
      >
        <div className="space-y-1.5 z-30">
          <label className="text-[13px] font-bold text-muted-foreground">Khách hàng</label>
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
        <div className="space-y-1.5 z-[28]">
          <label className="text-[13px] font-bold text-muted-foreground">Tài xế</label>
          <MultiSearchableSelect
            options={driverOptions}
            value={filterDriver}
            onValueChange={setFilterDriver}
            placeholder="Tất cả..."
            className="w-full bg-muted/10 h-[42px] border-border/80 rounded-xl"
            inline
            icon={<User size={15} />}
          />
        </div>
        <div className="space-y-1.5 z-[25]">
          <label className="text-[13px] font-bold text-muted-foreground">Theo xe</label>
          <MultiSearchableSelect
            options={vehicleOptions}
            value={filterVehicle}
            onValueChange={setFilterVehicle}
            placeholder="Tất cả..."
            className="w-full bg-muted/10 h-[42px] border-border/80 rounded-xl"
            inline
            icon={<Truck size={15} />}
          />
        </div>
      </MobileFilterSheet>
    </div>
  );
};

export default SgCashCollectionsPage;
