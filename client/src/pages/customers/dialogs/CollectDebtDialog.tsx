import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Banknote, Calendar, FileText, ChevronRight, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUpdateCustomerPayment } from '../../../hooks/queries/useCustomers';
import type { Customer } from '../../../types';

const debtPaymentSchema = z.object({
  amount: z.number().min(1, 'Vui lòng nhập số tiền'),
  payment_date: z.string().min(1, 'Vui lòng chọn ngày thanh toán'),
  notes: z.string().optional(),
});

type DebtPaymentFormData = z.infer<typeof debtPaymentSchema>;

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  customer: Customer;
  debtAmount?: number;
}

const CollectDebtDialog: React.FC<Props> = ({ isOpen, isClosing, onClose, customer, debtAmount }) => {
  const [formattedAmount, setFormattedAmount] = useState<string>('');
  const paymentMutation = useUpdateCustomerPayment();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DebtPaymentFormData>({
    resolver: zodResolver(debtPaymentSchema) as any,
    defaultValues: {
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setFormattedAmount('');
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: DebtPaymentFormData) => {
    try {
      await paymentMutation.mutateAsync({
        id: customer.id,
        payload: {
          amount: data.amount,
          payment_date: data.payment_date,
          notes: data.notes,
        },
      });
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  if (!isOpen && !isClosing) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/40 backdrop-blur-md transition-all duration-350 ease-out',
          isClosing ? 'opacity-0' : 'animate-in fade-in duration-300',
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={clsx(
          'relative w-full max-w-[500px] bg-background shadow-2xl flex flex-col h-screen border-l border-border',
          isClosing ? 'dialog-slide-out' : 'dialog-slide-in',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Banknote size={20} />
            </div>
            <div>
               <h2 className="text-lg font-bold text-foreground">Thu nợ khách hàng</h2>
               <p className="text-[12px] font-medium text-muted-foreground">{customer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form id="collect-debt-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Info Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
             <div className="flex flex-col gap-1 text-center">
                 <span className="text-[12px] font-bold text-emerald-700/70 uppercase tracking-widest">Dư Nợ Hiện Tại</span>
                 <span className="text-3xl font-black text-emerald-700 tabular-nums">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(debtAmount ?? customer.debt ?? 0)}
                 </span>
             </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mt-6">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Banknote size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Thông tin thu tiền</span>
            </div>
            <div className="p-5 grid grid-cols-1 gap-5">
              
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground flex justify-between">
                    <span>Số tiền thu <span className="text-red-500">*</span></span>
                    {formattedAmount && <span className="text-xs text-muted-foreground font-medium">VNĐ</span>}
                </label>
                <div className="relative">
                   <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
                   <input
                      type="text"
                      value={formattedAmount}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-3 bg-muted/5 border border-border rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-emerald-700 placeholder:text-muted-foreground/40"
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        if (!rawValue) {
                          setValue('amount', 0, { shouldValidate: true });
                          setFormattedAmount('');
                          return;
                        }
                        const numValue = parseInt(rawValue, 10);
                        setValue('amount', numValue, { shouldValidate: true });
                        setFormattedAmount(numValue.toLocaleString('vi-VN'));
                      }}
                   />
                   {errors.amount && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.amount.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Ngày thanh toán <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
                  <input
                    type="date"
                    {...register('payment_date')}
                    className="w-full pl-10 pr-4 py-2.5 bg-muted/5 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                  {errors.payment_date && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.payment_date.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Ghi chú thêm</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 text-muted-foreground/40" size={16} />
                  <textarea
                    {...register('notes')}
                    rows={3}
                    placeholder="Nhập lý do thu tiền, nội dung chuyển khoản..."
                    className="w-full pl-10 pr-4 py-2 bg-muted/5 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium resize-none"
                  />
                </div>
              </div>

            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-card border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-[13px] font-bold transition-all"
          >
            Hủy
          </button>
          <button 
            type="submit"
            form="collect-debt-form"
            disabled={paymentMutation.isPending}
            className={clsx(
              "flex items-center gap-2 px-8 py-2.5 rounded-xl text-[13px] font-bold shadow-lg transition-all group",
              paymentMutation.isPending 
                ? "bg-emerald-600/50 text-white/60 cursor-wait" 
                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
            )}
          >
            {paymentMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={18} />
            )}
            Xác nhận Thu
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CollectDebtDialog;
