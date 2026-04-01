import React, { useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useExportOrders } from '../../hooks/queries/useExportOrders';
import { useUpdateCustomerPayment } from '../../hooks/queries/useCustomers';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Banknote, Calendar, Info, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import CurrencyInput from '../../components/shared/CurrencyInput';
import { format } from 'date-fns';

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, 'Số tiền thanh toán phải lớn hơn 0'),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const CustomerDebtPage: React.FC = () => {
  const { data: orders, isLoading, isError, refetch } = useExportOrders();
  const updatePayment = useUpdateCustomerPayment();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [isCollectClosing, setIsCollectClosing] = useState(false);
  const [currentCustomerDebt, setCurrentCustomerDebt] = useState<number>(0);

  // Lọc chỉ những đơn chưa thanh toán
  const unpaidOrders = (orders || []).filter(o => o.payment_status !== 'paid');

  // Nhóm theo ngày
  const groupedOrders = unpaidOrders.reduce((acc: Record<string, any[]>, order: any) => {
    const date = order.export_date || 'N/A';
    if (!acc[date]) acc[date] = [];
    acc[date].push(order);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a));

  const handleCollect = (customer: any) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomerName(customer.name);
    
    // Tính toán nợ thực tế từ các đơn hàng để đảm bảo khớp với bảng
    const realDebt = unpaidOrders
      .filter(o => o.customer_id === customer.id)
      .reduce((sum, o) => sum + ((o.debt_amount || 0) - (o.paid_amount || 0)), 0);
      
    setCurrentCustomerDebt(realDebt);
    setIsCollectOpen(true);
  };

  const closeCollectDialog = () => {
    setIsCollectClosing(true);
    setTimeout(() => {
      setIsCollectOpen(false);
      setIsCollectClosing(false);
      setSelectedCustomerId(null);
    }, 350);
  };

  const { handleSubmit, control, reset, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: { amount: 0, notes: '' },
  });

  const onSubmitPayment = async (data: PaymentFormData) => {
    if (!selectedCustomerId) return;
    try {
      await updatePayment.mutateAsync({
        id: selectedCustomerId,
        payload: { amount: data.amount, notes: data.notes }
      });
      reset();
      closeCollectDialog();
    } catch (e) {
      // toast in hook
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <PageHeader
          title="Chi tiết Công nợ"
          description="Theo dõi danh sách các đơn hàng chưa thanh toán"
          backPath="/ke-toan"
        />

        {/* Quick summary if any */}
        <div className="flex items-center gap-4 bg-white p-2 px-4 rounded-2xl border border-border shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Tổng nợ chưa thu</span>
            <span className="text-[16px] font-black text-red-600 tabular-nums">
              {formatCurrency(unpaidOrders.reduce((sum, o) => sum + ((o.debt_amount || 0) - (o.paid_amount || 0)), 0))}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={10} columns={6} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : unpaidOrders.length === 0 ? (
          <EmptyState title="Không có công nợ tồn đọng" description="Tất cả các đơn hàng đã được thanh toán đầy đủ." />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-50/80 backdrop-blur-md border-b border-border">
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-left min-w-[120px] border-b border-border">Mã đơn</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-left border-b border-border">Khách hàng</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-left min-w-[200px] border-b border-border">Nội dung hàng</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-right border-b border-border">Giá trị nợ</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-right border-b border-border">Đang nợ</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-center border-b border-border w-48">Trạng thái thanh toán</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-center border-b border-border">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedDates.map((date) => (
                  <React.Fragment key={date}>
                    {/* Date group separator */}
                    <tr className="bg-slate-50/50">
                      <td colSpan={7} className="px-4 py-2 border-y border-slate-100/10">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center text-red-600">
                            <Calendar size={13} />
                          </div>
                          <span className="text-[12px] font-black text-slate-700 uppercase tracking-wider">
                            Ngày xuất: {format(new Date(date), 'dd/MM/yyyy')}
                          </span>
                          <div className="h-[1px] flex-1 bg-slate-100 ml-2" />
                        </div>
                      </td>
                    </tr>

                    {groupedOrders[date].map((order) => {
                      const remaining = (order.debt_amount || 0) - (order.paid_amount || 0);
                      return (
                        <tr key={order.id} className="hover:bg-muted/10 transition-colors group">
                          <td className="px-4 py-3 align-top">
                            <span className="text-[13px] font-bold text-primary tabular-nums">#{order.id.slice(0, 8).toUpperCase()}</span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-foreground line-clamp-1">{order.customers?.name || 'Vãng lai'}</span>
                              {order.customers?.phone && <span className="text-[11px] text-muted-foreground">{order.customers.phone}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top max-w-[250px]">
                            <span className="text-[13px] font-medium text-slate-600 line-clamp-1">{order.item_name}</span>
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <span className="text-[13px] font-medium text-slate-500 tabular-nums">{formatCurrency(order.debt_amount)}</span>
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <span className="text-[14px] font-black text-red-600 tabular-nums">{formatCurrency(remaining)}</span>
                          </td>
                          <td className="px-4 py-3 text-center align-top">
                            <div className={clsx(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              order.payment_status === 'partial' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                            )}>
                              {order.payment_status === 'partial' ? 'Mới trả 1 phần' : 'Chưa trả'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center align-top">
                            <button
                              onClick={() => handleCollect(order.customers)}
                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-lg transition-all shadow-sm active:scale-95"
                            >
                              Thu tiền
                            </button>
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

      {isCollectOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end">
          <div
            className={clsx(
              'fixed inset-0 bg-black/40 backdrop-blur-md transition-all duration-350 ease-out',
              isCollectClosing ? 'opacity-0' : 'animate-in fade-in duration-300',
            )}
            onClick={closeCollectDialog}
          />
          <div
            className={clsx(
              'relative w-full max-w-[400px] bg-[#f8fafc] shadow-2xl flex flex-col h-screen border-l border-border',
              isCollectClosing ? 'dialog-slide-out' : 'dialog-slide-in',
            )}
          >
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Banknote size={20} />
                </div>
                <h2 className="text-lg font-bold text-foreground">Thu tiền nợ</h2>
              </div>
              <button onClick={closeCollectDialog} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form id="pay-form" onSubmit={handleSubmit(onSubmitPayment)} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-5">
                <div>
                  <label className="text-[11px] font-black text-muted-foreground uppercase opacity-60 tracking-wider">Khách hàng</label>
                  <p className="text-[16px] font-black mt-1 text-foreground">{selectedCustomerName}</p>
                </div>

                <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
                  <Info size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <label className="text-[11px] font-bold text-red-600/70 uppercase tracking-wider">Tổng công nợ hiện tại</label>
                    <p className="text-[24px] font-black text-red-600 leading-tight tabular-nums">{formatCurrency(currentCustomerDebt)}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[13px] font-bold text-foreground flex items-center justify-between">
                    Số tiền khách thanh toán
                    <span className="text-red-500 text-[10px] uppercase">* Bắt buộc</span>
                  </label>
                  <Controller
                    name="amount"
                    control={control}
                    render={({ field }) => (
                      <CurrencyInput
                        {...field}
                        value={field.value as number | undefined}
                        onChange={field.onChange}
                        className="w-full px-4 py-4 bg-slate-50 border-2 border-border rounded-xl text-[20px] font-black focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all text-emerald-600 tabular-nums"
                      />
                    )}
                  />
                  {errors.amount && <p className="text-red-500 text-[11px] font-bold mt-1 px-1">{errors.amount.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-foreground">Ghi chú (nếu có)</label>
                  <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={3}
                        placeholder="Nhập ghi chú thanh toán..."
                        className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-[14px] focus:outline-none focus:border-primary/50 transition-all resize-none"
                      />
                    )}
                  />
                </div>
              </div>
            </form>

            <div className="bg-white border-t border-border px-6 py-4 flex items-center justify-between shrink-0 gap-3">
              <button
                type="button"
                onClick={closeCollectDialog}
                className="flex-1 py-3 rounded-xl border border-border text-[13px] font-bold hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="pay-form"
                disabled={updatePayment.isPending}
                className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:grayscale"
              >
                {updatePayment.isPending ? 'Đang xử lý...' : 'Xác nhận thu tiền'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomerDebtPage;
