import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, ChevronRight, Tag } from 'lucide-react';
import { clsx } from 'clsx';
import type { PaymentCollection } from '../../../../types';
import { useConfirmPaymentCollection } from '../../../../hooks/queries/usePaymentCollections';
import { formatCurrency } from '../../../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentCollection;
}

const ConfirmReceptionDialog: React.FC<Props> = ({ isOpen, onClose, payment }) => {
  const { mutate: confirmPayment, isPending } = useConfirmPaymentCollection();
  
  const [confirmedAt, setConfirmedAt] = useState(new Date().toISOString().substring(0,16));
  const [notes, setNotes] = useState(payment.notes || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confirmPayment({
      id: payment.id,
      data: {
        confirmedAt: new Date(confirmedAt).toISOString(),
        notes
      }
    }, {
      onSuccess: onClose
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-[500px] bg-background shadow-2xl flex flex-col h-screen border-l border-border dialog-slide-in">
        <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <CheckCircle size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              Xác Nhận Nhận Tiền
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form id="confirm-reception-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Tag size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Thông tin xác nhận</span>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-[13px] text-green-800 space-y-1">
                <p>Xác nhận đã nhận đủ số tiền <b>{formatCurrency(payment.collectedAmount)}</b> từ tài xế <b>{payment.driverName}</b>.</p>
                <p>Việc xác nhận sẽ <b>trực tiếp trừ công nợ</b> của khách hàng {payment.customerName}.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Thời gian xác nhận <span className="text-red-500">*</span></label>
                <input 
                  type="datetime-local" 
                  value={confirmedAt} 
                  onChange={e => setConfirmedAt(e.target.value)} 
                  className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Ghi chú (tùy chọn)</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  rows={3}
                  className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none font-medium"
                  placeholder="Ghi chú thêm nếu cần..."
                />
              </div>
            </div>
          </div>
        </form>

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
            form="confirm-reception-form"
            disabled={isPending}
            className={clsx(
              "flex items-center gap-2 px-8 py-2 rounded-xl text-[13px] font-bold shadow-lg transition-all group",
              isPending 
                ? "bg-primary/50 text-white/60 cursor-wait" 
                : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
            )}
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle size={18} />
            )}
            Xác Nhận
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmReceptionDialog;
