import React, { useState } from 'react';
import { Plus, Search, X, ChevronLeft, ChevronRight, Edit, Trash2, Filter } from 'lucide-react';
import { clsx } from 'clsx';
import { useImportOrders, useDeleteImportOrder } from '../../hooks/queries/useImportOrders';
import type { ImportOrder, ImportOrderFilters, OrderStatus } from '../../types';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { DateRangePicker } from '../../components/shared/DateRangePicker';
import { CustomSelect } from '../../components/shared/CustomSelect';
import AddEditImportOrderDialog from './dialogs/AddEditImportOrderDialog';
import MobileFilterSheet from '../../components/shared/MobileFilterSheet';
import DraggableFAB from '../../components/shared/DraggableFAB';

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  delivered: 'Đã giao',
  returned: 'Trả lại',
};

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  ...Object.entries(statusLabels).map(([key, label]) => ({ value: key, label }))
];

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const VegetableImportsPage: React.FC = () => {
  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | ''>('');
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDialogClosing, setIsDialogClosing] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ImportOrder | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Build filters
  const filters: ImportOrderFilters = {};
  if (filterDateFrom) filters.dateFrom = filterDateFrom;
  if (filterDateTo) filters.dateTo = filterDateTo;
  if (filterStatus) filters.status = filterStatus;
  if (searchText.trim()) filters.sender = searchText.trim();
  filters.order_category = 'vegetable';

  const { data: orders, isLoading, isError, refetch } = useImportOrders(filters);
  const deleteMutation = useDeleteImportOrder();

  // Local search filtering (supplementary to API filters)
  const filteredOrders = (orders || []).filter((o) => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      o.order_code?.toLowerCase().includes(q) ||
      o.customers?.name?.toLowerCase().includes(q) ||
      (o as any).profiles?.full_name?.toLowerCase().includes(q) ||
      o.receiver_phone?.includes(q)
    );
  });

  // Pagination
  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  const openAddDialog = () => {
    setEditingOrder(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (order: ImportOrder) => {
    setEditingOrder(order);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogClosing(true);
    setTimeout(() => {
      setIsDialogOpen(false);
      setIsDialogClosing(false);
      setEditingOrder(null);
    }, 350);
  };

  const openFilter = () => {
    setIsFilterOpen(true);
  };

  const closeFilter = () => {
    setIsFilterClosing(true);
    setTimeout(() => {
      setIsFilterOpen(false);
      setIsFilterClosing(false);
    }, 300);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const clearFilters = () => {
    setSearchText('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterStatus('');
    setPage(1);
  };

  const hasActiveFilters = !!filterDateFrom || !!filterDateTo || !!filterStatus || !!searchText;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="hidden md:block">
        <PageHeader
          title="Nhập hàng rau"
          description="Quản lý danh sách đơn nhập hàng rau"
          backPath="/hang-hoa"
          actions={
            <button
              onClick={openAddDialog}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Thêm đơn nhập</span>
              <span className="sm:hidden">Thêm</span>
            </button>
          }
        />
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="p-3 border-b border-border flex flex-col md:flex-row items-stretch md:items-center gap-2">
          {/* Search and Mobile Filter Toggle */}
          <div className="flex w-full md:flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <input
                type="text"
                placeholder="Tìm kiếm theo mã đơn, người gửi, người nhận..."
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-8 py-2 bg-muted/20 border border-border/80 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
              />
              {searchText && (
                <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
            
            <button
               onClick={openFilter}
               className={clsx(
                 "md:hidden flex items-center justify-center w-[38px] shrink-0 border border-border/80 rounded-xl transition-all",
                 (filterDateFrom || filterDateTo || filterStatus) ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/20 text-muted-foreground hover:bg-muted"
               )}
            >
               <Filter size={18} />
            </button>
          </div>

          {/* Date filter - Desktop */}
          <div className="hidden md:block relative z-20">
            <DateRangePicker
              initialDateFrom={filterDateFrom || undefined}
              initialDateTo={filterDateTo || undefined}
              onUpdate={({ range }) => {
                // Adjust for timezone differences before formatting back to YYYY-MM-DD
                const format = (d: Date) => {
                  const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
                  return local.toISOString().split('T')[0];
                };
                setFilterDateFrom(range.from ? format(range.from) : '');
                setFilterDateTo(range.to ? format(range.to) : '');
                setPage(1);
              }}
            />
          </div>

          {/* Status filter - Desktop */}
          <div className="hidden md:block z-20">
            <CustomSelect
              value={filterStatus}
              onChange={(val) => { setFilterStatus(val as OrderStatus | ''); setPage(1); }}
              options={statusOptions}
              className="w-full md:w-[160px]"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="hidden md:flex items-center gap-1 px-3 py-2 rounded-xl border border-dashed border-red-300 text-red-500 text-[12px] font-bold hover:bg-red-50 transition-all shrink-0"
            >
              <X size={14} />
              Xóa lọc
            </button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-4">
            <LoadingSkeleton rows={8} columns={8} />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title="Chưa có đơn nhập hàng"
            description="Bắt đầu bằng cách thêm đơn nhập hàng mới."
            action={
              <button
                onClick={openAddDialog}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
              >
                <Plus size={16} />
                Thêm đơn nhập
              </button>
            }
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block flex-1 overflow-auto custom-scrollbar">
              <table className="w-full border-collapse min-w-[900px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left w-34">Mã đơn</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left w-28">Ngày</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left w-20">Giờ</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left min-w-[100px]">Chủ hàng</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left w-36">Biển số xe / Tài xế</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left w-24">Số tờ</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right w-24">Tình trạng</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right w-36">Tổng tiền</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Nhân viên nhận</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center w-28">Trạng thái</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedOrders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => openEditDialog(order)}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-bold text-primary">{order.order_code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-muted-foreground font-medium tabular-nums">{order.order_date}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-muted-foreground font-medium tabular-nums">{order.order_time || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-bold text-foreground">{order.customers?.name || order.sender_name || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] font-medium text-foreground tabular-nums">
                          {order.license_plate ? <span className="font-bold text-amber-700 block">{order.license_plate}</span> : '-'}
                          {order.driver_name ? <span className="text-muted-foreground block">{order.driver_name}</span> : null}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-bold text-muted-foreground">{order.sheet_number || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {order.payment_status === 'paid' ? (
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Đã trả</span>
                        ) : order.payment_status === 'partial' ? (
                          <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">1 phần</span>
                        ) : (
                          <span className="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md">Chưa trả</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-black text-primary tabular-nums">
                        {formatCurrency(order.total_order_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-medium text-foreground">{(order as any).profiles?.full_name || order.receiver_name || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={order.status} label={statusLabels[order.status]} />
                      </td>
                      <td className="px-4 py-3 flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditDialog(order); }}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title="Sửa"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(order.id); }}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {paginatedOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => openEditDialog(order)}
                  className="bg-white rounded-2xl border border-border shadow-sm p-4 cursor-pointer hover:shadow-md active:bg-muted/10 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-[14px] font-bold text-primary">{order.order_code}</span>
                      <span className="text-[11px] text-muted-foreground ml-2 tabular-nums">{order.order_date}</span>
                    </div>
                    <StatusBadge status={order.status} label={statusLabels[order.status]} />
                  </div>
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase w-14 shrink-0">Khách</span>
                      <span className="text-[13px] font-bold text-foreground">{order.customers?.name || order.sender_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase w-14 shrink-0">NV</span>
                      <span className="text-[13px] font-medium text-foreground">{(order as any).profiles?.full_name || order.receiver_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="text-[12px] text-muted-foreground">
                      <span className="font-bold">{order.import_order_items?.length || 1}</span> mặt hàng
                    </div>
                    <div className="flex items-center gap-1">
                      {order.payment_status === 'paid' ? (
                        <span className="text-[10px] font-bold text-emerald-600 mr-2 bg-emerald-50 px-1.5 py-0.5 rounded">Đã trả</span>
                      ) : order.payment_status === 'partial' ? (
                        <span className="text-[10px] font-bold text-amber-600 mr-2 bg-amber-50 px-1.5 py-0.5 rounded">1 phần</span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-500 mr-2 bg-red-50 px-1.5 py-0.5 rounded">Chưa trả</span>
                      )}
                      <span className="text-[14px] font-black text-primary tabular-nums mr-2">
                        {formatCurrency(order.total_order_amount)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditDialog(order); }}
                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(order.id); }}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/5 shrink-0">
              <span className="text-[12px] text-muted-foreground font-medium">
                {totalItems > 0 ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalItems)}` : '0'} / Tổng {totalItems}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-20 transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={clsx(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-colors',
                        page === pageNum ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-20 transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <AddEditImportOrderDialog
        isOpen={isDialogOpen}
        isClosing={isDialogClosing}
        editingOrder={editingOrder}
        onClose={closeDialog}
        defaultCategory="vegetable"
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Xóa đơn nhập hàng"
        message="Bạn có chắc chắn muốn xóa đơn nhập hàng này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Mobile Floating Action Button */}
      <DraggableFAB 
        icon={<Plus size={24} />} 
        onClick={openAddDialog} 
      />

      {/* Mobile Filter Bottom Sheet */}
      <MobileFilterSheet
        isOpen={isFilterOpen}
        isClosing={isFilterClosing}
        onClose={closeFilter}
        onApply={(filters) => {
          setFilterDateFrom(filters.dateFrom);
          setFilterDateTo(filters.dateTo);
          setFilterStatus(filters.status);
          setPage(1);
        }}
        initialDateFrom={filterDateFrom}
        initialDateTo={filterDateTo}
        initialStatus={filterStatus}
        statusOptions={statusOptions}
      />
    </div>
  );
};

export default VegetableImportsPage;
