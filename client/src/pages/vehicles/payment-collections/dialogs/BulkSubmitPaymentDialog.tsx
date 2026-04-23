import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, ChevronRight, Tag, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployees } from '../../../../hooks/queries/useHR';
import { SearchableSelect } from '../../../../components/ui/SearchableSelect';
import type { PaymentCollection } from '../../../../types';
import paymentCollectionsApi from '../../../../api/paymentCollectionsApi';
import { paymentCollectionKeys } from '../../../../hooks/queries/usePaymentCollections';
import { formatCurrency } from '../../../../utils/formatters';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  payments: PaymentCollection[];
}

const BulkSubmitPaymentDialog: React.FC<Props> = ({ isOpen, onClose, payments }) => {
  const queryClient = useQueryClient();
  const { data: employees } = useEmployees(isOpen);

  const staffOptions = useMemo(() => {
    if (!employees) return [];
    return employees
      .filter((e) => e.is_active !== false)
      .filter((e) => e.role !== 'driver' && e.role !== 'customer')
      .map((e) => ({
        id: e.id,
        name: e.full_name,
        type: e.role,
      }));
  }, [employees]);

  const [receiverId, setReceiverId] = useState('');
  const [submittedAt, setSubmittedAt] = useState(() => new Date().toISOString().substring(0, 16));
  const [notes, setNotes] = useState('');
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (isOpen && payments.length > 0) {
      const firstNote = payments.find((p) => p.notes)?.notes;
      setNotes(firstNote || '');
      setSubmittedAt(new Date().toISOString().substring(0, 16));
      setReceiverId('');
    }
  }, [isOpen, payments]);

  if (!isOpen || payments.length === 0) return null;

  const totalAmount = payments.reduce((s, p) => s + (p.collectedAmount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId) {
      toast.error('Vui lòng chọn người nhận');
      return;
    }

    const receiver = staffOptions.find((r) => r.id === receiverId);
    const payload = {
      receiverId,
      receiverType: (receiver?.type === 'manager' ? 'manager' : 'staff') as 'manager' | 'staff',
      submittedAt: new Date(submittedAt).toISOString(),
      notes,
    };

    setIsPending(true);
    const failed: string[] = [];
    let ok = 0;

    for (const p of payments) {
      try {
        await paymentCollectionsApi.submit(p.id, payload);
        ok++;
      } catch {
        failed.push(p.deliveryOrderCode || p.id);
      }
    }

    setIsPending(false);
    await queryClient.invalidateQueries({ queryKey: paymentCollectionKeys.all });

    if (failed.length === 0) {
      toast.success(`Đã nộp thành công ${ok} phiếu`);
      onClose();
    } else {
      toast.error(
        `Nộp được ${ok}/${payments.length} phiếu. Lỗi: ${failed.slice(0, 5).join(', ')}${failed.length > 5 ? '…' : ''}`,
        { duration: 6000 }
      );
      if (ok > 0) onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300" onClick={!isPending ? onClose : undefined} />

      <div className="relative w-full max-w-[520px] bg-background shadow-2xl flex flex-col h-screen border-l border-border dialog-slide-in">
        <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Upload size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">Nộp tiền hàng loạt</h2>
              <p className="text-[11px] text-muted-foreground font-medium">{payments.length} phiếu • {formatCurrency(totalAmount)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors shrink-0 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form id="bulk-submit-payment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Tag size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Phiếu được chọn</span>
            </div>
            <ul className="max-h-[180px] overflow-y-auto divide-y divide-border text-[13px]">
              {payments.map((p) => (
                <li key={p.id} className="px-4 py-2.5 flex justify-between gap-2">
                  <span className="font-semibold text-foreground truncate">{p.deliveryOrderCode}</span>
                  <span className="text-slate-600 tabular-nums shrink-0">{formatCurrency(p.collectedAmount)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
            <p className="text-[13px] text-yellow-800 font-medium">
              Cùng một người nhận, thời gian nộp và ghi chú sẽ áp dụng cho <b>tất cả</b> phiếu trên.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-foreground">Nộp cho ai? <span className="text-red-500">*</span></label>
            <SearchableSelect
              options={staffOptions.map((staff) => ({
                value: staff.id,
                label: `${staff.name} (${staff.type === 'manager' ? 'Quản lý' : 'Nhân viên'})`,
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
              onChange={(e) => setSubmittedAt(e.target.value)}
              className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-foreground">Ghi chú (tùy chọn)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none font-medium"
              placeholder="VD: Nộp gộp một lần"
            />
          </div>
        </form>

        <div className="bg-card border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-6 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-[13px] font-bold transition-all disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="bulk-submit-payment-form"
            disabled={isPending}
            className={clsx(
              'flex items-center gap-2 px-8 py-2 rounded-xl text-[13px] font-bold shadow-lg transition-all group',
              isPending ? 'bg-primary/50 text-white/60 cursor-wait' : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
            )}
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle size={18} />
            )}
            Xác nhận nộp {payments.length} phiếu
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BulkSubmitPaymentDialog;
