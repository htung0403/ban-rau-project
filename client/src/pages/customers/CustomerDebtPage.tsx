import React, { useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useCustomers, useUpdateCustomerPayment } from '../../hooks/queries/useCustomers';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Banknote } from 'lucide-react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import CurrencyInput from '../../components/shared/CurrencyInput';

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, 'Số tiền thanh toán phải lớn hơn 0'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const CustomerDebtPage: React.FC = () => {
  const { data: customers, isLoading, isError, refetch } = useCustomers();
  const updatePayment = useUpdateCustomerPayment();
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [isCollectClosing, setIsCollectClosing] = useState(false);

  // Lọc chỉ những KH có nợ
  const debtors = customers?.filter(c => (c.debt || 0) > 0) || [];

  const handleCollect = (id: string) => {
    setSelectedCustomerId(id);
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
    defaultValues: { amount: 0 },
  });

  const onSubmitPayment = async (data: PaymentFormData) => {
    if (!selectedCustomerId) return;
    try {
      await updatePayment.mutateAsync({ id: selectedCustomerId, payload: { amount: data.amount } });
      reset();
      closeCollectDialog();
    } catch (e) {
      // toast in hook
    }
  };

  const selectedCustomer = debtors.find(c => c.id === selectedCustomerId);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader
        title="Công nợ khách hàng"
        description="Theo dõi và thu nợ khách hàng"
        backPath="/ke-toan"
      />
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col flex-1 min-h-0">
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={6} columns={4} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : debtors.length === 0 ? (
          <EmptyState title="Tất cả khách hàng đã thanh toán đủ" />
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Tên KH</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Tổng Đơn</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Công nợ hiện tại</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {debtors.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-[13px] font-bold text-foreground">{c.name}</span>
                        {c.phone && <p className="text-[11px] text-muted-foreground truncate">{c.phone}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-bold text-foreground text-right tabular-nums">{c.total_orders}</td>
                    <td className="px-4 py-3 text-[14px] font-bold text-red-600 text-right tabular-nums">{formatCurrency(c.debt)}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => handleCollect(c.id)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-bold rounded-lg transition-colors shadow-sm"
                      >
                        Thu tiền
                      </button>
                    </td>
                  </tr>
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
              <button onClick={closeCollectDialog} className="p-2 hover:bg-muted rounded-full">
                <X size={20} />
              </button>
            </div>
            <form id="pay-form" onSubmit={handleSubmit(onSubmitPayment)} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-4">
                <div>
                  <label className="text-[12px] font-bold text-muted-foreground uppercase">Khách hàng</label>
                  <p className="text-[15px] font-bold mt-1 text-foreground">{selectedCustomer?.name}</p>
                </div>
                <div>
                   <label className="text-[12px] font-bold text-muted-foreground uppercase">Công nợ hiện hành</label>
                   <p className="text-[20px] font-bold mt-1 text-red-600">{formatCurrency(selectedCustomer?.debt)}</p>
                </div>
                
                <div className="space-y-1.5 pt-4 border-t border-border">
                  <label className="text-[13px] font-bold text-foreground">Số tiền khách thanh toán <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Controller
                      name="amount"
                      control={control}
                      render={({ field }) => (
                        <CurrencyInput
                          {...field}
                          value={field.value as number | undefined}
                          onChange={field.onChange}
                          className="w-full px-4 py-3 bg-muted/10 border border-border rounded-xl text-[16px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-emerald-600"
                        />
                      )}
                    />
                  </div>
                  {errors.amount && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.amount.message as string}</p>}
                </div>
              </div>
            </form>
            <div className="bg-white border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
              <button type="button" onClick={closeCollectDialog} className="px-6 py-2 rounded-xl border border-border">Hủy</button>
              <button 
                type="submit" form="pay-form" disabled={updatePayment.isPending}
                className="flex items-center gap-2 px-8 py-2 rounded-xl text-[13px] font-bold shadow-lg transition-all group bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {updatePayment.isPending ? 'Đang xử lý...' : 'Xác nhận thu'}
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
