import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Car, Info, User, Plus, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateVehicle, useUpdateVehicle } from '../../../hooks/queries/useVehicles';
import { useEmployees } from '../../../hooks/queries/useHR';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import type { Vehicle } from '../../../types';

const vehicleSchema = z.object({
  license_plate: z.string().min(5, 'Biển số phải từ 5 ký tự'),
  vehicle_type: z.string().optional(),
  driver_id: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface Props {
  vehicle?: Vehicle | null;
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
}

const AddEditVehicleDialog: React.FC<Props> = ({ vehicle, isOpen, isClosing, onClose }) => {
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const { data: employees } = useEmployees();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema) as any,
    defaultValues: {
      license_plate: '',
      vehicle_type: '',
      driver_id: '',
    },
  });

  const driverId = watch('driver_id');

  useEffect(() => {
    if (isOpen) {
      if (vehicle) {
        reset({
          license_plate: vehicle.license_plate,
          vehicle_type: vehicle.vehicle_type || '',
          driver_id: vehicle.driver_id || '',
        });
      } else {
        reset({
          license_plate: '',
          vehicle_type: '',
          driver_id: '',
        });
      }
    }
  }, [isOpen, vehicle, reset]);

  const onSubmit = async (data: VehicleFormData) => {
    try {
      const payload = {
        license_plate: data.license_plate,
        vehicle_type: data.vehicle_type || undefined,
        driver_id: data.driver_id || undefined,
      };
      if (vehicle) {
        await updateMutation.mutateAsync({ id: vehicle.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
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
              <Car size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">{vehicle ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form id="vehicle-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* THÔNG TIN CHUNG */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Info size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Thông tin chung</span>
            </div>
            <div className="p-5 grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Biển số xe <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('license_plate')}
                    placeholder="VD: 51H-123.45"
                    className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] uppercase focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-bold"
                  />
                  {errors.license_plate && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.license_plate.message}</p>}
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Loại xe</label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('vehicle_type')}
                    placeholder="VD: Xe tải 10 tấn, Container..."
                    className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TÀI XẾ */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <User size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Phân công tài xế</span>
            </div>
            <div className="p-5 grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Tài xế phụ trách</label>
                <SearchableSelect
                  options={(employees || []).filter(e => e.role === 'driver').map(e => ({ value: e.id, label: `${e.full_name} (${e.phone || 'Chưa cập nhật'})` }))}
                  value={driverId || ''}
                  onValueChange={(val) => setValue('driver_id', val, { shouldValidate: true })}
                  placeholder="Chọn tài xế (tùy chọn)..."
                />
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
            form="vehicle-form"
            disabled={createMutation.isPending || updateMutation.isPending}
            className={clsx(
              "flex items-center gap-2 px-8 py-2 rounded-xl text-[13px] font-bold shadow-lg transition-all group",
              (createMutation.isPending || updateMutation.isPending)
                ? "bg-primary/50 text-white/60 cursor-wait" 
                : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
            )}
          >
            {(createMutation.isPending || updateMutation.isPending) ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            {vehicle ? 'Lưu thay đổi' : 'Thêm mới'}
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddEditVehicleDialog;
