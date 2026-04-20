import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Warehouse, MapPin, Users, Plus, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateWarehouse } from '../../../hooks/queries/useWarehouses';
import { useEmployees } from '../../../hooks/queries/useHR';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';

const warehouseSchema = z.object({
  name: z.string().min(2, 'Tên kho phải từ 2 ký tự'),
  address: z.string().optional(),
  capacity: z.coerce.number().optional(),
  manager_id: z.string().optional(),
});

type WarehouseFormData = z.infer<typeof warehouseSchema>;

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
}

const AddEditWarehouseDialog: React.FC<Props> = ({ isOpen, isClosing, onClose }) => {
  const createMutation = useCreateWarehouse();
  const { data: employees } = useEmployees();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema) as any,
    defaultValues: {
      name: '',
      address: '',
      capacity: 0,
      manager_id: '',
    },
  });

  const managerId = watch('manager_id');

  useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        address: '',
        capacity: 0,
        manager_id: '',
      });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: WarehouseFormData) => {
    try {
      const payload = {
        name: data.name,
        address: data.address || undefined,
        capacity: data.capacity ? Number(data.capacity) : undefined,
        manager_id: data.manager_id || undefined,
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
          'relative w-full max-w-[600px] bg-background shadow-2xl flex flex-col h-screen border-l border-border',
          isClosing ? 'dialog-slide-out' : 'dialog-slide-in',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Warehouse size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">Thêm kho mới</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form id="warehouse-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* THÔNG TIN CHUNG */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Warehouse size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Thông tin chung</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[13px] font-bold text-foreground">Tên kho <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="VD: Kho tổng A"
                    className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  />
                  {errors.name && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.name.message}</p>}
                </div>
              </div>
              
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[13px] font-bold text-foreground">Địa chỉ</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
                  <input
                    type="text"
                    {...register('address')}
                    placeholder="VD: 123 Đường ABC..."
                    className="w-full pl-10 pr-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[13px] font-bold text-foreground">Sức chứa (Capacity)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    {...register('capacity')}
                    placeholder="VD: 1000"
                    className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* NHÂN SỰ VẬN HÀNH */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Nhân sự quản lý</span>
            </div>
            <div className="p-5 grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Quản lý kho</label>
                <SearchableSelect
                  options={(employees || []).filter(e => e.role === 'manager' || e.role === 'admin').map(e => ({ value: e.id, label: `${e.full_name} (${e.role})` }))}
                  value={managerId || ''}
                  onValueChange={(val) => setValue('manager_id', val, { shouldValidate: true })}
                  placeholder="Chọn quản lý (tùy chọn)..."
                />
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
            form="warehouse-form"
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

export default AddEditWarehouseDialog;
