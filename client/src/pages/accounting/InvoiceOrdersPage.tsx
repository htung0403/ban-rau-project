import React, { useMemo, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import ErrorState from '../../components/shared/ErrorState';
import EmptyState from '../../components/shared/EmptyState';
import { DateRangePicker } from '../../components/shared/DateRangePicker';
import MobileFilterSheet from '../../components/shared/MobileFilterSheet';
import { MultiSearchableSelect } from '../../components/ui/MultiSearchableSelect';
import { useAuth } from '../../context/AuthContext';
import { useInvoiceOrders, useBulkMarkInvoiceExported } from '../../hooks/queries/useInvoiceOrders';
import { useCustomers } from '../../hooks/queries/useCustomers';
import { format, subMonths } from 'date-fns';
import {
  CheckCircle2,
  Circle,
  Search,
  X,
  Store,
  Filter,
  FileText,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

type InvoiceRow = {
  id: string;
  order_code: string;
  order_date: string;
  order_time: string;
  sender_name?: string | null;
  receiver_name?: string | null;
  total_amount?: number | null;
  invoice_exported?: boolean;
  invoice_exported_at?: string | null;
  payment_status?: string | null;
  customers?: { id?: string; name?: string | null; phone?: string | null; address?: string | null } | null;
  sender_customers?: { id?: string; name?: string | null; phone?: string | null } | null;
  profiles?: { full_name?: string | null } | null;
};

type InvoiceStatusFilter = 'all' | 'exported' | 'not_exported';

interface InvoiceOrdersPageProps {
  category: 'standard' | 'vegetable';
  title: string;
  description: string;
  backPath: string;
}

const INVOICE_STATUS_OPTIONS: { value: InvoiceStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'not_exported', label: 'Chưa xuất HĐ' },
  { value: 'exported', label: 'Đã xuất HĐ' },
];

const InvoiceOrdersPage: React.FC<InvoiceOrdersPageProps> = ({
  category,
  title,
  description,
  backPath,
}) => {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const canExport = role === 'admin' || role === 'manager' || role === 'ke_toan';

  const defaultFrom = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
  const defaultTo = format(new Date(), 'yyyy-MM-dd');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCustomer, setFilterCustomer] = useState<string[]>([]);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatusFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);

  const { data: customers } = useCustomers(undefined, true);
  const { data, isLoading, isError, refetch } = useInvoiceOrders(category, {
    dateFrom: from,
    dateTo: to,
    invoice_status: invoiceStatus,
  });

  const bulkExportMut = useBulkMarkInvoiceExported();

  const rows = useMemo(() => (Array.isArray(data) ? (data as InvoiceRow[]) : []), [data]);

  const customerOptions = useMemo(
    () =>
      (customers || []).map((c) => ({
        value: c.id,
        label: `${c.name}${c.phone ? ` (${c.phone})` : ''}`,
      })),
    [customers]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const custId = row.customers?.id;
      if (filterCustomer.length > 0) {
        if (!custId || !filterCustomer.includes(custId)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const code = (row.order_code || '').toLowerCase();
        const cname = (row.customers?.name || '').toLowerCase();
        const sname = (row.sender_name || '').toLowerCase();
        const rname = (row.receiver_name || '').toLowerCase();
        const scname = (row.sender_customers?.name || '').toLowerCase();
        const hit =
          code.includes(q) ||
          cname.includes(q) ||
          sname.includes(q) ||
          rname.includes(q) ||
          scname.includes(q);
        if (!hit) return false;
      }

      return true;
    });
  }, [rows, filterCustomer, searchQuery]);

  // Selection logic
  const allFilteredIds = useMemo(() => new Set(filteredRows.map((r) => r.id)), [filteredRows]);
  const allSelected = filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.id));
  const someSelected = filteredRows.some((r) => selectedIds.has(r.id)) && !allSelected;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  }, [allSelected, allFilteredIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkExport = (exported: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    bulkExportMut.mutate(
      { ids, category, exported },
      { onSuccess: () => setSelectedIds(new Set()) }
    );
  };

  const openFilter = () => setIsFilterOpen(true);
  const closeFilter = () => {
    setIsFilterClosing(true);
    setTimeout(() => {
      setIsFilterOpen(false);
      setIsFilterClosing(false);
    }, 300);
  };

  const hasActiveFilters =
    filterCustomer.length > 0 || searchQuery.trim() !== '' || invoiceStatus !== 'all';

  const selectedCount = selectedIds.size;
  const selectedExported = filteredRows.filter(r => selectedIds.has(r.id) && r.invoice_exported).length;
  const selectedNotExported = filteredRows.filter(r => selectedIds.has(r.id) && !r.invoice_exported).length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col min-h-0">
      <div className="hidden md:block">
        <PageHeader title={title} description={description} backPath={backPath} />
      </div>

      {/* Toolbar */}
      <div className="bg-card flex flex-row w-full gap-2 items-center rounded-2xl shadow-sm border border-border p-2.5 md:mb-6 mb-3 overflow-x-auto custom-scrollbar">
        <div className="relative flex-1 min-w-[200px] md:max-w-full">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/60">
            <Search size={15} />
          </div>
          <input
            type="text"
            className="w-full text-[13px] bg-muted border border-border/80 rounded-xl pl-9 pr-7 py-2 h-[38px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60 font-medium"
            placeholder="Tìm mã đơn, khách hàng, người gửi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
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
          <div className="w-[170px]">
            <select
              value={invoiceStatus}
              onChange={(e) => setInvoiceStatus(e.target.value as InvoiceStatusFilter)}
              className="w-full h-[38px] text-[13px] font-medium bg-muted border border-border/80 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            >
              {INVOICE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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

      {/* Bulk action bar */}
      {selectedCount > 0 && canExport && (
        <div className="flex items-center gap-3 mb-3 md:mb-4 px-1 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex-1">
            <CheckSquare size={16} className="text-primary shrink-0" />
            <span className="text-[13px] font-bold text-primary">
              Đã chọn {selectedCount} đơn hàng
            </span>
            <div className="flex-1" />
            {selectedNotExported > 0 && (
              <button
                type="button"
                disabled={bulkExportMut.isPending}
                onClick={() => handleBulkExport(true)}
                className="px-4 py-1.5 rounded-lg bg-primary text-white text-[12px] font-bold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <FileText size={14} />
                Xuất hóa đơn ({selectedNotExported})
              </button>
            )}
            {selectedExported > 0 && (
              <button
                type="button"
                disabled={bulkExportMut.isPending}
                onClick={() => handleBulkExport(false)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-white text-[12px] font-bold hover:bg-amber-600 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                Hủy xuất ({selectedExported})
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Table content */}
      <div className="md:bg-card md:rounded-2xl md:border md:border-border md:shadow-sm flex flex-col flex-1 min-h-0 md:overflow-hidden -mx-4 sm:mx-0">
        {isLoading ? (
          <LoadingSkeleton className="h-64" />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Không có đơn hàng"
            description="Không có đơn hàng trong khoảng thời gian này."
          />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title="Không có đơn khớp bộ lọc"
            description="Thử xóa tìm kiếm hoặc nới lỏng bộ lọc."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {canExport && (
                      <th className="px-4 py-3 w-12">
                        <button type="button" onClick={toggleSelectAll} className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                          {allSelected ? (
                            <CheckSquare size={18} className="text-primary" />
                          ) : someSelected ? (
                            <MinusSquare size={18} className="text-primary" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Mã đơn</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Ngày</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Người gửi</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Người nhận</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Khách hàng</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight text-right">Số tiền</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Trạng thái HĐ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const isSelected = selectedIds.has(row.id);
                    const exported = !!row.invoice_exported;
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-border/80 transition-colors cursor-pointer ${
                          isSelected ? 'bg-primary/5' : 'hover:bg-muted/20'
                        }`}
                        onClick={() => canExport && toggleSelect(row.id)}
                      >
                        {canExport && (
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelect(row.id);
                              }}
                              className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                            >
                              {isSelected ? (
                                <CheckSquare size={18} className="text-primary" />
                              ) : (
                                <Square size={18} />
                              )}
                            </button>
                          </td>
                        )}
                        <td className="px-4 py-3 text-[13px] font-bold tabular-nums">{row.order_code}</td>
                        <td className="px-4 py-3 text-[13px] text-muted-foreground whitespace-nowrap">
                          {row.order_date}
                          {row.order_time ? <span className="ml-1 text-[11px]">{row.order_time}</span> : null}
                        </td>
                        <td className="px-4 py-3 text-[13px] max-w-[160px] truncate" title={row.sender_customers?.name || row.sender_name || ''}>
                          {row.sender_customers?.name || row.sender_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-[13px] max-w-[160px] truncate" title={row.receiver_name || ''}>
                          {row.receiver_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-[13px] max-w-[160px] truncate">
                          {row.customers?.name || '—'}
                          {row.customers?.phone ? (
                            <span className="block text-[11px] text-muted-foreground">{row.customers.phone}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-bold text-primary text-right tabular-nums">
                          {formatCurrency(row.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-[13px]">
                          {exported ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 size={14} />
                              Đã xuất HĐ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                              <Circle size={14} />
                              Chưa xuất
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3 p-3">
              {filteredRows.map((row) => {
                const isSelected = selectedIds.has(row.id);
                const exported = !!row.invoice_exported;
                return (
                  <div
                    key={row.id}
                    className={`rounded-xl border bg-card p-4 shadow-sm space-y-2 transition-all ${
                      isSelected ? 'border-primary/40 bg-primary/5' : 'border-border'
                    }`}
                    onClick={() => canExport && toggleSelect(row.id)}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        {canExport && (
                          isSelected ? (
                            <CheckSquare size={18} className="text-primary shrink-0" />
                          ) : (
                            <Square size={18} className="text-muted-foreground shrink-0" />
                          )
                        )}
                        <span className="text-[13px] font-bold">{row.order_code}</span>
                      </div>
                      <span className="text-[12px] font-bold text-primary tabular-nums">
                        {formatCurrency(row.total_amount)}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      {row.order_date} {row.order_time}
                    </p>
                    <p className="text-[12px]">
                      <span className="text-muted-foreground">Người gửi: </span>
                      {row.sender_customers?.name || row.sender_name || '—'}
                    </p>
                    <p className="text-[12px]">
                      <span className="text-muted-foreground">Người nhận: </span>
                      {row.receiver_name || '—'}
                    </p>
                    {row.customers?.name && (
                      <p className="text-[12px]">
                        <span className="text-muted-foreground">KH: </span>
                        {row.customers.name}
                      </p>
                    )}
                    <div className="text-[12px]">
                      {exported ? (
                        <span className="text-emerald-700 font-semibold">✓ Đã xuất hóa đơn</span>
                      ) : (
                        <span className="text-slate-500 font-medium">○ Chưa xuất hóa đơn</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile bulk action */}
            {selectedCount > 0 && canExport && (
              <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 shadow-lg z-50 flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-300">
                <span className="text-[13px] font-bold text-primary flex-1">
                  {selectedCount} đơn đã chọn
                </span>
                {selectedNotExported > 0 && (
                  <button
                    type="button"
                    disabled={bulkExportMut.isPending}
                    onClick={() => handleBulkExport(true)}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold"
                  >
                    Xuất HĐ ({selectedNotExported})
                  </button>
                )}
                {selectedExported > 0 && (
                  <button
                    type="button"
                    disabled={bulkExportMut.isPending}
                    onClick={() => handleBulkExport(false)}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[13px] font-bold"
                  >
                    Hủy ({selectedExported})
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile filter sheet */}
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
          setInvoiceStatus('all');
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
          <label className="text-[13px] font-bold text-muted-foreground">Trạng thái hóa đơn</label>
          <select
            value={invoiceStatus}
            onChange={(e) => setInvoiceStatus(e.target.value as InvoiceStatusFilter)}
            className="w-full h-[42px] text-[13px] font-medium bg-muted/10 border border-border/80 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
          >
            {INVOICE_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </MobileFilterSheet>
    </div>
  );
};

export default InvoiceOrdersPage;
