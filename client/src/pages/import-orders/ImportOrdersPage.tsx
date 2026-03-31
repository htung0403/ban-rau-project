import React, { useState } from 'react';
import { Plus, Search, X, ChevronLeft, ChevronRight, Edit, Trash2, Calendar, Truck, Package } from 'lucide-react';
import { clsx } from 'clsx';
import { useImportOrders, useDeleteImportOrder } from '../../hooks/queries/useImportOrders';
import type { ImportOrder, ImportOrderFilters, OrderStatus } from '../../types';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import AddEditImportOrderDialog from './dialogs/AddEditImportOrderDialog';
import CreateDeliveryDialog from './dialogs/CreateDeliveryDialog';

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  delivered: 'Đã giao',
  returned: 'Trả lại',
};

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const ImportOrdersPage: React.FC = () => {
  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | ''>('');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDialogClosing, setIsDialogClosing] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ImportOrder | null>(null);

  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [isDeliveryClosing, setIsDeliveryClosing] = useState(false);
  const [selectedForDelivery, setSelectedForDelivery] = useState<ImportOrder | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Build filters
  const filters: ImportOrderFilters = {};
  if (filterDate) filters.date = filterDate;
  if (filterStatus) filters.status = filterStatus;
  if (searchText.trim()) filters.sender = searchText.trim();

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

  const openDeliveryDialog = (order: ImportOrder) => {
    setSelectedForDelivery(order);
    setIsDeliveryOpen(true);
  };

  const closeDeliveryDialog = () => {
    setIsDeliveryClosing(true);
    setTimeout(() => {
      setIsDeliveryOpen(false);
      setIsDeliveryClosing(false);
      setSelectedForDelivery(null);
    }, 350);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const clearFilters = () => {
    setSearchText('');
    setFilterDate('');
    setFilterStatus('');
    setPage(1);
  };

  const hasActiveFilters = !!filterDate || !!filterStatus || !!searchText;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader
        title="Nhập hàng"
        description="Quản lý danh sách đơn nhập hàng"
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

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="p-3 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
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

          {/* Date filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={14} />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
              className="pl-9 pr-3 py-2 bg-muted/20 border border-border/80 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as OrderStatus | ''); setPage(1); }}
            className="px-3 py-2 bg-muted/20 border border-border/80 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-bold"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-dashed border-red-300 text-red-500 text-[12px] font-bold hover:bg-red-50 transition-all shrink-0"
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
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Người nhận</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left min-w-[150px]">Địa chỉ</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left w-32">SĐT</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center w-24">Hình ảnh</th>
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
                        <span className="text-[12px] font-medium text-muted-foreground line-clamp-1" title={order.customers?.address || order.receiver_address || ''}>
                          {order.customers?.address || order.receiver_address || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] font-medium text-foreground tabular-nums">{order.customers?.phone || order.receiver_phone || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {order.import_order_items && order.import_order_items.some(i => i.image_url) ? (
                          <div className="flex -space-x-2 overflow-hidden items-center justify-center group">
                            {order.import_order_items.filter(i => i.image_url).slice(0, 3).map((item, idx) => (
                              <img key={idx} src={item.image_url} alt="SP" className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover group-hover:-translate-y-1 transition-transform" />
                            ))}
                            {order.import_order_items.filter(i => i.image_url).length > 3 && (
                              <div className="flex bg-muted z-10 items-center justify-center h-8 w-8 rounded-full ring-2 ring-white text-[10px] font-bold text-muted-foreground">
                                +{order.import_order_items.filter(i => i.image_url).length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/50 mx-auto">
                            <Package size={14} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-medium text-foreground">{(order as any).profiles?.full_name || order.receiver_name || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={order.status} label={statusLabels[order.status]} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openDeliveryDialog(order); }}
                            className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors"
                            title="Giao hàng"
                          >
                            <Truck size={14} />
                          </button>
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
                        </div>
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
                      <span className="text-[13px] font-bold text-primary tabular-nums mr-2">
                        {formatCurrency(order.import_order_items?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || order.total_amount || 0)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); openDeliveryDialog(order); }}
                        className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors"
                      >
                        <Truck size={14} />
                      </button>
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
      />

      {/* Delivery Dialog */}
      <CreateDeliveryDialog
        isOpen={isDeliveryOpen}
        isClosing={isDeliveryClosing}
        importOrder={selectedForDelivery}
        onClose={closeDeliveryDialog}
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
    </div>
  );
};

export default ImportOrdersPage;
