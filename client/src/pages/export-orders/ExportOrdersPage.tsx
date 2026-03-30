import React, { useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useExportOrders } from '../../hooks/queries/useExportOrders';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import StatusBadge from '../../components/shared/StatusBadge';
import { Plus } from 'lucide-react';
import AddEditExportOrderDialog from './dialogs/AddEditExportOrderDialog';

const paymentLabels: Record<string, string> = {
  unpaid: 'Chưa thanh toán',
  partial: 'Thanh toán một phần',
  paid: 'Đã thanh toán',
};

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const ExportOrdersPage: React.FC = () => {
  const { data: orders, isLoading, isError, refetch } = useExportOrders();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddClosing, setIsAddClosing] = useState(false);

  const closeAddDialog = () => {
    setIsAddClosing(true);
    setTimeout(() => {
      setIsAddOpen(false);
      setIsAddClosing(false);
    }, 350);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader
        title="Xuất hàng"
        description="Quản lý phiếu xuất kho"
        backPath="/hang-hoa"
        actions={
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
          >
            <Plus size={16} />
            Thêm phiếu xuất
          </button>
        }
      />
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={6} columns={6} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !orders?.length ? (
          <EmptyState title="Chưa có phiếu xuất" description="Bắt đầu bằng cách thêm phiếu xuất kho mới." />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse min-w-[700px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Ngày</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Mặt hàng</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">SL</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Công nợ</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Đã trả</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center">Thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-[12px] text-muted-foreground tabular-nums">{o.export_date}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-foreground">{o.item_name}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-foreground text-right tabular-nums">{o.quantity}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-red-600 text-right tabular-nums">{formatCurrency(o.debt_amount)}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-emerald-600 text-right tabular-nums">{formatCurrency(o.paid_amount)}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={o.payment_status} label={paymentLabels[o.payment_status]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddEditExportOrderDialog
        isOpen={isAddOpen}
        isClosing={isAddClosing}
        onClose={closeAddDialog}
      />
    </div>
  );
};

export default ExportOrdersPage;
