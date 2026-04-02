import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, ChevronRight, Tag, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import { useEmployees } from '../../../../hooks/queries/useHR';
import { SearchableSelect } from '../../../../components/ui/SearchableSelect';
import type { PaymentCollection } from '../../../../types';
import { useSubmitPaymentCollection } from '../../../../hooks/queries/usePaymentCollections';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentCollection;
}

const SubmitPaymentDialog: React.FC<Props> = ({ isOpen, onClose, payment }) => {
  const { mutate: submitPayment, isPending } = useSubmitPaymentCollection();

  const { data: employees } = useEmployees();

  // Map staff/manager employees dynamically
  const staffOptions = useMemo(() => {
    if (!employees) return [];
    return employees
      .filter(e => e.role === 'staff' || e.role === 'manager')
      .map(e => ({
        id: e.id, 
        name: e.full_name, 
        type: e.role 
      }));
  }, [employees]);

  const [receiverId, setReceiverId] = useState('');
  const [submittedAt, setSubmittedAt] = useState(new Date().toISOString().substring(0,16));
  const [notes, setNotes] = useState(payment.notes || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId) return alert('Vui lòng chọn người nhận');

    const receiver = staffOptions.find(r => r.id === receiverId);
    submitPayment({
      id: payment.id,
      data: {
        receiverId,
        receiverType: receiver?.type as 'staff' | 'manager',
        submittedAt: new Date(submittedAt).toISOString(),
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
      <div className="relative w-full max-w-[500px] bg-[#f8fafc] shadow-2xl flex flex-col h-screen border-l border-slate-200 dialog-slide-in">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Upload size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              Nộp Tiền Về Kho
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

        <form id="submit-payment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Tag size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Thông tin nộp tiền</span>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                <p className="text-[13px] text-yellow-800 font-medium">Bạn đang nộp phiếu thu <b>{payment.deliveryOrderCode}</b> với số tiền <b>{payment.collectedAmount.toLocaleString()}đ</b>.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Nộp cho ai? <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={staffOptions.map(staff => ({
                    value: staff.id,
                    label: `${staff.name} (${staff.type === 'manager' ? 'Quản lý' : 'Nhân viên'})`
                  }))}
                  value={receiverId}
                  onValueChange={setReceiverId}
                  placeholder="-- Chọn nhân viên nhận tiền --"
                  searchPlaceholder="Tìm tên nhân viên..."
                  emptyMessage="Không có nhân sự phù hợp."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Thời gian nộp <span className="text-red-500">*</span></label>
                <input 
                  type="datetime-local" 
                  value={submittedAt} 
                  onChange={e => setSubmittedAt(e.target.value)} 
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
                  placeholder="VD: Nhờ thủ quỹ xác nhận"
                />
              </div>
            </div>
          </div>
        </form>

        <div className="bg-white border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-[13px] font-bold transition-all"
          >
            Hủy
          </button>
          <button 
            type="submit"
            form="submit-payment-form"
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
            Xác Nhận Nộp
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SubmitPaymentDialog;
