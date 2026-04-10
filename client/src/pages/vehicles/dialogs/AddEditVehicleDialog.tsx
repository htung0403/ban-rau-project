import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Car, Info, User, Plus, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm, useWatch } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateVehicle, useUpdateVehicle } from '../../../hooks/queries/useVehicles';
import { useEmployees } from '../../../hooks/queries/useHR';
import { useVehicles } from '../../../hooks/queries/useVehicles';
import { CreatableSearchableSelect } from '../../../components/ui/CreatableSearchableSelect';
import { MultiSearchableSelect } from '../../../components/ui/MultiSearchableSelect';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import type { Vehicle } from '../../../types';

const vehicleSchema = z.object({
  license_plate: z.string().min(5, 'Biển số phải từ 5 ký tự'),
  vehicle_type: z.string().optional(),
  load_capacity_ton: z.preprocess(
    (value) => (value === '' || value == null ? undefined : Number(value)),
    z.number().positive('Tải trọng phải lớn hơn 0').optional()
  ),
  goods_categories: z.array(z.enum(['grocery', 'vegetable'])).min(1, 'Vui lòng chọn ít nhất một loại hàng'),
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
  const { data: vehicles } = useVehicles(isOpen);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema) as Resolver<VehicleFormData>,
    defaultValues: {
      license_plate: '',
      vehicle_type: '',
      load_capacity_ton: undefined,
      goods_categories: ['grocery', 'vegetable'],
      driver_id: '',
    },
  });

  const vehicleType = useWatch({ control, name: 'vehicle_type' });
  const goodsCategories = useWatch({ control, name: 'goods_categories' });
  const driverId = useWatch({ control, name: 'driver_id' });

  const [customVehicleTypes, setCustomVehicleTypes] = React.useState<string[]>([]);

  const vehicleTypeOptions = React.useMemo(() => {
    const set = new Set<string>();

    (vehicles || []).forEach((item) => {
      const type = item.vehicle_type?.trim();
      if (type) set.add(type);
    });

    customVehicleTypes.forEach((type) => {
      if (type.trim()) set.add(type.trim());
    });

    const current = vehicleType?.trim();
    if (current) set.add(current);

    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, 'vi'))
      .map((type) => ({ value: type, label: type }));
  }, [vehicles, customVehicleTypes, vehicleType]);

  const goodsCategoryOptions = React.useMemo(
    () => [
      { value: 'grocery', label: 'Hàng tạp hóa' },
      { value: 'vegetable', label: 'Hàng rau' },
    ],
    []
  );

  useEffect(() => {
    if (isOpen) {
      if (vehicle) {
        reset({
          license_plate: vehicle.license_plate,
          vehicle_type: vehicle.vehicle_type || '',
          load_capacity_ton: vehicle.load_capacity_ton,
          goods_categories: vehicle.goods_categories?.length ? vehicle.goods_categories : ['grocery', 'vegetable'],
          driver_id: vehicle.driver_id || '',
        });
      } else {
        reset({
          license_plate: '',
          vehicle_type: '',
          load_capacity_ton: undefined,
          goods_categories: ['grocery', 'vegetable'],
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
        load_capacity_ton: data.load_capacity_ton,
        goods_categories: data.goods_categories,
        driver_id: data.driver_id || undefined,
      };
      if (vehicle) {
        await updateMutation.mutateAsync({ id: vehicle.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  if (!isOpen && !isClosing) return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex justify-end">
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
          'relative w-full max-w-125 bg-[#f8fafc] shadow-2xl flex flex-col h-screen border-l border-border',
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
                <CreatableSearchableSelect
                  options={vehicleTypeOptions}
                  value={vehicleType || ''}
                  onValueChange={(val) => setValue('vehicle_type', val, { shouldValidate: true })}
                  onCreate={(val) => {
                    const trimmed = val.trim();
                    if (!trimmed) return;
                    setCustomVehicleTypes((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
                    setValue('vehicle_type', trimmed, { shouldValidate: true });
                  }}
                  placeholder="VD: Xe tải 10 tấn, Container..."
                  searchPlaceholder="Tìm hoặc nhập loại xe..."
                  createMessage="Thêm loại xe"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Tải trọng (tấn)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    {...register('load_capacity_ton')}
                    placeholder="VD: 10"
                    className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  {errors.load_capacity_ton && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.load_capacity_ton.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Loại hàng có thể giao</label>
                <MultiSearchableSelect
                  options={goodsCategoryOptions}
                  value={goodsCategories || []}
                  onValueChange={(val) => {
                    setValue('goods_categories', val as Array<'grocery' | 'vegetable'>, { shouldValidate: true });
                  }}
                  placeholder="Chọn loại hàng..."
                  searchPlaceholder="Tìm loại hàng..."
                />
                {errors.goods_categories && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.goods_categories.message}</p>}
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
                  options={(employees || []).filter(e => e.role === 'driver' || e.role?.toLowerCase().includes('tài xế') || e.role?.toLowerCase().includes('tai xe') || e.role?.toLowerCase().includes('tai_xe')).map(e => ({ value: e.id, label: `${e.full_name} (${e.phone || 'Chưa cập nhật'})` }))}
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
