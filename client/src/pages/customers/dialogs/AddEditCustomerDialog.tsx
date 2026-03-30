import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, Phone, MapPin, Plus, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateCustomer } from '../../../hooks/queries/useCustomers';

const customerSchema = z.object({
  name: z.string().min(2, 'Tên khách hàng phải từ 2 ký tự'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
}

const AddEditCustomerDialog: React.FC<Props> = ({ isOpen, isClosing, onClose }) => {
  const createMutation = useCreateCustomer();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      name: '',
      phone: '',
      address: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        phone: '',
        address: '',
      });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    try {
      const payload = {
        name: data.name,
        phone: data.phone || undefined,
        address: data.address || undefined,
      };
      await createMutation.mutateAsync(payload);
      onClose();
    } catch (error) {
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
          'relative w-full max-w-[500px] bg-[#f8fafc] shadow-2xl flex flex-col h-screen border-l border-border',
          isClosing ? 'dialog-slide-out' : 'dialog-slide-in',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Building2 size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">Thêm khách hàng</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form id="customer-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Building2 size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Thông tin liên hệ</span>
            </div>
            <div className="p-5 grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Tên Khách Hàng / Công ty <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="VD: Công ty TNHH ABC..."
                    className="w-full pl-10 pr-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  />
                  {errors.name && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.name.message}</p>}
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Số điện thoại</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
                  <input
                    type="text"
                    {...register('phone')}
                    placeholder="VD: 0901234567"
                    className="w-full pl-10 pr-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Địa chỉ</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
                  <input
                    type="text"
                    {...register('address')}
                    placeholder="VD: 12 Đường Cổ Loa..."
                    className="w-full pl-10 pr-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
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
            form="customer-form"
            disabled={createMutation.isPending}
            className={clsx(
              "flex items-center gap-2 px-8 py-2 rounded-xl text-[13px] font-bold shadow-lg transition-all group",
              createMutation.isPending 
                ? "bg-primary/50 text-white/60 cursor-wait" 
                : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
            )}
          >
            {createMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            Thêm mới
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddEditCustomerDialog;
