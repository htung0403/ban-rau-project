import React, { useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useExportOrders } from '../../hooks/queries/useExportOrders';
import { useImportOrders } from '../../hooks/queries/useImportOrders';
import { useCustomers, useUpdateCustomerPayment } from '../../hooks/queries/useCustomers';
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
  amount: z.coerce.number().min(0, 'Số tiền không hợp lệ'),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const CustomerDebtPage: React.FC = () => {
  const { data: exportOrders, isLoading: isExportLoading, isError: isExportError, refetch: refetchExport } = useExportOrders();
  const { data: importOrders, isLoading: isImportLoading, isError: isImportError, refetch: refetchImport } = useImportOrders();
  const { data: customers } = useCustomers();
  
  const updatePayment = useUpdateCustomerPayment();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [isCollectClosing, setIsCollectClosing] = useState(false);
  const [currentCustomerDebt, setCurrentCustomerDebt] = useState<number>(0);

  const isLoading = isExportLoading || isImportLoading;
  const isError = isExportError || isImportError;

  const refetch = () => { refetchExport(); refetchImport(); };

  // Lọc chỉ những đơn chưa thanh toán
  const unpaidExport = (exportOrders || []).filter(o => o.payment_status !== 'paid').map(o => ({ ...o, _type: 'export' }));
  const unpaidImport = (importOrders || []).filter(o => o.payment_status !== 'paid').map(o => ({ ...o, _type: 'import' }));

  const unpaidOrders = [...unpaidExport, ...unpaidImport];

  // Nhóm theo ngày
  const groupedOrders = unpaidOrders.reduce((acc: Record<string, any[]>, order: any) => {
    const date = order.export_date || order.order_date || 'N/A';
    if (!acc[date]) acc[date] = [];
    acc[date].push(order);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a));

  const totalUncollectedDebt = customers?.reduce((sum, c) => sum + (c.debt > 0 ? c.debt : 0), 0) || 0;

  const handleCollect = (customer: any) => {
    if (!customer || !customer.id) {
      alert("Không tìm thấy thông tin định danh hệ thống của khách hàng này.");
      return;
    }
    
    setSelectedCustomerId(customer.id);
    setSelectedCustomerName(customer.name);
    
    // Lấy công nợ thật từ DB thay vì tự tính
    const globalCustomerInfo = customers?.find(c => c.id === customer.id);
    setCurrentCustomerDebt(globalCustomerInfo?.debt || 0);
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
      refetch();
    } catch (e) {
      // toast in hook
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <PageHeader
          title="Chi tiết Sổ Cái Bù Trừ Nhập Xuất"
          description="Sổ chi tiết các hóa đơn chưa hoàn tất thanh toán của Xuất/Nhập hàng"
          backPath="/ke-toan"
        />

        <div className="flex items-center gap-4 bg-white p-2 px-4 rounded-2xl border border-border shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Khách vãng lai nợ</span>
            <span className="text-[16px] font-black text-red-600 tabular-nums">
              {formatCurrency(totalUncollectedDebt)}
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
          <EmptyState title="Không có công nợ tồn đọng" description="Tất cả các khoản dư nợ đã được cấn trừ hoặc thanh toán." />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-50/80 backdrop-blur-md border-b border-border">
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-left min-w-[80px] border-b border-border">Nguồn</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-left min-w-[120px] border-b border-border">Mã đơn</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-left border-b border-border">Khách hàng</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-left min-w-[200px] border-b border-border">Nội dung</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-right border-b border-border">Giá trị HĐ (chưa bù)</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-right border-b border-border">Tồn nợ (phải xử lý)</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-center border-b border-border w-32">Trạng thái</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight text-center border-b border-border w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedDates.map((date) => (
                  <React.Fragment key={date}>
                    <tr className="bg-slate-50/50">
                      <td colSpan={8} className="px-4 py-2 border-y border-slate-100/10">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center text-red-600">
                            <Calendar size={13} />
                          </div>
                          <span className="text-[12px] font-black text-slate-700 uppercase tracking-wider">
                            Ngày phát sinh: {date !== 'N/A' ? format(new Date(date), 'dd/MM/yyyy') : 'Chưa định dạng'}
                          </span>
                          <div className="h-[1px] flex-1 bg-slate-100 ml-2" />
                        </div>
                      </td>
                    </tr>

                    {groupedOrders[date].map((order) => {
                      const isExport = order._type === 'export';
                      const remaining = (order.debt_amount || 0) - (order.paid_amount || 0);
                      
                      const orderCode = isExport 
                        ? `#${order.id?.slice(0, 8).toUpperCase()}` 
                        : (order.order_code || `#${order.id?.slice(0, 8).toUpperCase()}`);
                      
                      const itemName = isExport ? (order.item_name || 'Xuất hàng') : 'Nhập hàng / Nhà cung cấp';

                      return (
                        <tr key={order.id} className="hover:bg-muted/10 transition-colors group">
                          <td className="px-4 py-3 align-top">
                            {isExport ? (
                               <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700">Xuất Hàng</span>
                            ) : (
                               <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-violet-100 text-violet-700">Nhập Hàng</span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="text-[13px] font-bold text-primary tabular-nums">{orderCode}</span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-foreground line-clamp-1">{order.customers?.name || 'Vãng lai'}</span>
                              {order.customers?.phone && <span className="text-[11px] text-muted-foreground">{order.customers.phone}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top max-w-[250px]">
                            <span className="text-[13px] font-medium text-slate-600 line-clamp-1">{itemName}</span>
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <span className="text-[13px] font-medium text-slate-500 tabular-nums">{formatCurrency(order.debt_amount)}</span>
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <span className={clsx(
                              "text-[14px] font-black tabular-nums whitespace-nowrap",
                              isExport ? "text-red-600" : "text-emerald-600"
                            )}>
                              {isExport ? '+' : '-'}{formatCurrency(remaining)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center align-top">
                            <div className={clsx(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              order.payment_status === 'partial' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                            )}>
                              {order.payment_status === 'partial' ? 'Dở dang' : 'Chưa thu/trả'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center align-top relative">
                            {order.customers ? (
                              <button
                                onClick={() => handleCollect(order.customers)}
                                className="px-3 py-1.5 w-full bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-lg transition-all shadow-sm active:scale-95 whitespace-nowrap"
                              >
                                Thu tiền/ Khớp
                              </button>
                            ) : null}
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
              'relative w-full max-w-[500px] bg-[#f8fafc] shadow-2xl flex flex-col h-screen border-l border-border',
              isCollectClosing ? 'dialog-slide-out' : 'dialog-slide-in',
            )}
          >
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Banknote size={20} />
                </div>
                <h2 className="text-lg font-bold text-foreground">Xử lý Nợ hệ thống</h2>
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

                <div className={clsx(
                    "p-4 rounded-xl border flex items-start gap-3",
                    currentCustomerDebt > 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"
                )}>
                  <Info size={16} className={clsx("mt-0.5 shrink-0", currentCustomerDebt > 0 ? "text-red-500" : "text-emerald-500")} />
                  <div>
                    <label className={clsx("text-[11px] font-bold uppercase tracking-wider", currentCustomerDebt > 0 ? "text-red-600/70" : "text-emerald-600/70")}>
                        {currentCustomerDebt > 0 ? "Khách đang nợ (cần thu)" : currentCustomerDebt === 0 ? "Tài khoản sạch (Nợ = 0)" : "Mình đang nợ khách (phải trả / đã bù trừ)"}
                    </label>
                    <p className={clsx("text-[24px] font-black leading-tight tabular-nums", currentCustomerDebt >= 0 ? "text-red-600" : "text-emerald-600")}>
                        {formatCurrency(Math.abs(currentCustomerDebt))}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[13px] font-bold text-foreground flex items-center justify-between">
                    Số tiền khách nộp thêm (VND)
                    <span className="text-red-500 text-[10px] uppercase">* Nhập 0 nếu chỉ cấn trừ</span>
                  </label>
                  <Controller
                    name="amount"
                    control={control}
                    render={({ field }) => (
                      <CurrencyInput
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
                        placeholder="Nội dung khoản thu..."
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
                {updatePayment.isPending ? 'Đang xử lý...' : 'Xử lý'}
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
