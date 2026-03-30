import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Plus, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateLeaveRequest } from '../../../hooks/queries/useHR';
import { useAuth } from '../../../context/AuthContext';
import { format } from 'date-fns';

const leaveRequestSchema = z.object({
  from_date: z.string().min(1, 'Vui lòng chọn ngày bắt đầu'),
  to_date: z.string().min(1, 'Vui lòng chọn ngày kết thúc'),
  reason: z.string().min(5, 'Lý do tối thiểu 5 ký tự'),
});

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
}

const AddLeaveRequestDialog: React.FC<Props> = ({ isOpen, isClosing, onClose }) => {
  const { user } = useAuth();
  const createMutation = useCreateLeaveRequest();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      from_date: format(new Date(), 'yyyy-MM-dd'),
      to_date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const onSubmit = async (data: LeaveRequestFormData) => {
    try {
      if (!user) return;
      await createMutation.mutateAsync(data);
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  if (!isOpen && !isClosing) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div
        className={clsx(
          'fixed inset-0 bg-black/40 backdrop-blur-md transition-all duration-350 ease-out',
          isClosing ? 'opacity-0' : 'animate-in fade-in duration-300',
        )}
        onClick={onClose}
      />

      <div
        className={clsx(
          'relative w-full max-w-[500px] bg-[#f8fafc] shadow-2xl flex flex-col h-screen border-l border-border',
          isClosing ? 'dialog-slide-out' : 'dialog-slide-in',
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Calendar size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">Xin nghỉ phép</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-foreground">Ngày bắt đầu <span className="text-red-500">*</span></label>
            <input
              type="date"
              {...register('from_date')}
              className="w-full px-4 py-3 bg-white border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
            />
            {errors.from_date && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.from_date.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-foreground">Ngày kết thúc <span className="text-red-500">*</span></label>
            <input
              type="date"
              {...register('to_date')}
              className="w-full px-4 py-3 bg-white border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
            />
            {errors.to_date && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.to_date.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-foreground">Lý do <span className="text-red-500">*</span></label>
            <textarea
              rows={4}
              placeholder="Vui lòng nhập lý do nghỉ phép"
              {...register('reason')}
              className="w-full px-4 py-3 bg-white border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium resize-none"
            />
            {errors.reason && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.reason.message}</p>}
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
            onClick={handleSubmit(onSubmit)}
            disabled={createMutation.isPending}
            className={clsx(
              'flex items-center gap-2 px-8 py-2 rounded-xl text-[13px] font-bold shadow-lg transition-all group',
              createMutation.isPending
                ? 'bg-primary/50 text-white/60 cursor-wait'
                : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20',
            )}
          >
            {createMutation.isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Plus size={18} />
                Gửi đơn
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AddLeaveRequestDialog;
