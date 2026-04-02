import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck, Package, User, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAssignVehicle } from '../../../hooks/queries/useDelivery';
import { useVehicles } from '../../../hooks/queries/useVehicles';
import { useEmployees } from '../../../hooks/queries/useHR';
import type { DeliveryOrder } from '../../../types';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import CurrencyInput from '../../../components/shared/CurrencyInput';

const schema = z.object({
  vehicle_id: z.string().min(1, 'Vui lòng chọn xe'),
  driver_id: z.string().min(1, 'Vui lòng chọn tài xế'),
  quantity: z.coerce.number().min(0.01, 'Số lượng phải lớn hơn 0'),
  expected_amount: z.coerce.number().min(0).optional().default(0),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  order: DeliveryOrder | null;
  initialVehicleId?: string | null;
  onClose: () => void;
}

const AssignVehicleDialog: React.FC<Props> = ({ isOpen, isClosing, order, initialVehicleId, onClose }) => {
  const { data: vehicles } = useVehicles(isOpen);
  const { data: employees } = useEmployees(isOpen);
  const assignMutation = useAssignVehicle();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      vehicle_id: '',
      driver_id: '',
      quantity: 0,
      expected_amount: 0,
    },
  });

  const watchVehicleId = watch('vehicle_id');
  const watchDriverId = watch('driver_id');
  const watchQuantity = watch('quantity');

  // Auto-fill driver when vehicle is selected
  useEffect(() => {
    if (watchVehicleId && vehicles) {
      const vehicle = vehicles.find(v => v.id === watchVehicleId);
      if (vehicle?.driver_id) {
        setValue('driver_id', vehicle.driver_id, { shouldValidate: true });
      }
    }
  }, [watchVehicleId, vehicles, setValue]);

  // Auto-calculate expected_amount based on assigned quantity and unit price
  useEffect(() => {
    if (watchQuantity && order?.unit_price) {
      setValue('expected_amount', watchQuantity * order.unit_price, { shouldValidate: true });
    } else if (watchQuantity === 0 || !watchQuantity) {
      setValue('expected_amount', 0, { shouldValidate: true });
    }
  }, [watchQuantity, order?.unit_price, setValue]);

  useEffect(() => {
    if (order) {
      const totalAssigned = (order.delivery_vehicles || []).reduce(
        (sum: number, dv: any) => sum + (dv.assigned_quantity || 0),
        0
      );
      const remaining = order.total_quantity - totalAssigned;

      reset({
        vehicle_id: initialVehicleId || '',
        driver_id: '',
        quantity: Math.max(0, remaining),
        expected_amount: Math.max(0, remaining) * (order.unit_price || 0),
      });
    }
  }, [order, initialVehicleId, reset]);

  if (!isOpen && !isClosing) return null;

  const onSubmit = async (data: any) => {
    if (!order) return;
    try {
      await assignMutation.mutateAsync({
        id: order.id,
        payload: data,
      });
      onClose();
    } catch (error) {
      // Error handled by mutation toast
    }
  };

  const isSubmitting = assignMutation.isPending;

  const totalAssigned = order ? (order.delivery_vehicles || []).reduce(
    (sum: number, dv: any) => sum + (dv.assigned_quantity || 0),
    0
  ) : 0;
  const remaining = order ? order.total_quantity - totalAssigned : 0;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/40 backdrop-blur-sm transition-all duration-350 ease-out',
          isClosing ? 'opacity-0' : 'animate-in fade-in duration-300',
        )}
        onClick={onClose}
      />

      {/* Dialog Container */}
      <div
        className={clsx(
          'relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-350',
          isClosing ? 'scale-95 opacity-0' : 'animate-in zoom-in-95 duration-300',
        )}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Phân xe cho đơn hàng</h2>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                {order?.product_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Order Info Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng cần giao</span>
                <span className="text-lg font-black text-slate-800 tabular-nums">
                  {order?.total_quantity.toLocaleString()}
                </span>
              </div>
              <div className="w-[1px] h-8 bg-slate-200" />
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Còn lại</span>
                <span className="text-lg font-black text-orange-600 tabular-nums">
                  {(remaining ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
            
            {order?.import_orders?.total_amount != null && (
               <div className="flex items-center justify-between pt-3 border-t border-slate-200/50">
                 <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tổng tiền đơn hàng</span>
                 <span className="text-[15px] font-black text-emerald-600 tabular-nums">
                   {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(order.import_orders.total_amount))}
                 </span>
               </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Vehicle Selection */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-foreground flex items-center gap-2">
                <Truck size={14} className="text-primary" />
                Chọn xe <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={(vehicles || []).map(v => ({ 
                  value: v.id, 
                  label: `${v.license_plate} ${v.profiles?.full_name ? `(${v.profiles.full_name})` : ''}` 
                }))}
                value={watchVehicleId}
                onValueChange={(val) => setValue('vehicle_id', val, { shouldValidate: true })}
                placeholder="Chọn biển số xe..."
              />
              {errors.vehicle_id && <p className="text-red-500 text-[11px] font-medium">{errors.vehicle_id.message as string}</p>}
            </div>

            {/* Driver Selection */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-foreground flex items-center gap-2">
                <User size={14} className="text-primary" />
                Tài xế phụ trách <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={(employees || []).filter(e => e.role === 'driver').map(e => ({ value: e.id, label: e.full_name }))}
                value={watchDriverId}
                onValueChange={(val) => setValue('driver_id', val, { shouldValidate: true })}
                placeholder="Chọn tài xế..."
              />
              {errors.driver_id && <p className="text-red-500 text-[11px] font-medium">{errors.driver_id.message as string}</p>}
            </div>

            {/* Quantity and Expected Amount Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground flex items-center gap-2">
                  <Package size={14} className="text-primary" />
                  Số lượng giao <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  {...register('quantity')}
                  placeholder="Nhập số lượng..."
                  className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-bold tabular-nums"
                />
                {errors.quantity && <p className="text-red-500 text-[11px] font-medium">{errors.quantity.message as string}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground flex items-center gap-2">
                  <span className="text-emerald-500 opacity-80">₫</span>
                  Tiền cần thu
                </label>
                <Controller
                  name="expected_amount"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      {...field}
                      value={field.value as number}
                      placeholder="0đ"
                      className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold tabular-nums text-emerald-600"
                    />
                  )}
                />
                {errors.expected_amount && <p className="text-red-500 text-[11px] font-medium">{errors.expected_amount.message as string}</p>}
              </div>
            </div>

            {(order?.remaining_quantity ?? order?.total_quantity ?? 0) < Number(watch('quantity')) && (
               <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2 text-amber-700">
                 <AlertCircle size={16} className="mt-0.5 shrink-0" />
                 <p className="text-[12px] font-medium italic">Số lượng phân bổ vượt quá số lượng còn lại của đơn hàng.</p>
               </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-[13px] font-bold transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={clsx(
                "flex-[2] py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2",
                isSubmitting && "opacity-70 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Truck size={16} />
              )}
              Xác nhận phân xe
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AssignVehicleDialog;
