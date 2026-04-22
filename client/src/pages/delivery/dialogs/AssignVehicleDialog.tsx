import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck, Package, User, AlertCircle, Trash2, CheckCircle, ImagePlus, Loader2, Camera } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAssignVehicle } from '../../../hooks/queries/useDelivery';
import { useVehicles } from '../../../hooks/queries/useVehicles';
import { useEmployees } from '../../../hooks/queries/useHR';
import type { DeliveryOrder } from '../../../types';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { useAuth } from '../../../context/AuthContext';
import { uploadApi } from '../../../api/uploadApi';
import toast from 'react-hot-toast';
import type { Vehicle } from '../../../types';

const assignmentSchema = z.object({
  vehicle_id: z.string().min(1, 'Vui lòng chọn xe'),
  driver_id: z.string().min(1, 'Vui lòng chọn tài xế'),
  loader_name: z.string().optional().nullable(),
  unit_price: z.coerce.number().min(0).optional().default(0),
  quantity: z.coerce.number().min(0.01, 'SL phải > 0'),
  expected_amount: z.coerce.number().min(0).optional().default(0),
});

const schema = z.object({
  assignments: z.array(assignmentSchema).min(1, 'Cần ít nhất một sự phân bổ'),
  image_urls: z.array(z.string()).default([]),
  export_payment_status: z.enum(['unpaid', 'paid']).default('unpaid'),
});

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const digitsOnly = (s: string) => s.replace(/\D/g, '');

/** digits của số tiền đang lưu (để so sánh thêm/xóa ký tự). */
const amountToDigitString = (amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return String(Math.trunc(amount));
};

type FormValues = z.infer<typeof schema>;

const vehicleSupportsGoodsCategory = (vehicle: Vehicle, category: 'grocery' | 'vegetable') => {
  if (!vehicle.goods_categories || vehicle.goods_categories.length === 0) return true;
  return vehicle.goods_categories.includes(category);
};

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  order: DeliveryOrder | null;
  initialVehicleId?: string | null;
  allOrders?: DeliveryOrder[];
  onClose: () => void;
}

const EMPTY_ARRAY: DeliveryOrder[] = [];

const AssignVehicleDialog: React.FC<Props> = ({ isOpen, isClosing, order, initialVehicleId, allOrders = EMPTY_ARRAY, onClose }) => {
  const { data: vehicles } = useVehicles(isOpen);
  const { data: employees } = useEmployees(isOpen);
  const assignMutation = useAssignVehicle();
  const { user } = useAuth();

  const normalizedRole = (user?.role || '').toLowerCase();
  const isLoader = normalizedRole.includes('lo_xe') || normalizedRole.includes('lơ xe');
  const isDriver = normalizedRole === 'driver' || normalizedRole.includes('tai_xe') || normalizedRole.includes('tài xế') || normalizedRole.includes('driver') || isLoader;
  
  const myEmployee = React.useMemo(() => {
    if (!user) return null;
    return (employees || []).find(e => e.id === user.id || (user.full_name && e.full_name === user.full_name));
  }, [employees, user]);
  
  const myEmployeeId = myEmployee?.id || user?.id;

  const myVehicle = React.useMemo(() => {
    if (!myEmployeeId && !user?.full_name) return undefined;
    const allVehs = vehicles || [];
    return allVehs.find(v => 
      v.driver_id === myEmployeeId || 
      v.in_charge_id === myEmployeeId ||
      (user?.full_name && v.profiles?.full_name === user.full_name) ||
      (user?.full_name && v.responsible_profile?.full_name === user.full_name)
    );
  }, [vehicles, myEmployeeId, user?.full_name]);

  const targetCategory = (order?.order_category ?? 'standard') === 'vegetable' ? 'vegetable' : 'grocery';
  const eligibleVehicles = React.useMemo(
    () => {
      let filtered = (vehicles || []).filter((vehicle) => vehicleSupportsGoodsCategory(vehicle, targetCategory));
      
      if (isDriver && myVehicle) {
        filtered = filtered.filter(v => v.id === myVehicle.id);
      }
      
      return filtered;
    },
    [vehicles, targetCategory, isDriver, myVehicle]
  );

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
      assignments: [],
      image_urls: [],
      export_payment_status: 'unpaid',
    },
  });

  const { fields, remove } = useFieldArray({
    control,
    name: 'assignments',
  });

  const watchAssignments = watch('assignments') || [];
  const watchImageUrls = watch('image_urls') || [];
  const watchExportPaymentStatus = watch('export_payment_status');
  const totalAssignedQuantity = watchAssignments.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const persistedAssignedQuantity = (order?.delivery_vehicles || []).reduce((acc: number, dv: any) => acc + (Number(dv.assigned_quantity) || 0), 0);
  const currentAvailable = order ? Math.max(0, order.total_quantity - persistedAssignedQuantity) : 0;
  const isStandardOrder = (order?.order_category ?? 'standard') === 'standard';

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  /** Theo dõi chuỗi chữ số đã “ổn định” theo từng dòng: chỉ ×1000 khi user gõ thêm (độ dài tăng), không khi xóa. */
  const expectedAmountPrevDigitsRef = useRef<Record<number, string>>({});

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast.error('Chỉ hỗ trợ file ảnh');
      return;
    }

    try {
      setIsUploading(true);
      const uploadPromises = files.map(file => 
        uploadApi.uploadFile(file, 'import-orders', 'delivery-orders')
      );
      
      const responses = await Promise.all(uploadPromises);
      const newUrls = responses.map(r => r.url);
      
      const currentUrls = watch('image_urls') || [];
      setValue('image_urls', [...currentUrls, ...newUrls], { shouldValidate: true });
      toast.success(`Đã tải lên ${newUrls.length} ảnh thành công!`);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Lỗi khi tải ảnh lên');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (order && isOpen) {
      const toDisplayPrice = (p: number) => (p >= 10000 ? p / 1000 : p);
      let defaultUnitPrice = toDisplayPrice(order.unit_price || 0);
      if (!defaultUnitPrice && allOrders.length > 0) {
        const orderReceiverName = order.import_orders?.customers?.name || order.import_orders?.receiver_name?.trim() || order.import_orders?.profiles?.full_name || '';
        const sameDayOrders = allOrders.filter(o => {
          if (o.id === order.id) return false;
          if (o.delivery_date !== order.delivery_date) return false;
          if (o.product_name !== order.product_name) return false;
          const oReceiverName = o.import_orders?.customers?.name || o.import_orders?.receiver_name?.trim() || o.import_orders?.profiles?.full_name || '';
          if (oReceiverName !== orderReceiverName) return false;
          if (!o.delivery_vehicles || o.delivery_vehicles.length === 0) return false;
          if (!o.unit_price || o.unit_price <= 0) return false;
          return true;
        });
        if (sameDayOrders.length > 0) {
          defaultUnitPrice = toDisplayPrice(sameDayOrders[0].unit_price || 0);
        }
      }

      const existingDvs = order.delivery_vehicles || [];
      const initialAssignments: any[] = [];

      if (existingDvs.length > 0) {
        existingDvs.forEach((dv: any) => {
          initialAssignments.push({
            vehicle_id: dv.vehicle_id,
            driver_id: dv.driver_id || '',
            loader_name: dv.loader_name || '',
            unit_price: defaultUnitPrice,
            quantity: dv.assigned_quantity,
            expected_amount: dv.expected_amount || (dv.assigned_quantity * defaultUnitPrice)
          });
        });
      }

      let initialVid = initialVehicleId || '';
      if (isDriver) {
        initialVid = initialVid || myVehicle?.id || '';
      }

      if (initialVid && !initialAssignments.some(a => a.vehicle_id === initialVid)) {
        const vehicle = eligibleVehicles.find(v => v.id === initialVid);
        const alreadyAssignedSum = initialAssignments.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);
        const remainingForThis = Math.max(0, order.total_quantity - alreadyAssignedSum);

        initialAssignments.push({
          vehicle_id: initialVid,
          driver_id: vehicle?.driver_id || vehicle?.in_charge_id || (isDriver ? myEmployeeId : ''),
          loader_name: '',
          unit_price: defaultUnitPrice,
          quantity: remainingForThis,
          expected_amount: remainingForThis * defaultUnitPrice,
        });
      }

      if (initialAssignments.length === 0) {
        initialAssignments.push({
          vehicle_id: isDriver ? (initialVid || '') : '',
          driver_id: isDriver ? (myEmployeeId || '') : '',
          loader_name: '',
          unit_price: defaultUnitPrice,
          quantity: '',
          expected_amount: 0,
        });
      }

      if (isDriver && initialVid && myEmployeeId) {
        initialAssignments.forEach((assignment) => {
          if (assignment.vehicle_id === initialVid) {
            assignment.driver_id = myEmployeeId;
          }
        });
      }

      const existingAssignedVehicleIds = initialAssignments
        .filter((assignment) => Number(assignment.quantity || 0) > 0)
        .map((assignment) => assignment.vehicle_id)
        .filter(Boolean);

      const paidVehicleIds = new Set(
        (order.payment_collections || [])
          .filter((pc: any) => pc.status === 'confirmed' || pc.status === 'self_confirmed')
          .map((pc: any) => pc.vehicle_id)
          .filter(Boolean)
      );

      const defaultExportPaymentStatus: 'unpaid' | 'paid' = order.export_order_payment_status
        ? (order.export_order_payment_status === 'paid' ? 'paid' : 'unpaid')
        : (existingAssignedVehicleIds.length > 0 && existingAssignedVehicleIds.every((id) => paidVehicleIds.has(id))
          ? 'paid'
          : 'unpaid');

      expectedAmountPrevDigitsRef.current = {};

      const existingImages = (order as any).image_urls || [];
      const legacyImage = (order as any).image_url;
      const initialImages = Array.isArray(existingImages) ? [...existingImages] : [];
      if (legacyImage && !initialImages.includes(legacyImage)) {
        initialImages.push(legacyImage);
      }

      reset({
        assignments: initialAssignments,
        image_urls: initialImages,
        export_payment_status: defaultExportPaymentStatus,
      });
    }
  }, [order, initialVehicleId, isOpen, reset, eligibleVehicles, isDriver, myVehicle, myEmployeeId, allOrders]);

  if (!isOpen && !isClosing) return null;

  const onSubmit = async (data: FormValues) => {
    if (!order) return;
    try {
      const normalizedAssignments = data.assignments
        .map((assignment) => {
          const vehicle = eligibleVehicles.find((v) => v.id === assignment.vehicle_id);
          const resolvedDriverId =
            assignment.driver_id ||
            vehicle?.driver_id ||
            vehicle?.in_charge_id ||
            (isDriver && assignment.vehicle_id === myVehicle?.id ? myEmployeeId || '' : '');

          const rawPrice = Number(assignment.unit_price) || 0;
          const normalizedPrice = rawPrice > 0 && rawPrice < 10000 ? rawPrice * 1000 : rawPrice;
          const qty = Number(assignment.quantity) || 0;
          const normalizedAmount = qty * normalizedPrice;

          return {
            ...assignment,
            driver_id: resolvedDriverId,
            unit_price: normalizedPrice,
            expected_amount: normalizedAmount > 0 ? normalizedAmount : Number(assignment.expected_amount) || 0,
          };
        })
        .filter((assignment) => {
          if (UUID_REGEX.test(assignment.driver_id)) return true;

          if (isDriver && assignment.vehicle_id !== myVehicle?.id) return false;

          return true;
        });

      const hasInvalidDriverId = normalizedAssignments.some(
        (assignment) => !UUID_REGEX.test(assignment.driver_id)
      );

      if (hasInvalidDriverId) {
        toast.error('Có xe chưa có tài xế hợp lệ. Vui lòng chọn tài xế trước khi lưu.');
        return;
      }

      if (normalizedAssignments.length === 0) {
        toast.error('Không có phân bổ hợp lệ để lưu.');
        return;
      }

      const payload: any = {
        assignments: normalizedAssignments,
        export_payment_status: data.export_payment_status,
        unit_price: normalizedAssignments[0]?.unit_price || 0,
      };
      if (data.image_urls && data.image_urls.length > 0) {
        payload.image_urls = data.image_urls;
        // Also send singular image_url for backward compatibility if needed
        payload.image_url = data.image_urls[0];
      } else {
        payload.image_urls = [];
        payload.image_url = null;
      }

      await assignMutation.mutateAsync({
        id: order.id,
        payload
      });
      onClose();
    } catch {
      // Error handled by mutation toast
    }
  };

  const isSubmitting = assignMutation.isPending;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-end sm:items-center justify-center sm:p-4">
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
          'relative w-full bg-background flex flex-col transition-all duration-350',
          'h-dvh sm:h-auto sm:max-h-[90vh] sm:max-w-200',
          'rounded-none sm:rounded-3xl shadow-2xl',
          isClosing
            ? 'translate-y-full sm:translate-y-0 sm:scale-95 opacity-0'
            : 'animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300'
        )}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-card border-b border-border flex items-center justify-between shrink-0 sm:rounded-t-3xl shadow-sm z-10 pb-safe-top">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Phân xe cho đơn hàng
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                {order?.product_name}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form id="assign-vehicle-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          {/* Order Info Summary */}
          <div className="bg-muted/50 rounded-2xl p-4 border border-border flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tổng cần giao</span>
                <span className="text-lg font-black text-foreground tabular-nums">
                  {order?.total_quantity.toLocaleString()}
                </span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Còn lại (Chưa phân)</span>
                <span className="text-lg font-black text-orange-600 tabular-nums transition-all">
                  {currentAvailable.toLocaleString()}
                </span>
              </div>
            </div>

            {order?.import_orders?.total_amount != null && (
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Tổng tiền đơn hàng</span>
                <span className="text-[15px] font-black text-emerald-600 tabular-nums">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(order.import_orders.total_amount))}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">Danh sách phương tiện</h3>
            </div>

            <div className="flex flex-col gap-3">
              {fields.map((field, index) => {
                const currentVid = watchAssignments[index]?.vehicle_id;
                const isPaid = currentVid
                  ? (order?.payment_collections || []).some((pc: any) => pc.vehicle_id === currentVid && (pc.status === 'confirmed' || pc.status === 'self_confirmed'))
                  : false;

                const isMyVehicleRow = currentVid === myVehicle?.id;
                
                if (isDriver && !isMyVehicleRow && currentVid) {
                  return null;
                }

                const isRowDisabled = isPaid || (isDriver && !isMyVehicleRow);

                return (
                  <div key={field.id} className={clsx("relative flex flex-col md:flex-row gap-4 p-4 bg-card border border-border shadow-sm rounded-xl items-start md:items-end group transition-colors", isPaid ? "opacity-90 bg-muted/50" : "hover:border-primary/30")}>
                    {/* Badge đã thu tiền */}
                    {isPaid && (
                      <div className="absolute -top-3 left-4 bg-green-100 border border-green-200 text-green-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                        <CheckCircle size={10} strokeWidth={3} /> Đã thu tiền
                      </div>
                    )}

                    {/* Xe */}
                    <div className="flex-1 w-full space-y-1.5 mt-2 md:mt-0">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <Truck size={12} className={isPaid ? "text-green-500" : "text-primary"} /> Chọn xe
                      </label>
                      <SearchableSelect
                        options={eligibleVehicles.map(v => ({
                          value: v.id,
                          label: `${v.license_plate} ${v.profiles?.full_name ? '(' + v.profiles.full_name + ')' : ''}`,
                          selectedLabel: v.license_plate
                        }))}
                        value={currentVid || ''}
                        onValueChange={(val) => {
                          if (isRowDisabled) return;
                          setValue(`assignments.${index}.vehicle_id`, val, { shouldValidate: true });
                          // Auto fill driver
                          const vehicle = eligibleVehicles.find(v => v.id === val);
                          if (vehicle?.driver_id || vehicle?.in_charge_id) {
                            setValue(`assignments.${index}.driver_id`, vehicle.driver_id || vehicle.in_charge_id || '', { shouldValidate: true });
                          }
                        }}
                        placeholder="Biển số..."
                        disabled={isRowDisabled || isDriver}
                      />
                      {errors.assignments?.[index]?.vehicle_id && <p className="text-red-500 text-[10px] font-medium absolute -bottom-4">{errors.assignments[index]?.vehicle_id?.message}</p>}
                    </div>
                    {/* Tài xế */}
                    <div className="flex-1 w-full space-y-1.5 mt-2 md:mt-0">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <User size={12} className={isPaid ? "text-green-500" : "text-primary"} /> Tài xế
                      </label>
                      <SearchableSelect
                        options={(employees || []).filter(e => e.role === 'driver' || e.role?.toLowerCase().includes('tài xế') || e.role?.toLowerCase().includes('tai xe') || e.role?.toLowerCase().includes('tai_xe') || e.role?.toLowerCase().includes('lơ xe') || e.role?.toLowerCase().includes('lo xe') || e.role?.toLowerCase().includes('lo_xe')).map(e => ({ value: e.id, label: e.full_name }))}
                        value={watchAssignments[index]?.driver_id || ''}
                        onValueChange={(val) => {
                          if (isRowDisabled) return;
                          setValue(`assignments.${index}.driver_id`, val, { shouldValidate: true });
                        }}
                        placeholder="Chọn tài xế..."
                        disabled={isRowDisabled || isDriver}
                      />
                      {errors.assignments?.[index]?.driver_id && <p className="text-red-500 text-[10px] font-medium absolute -bottom-4">{errors.assignments[index]?.driver_id?.message}</p>}
                    </div>
                    {/* Số lượng */}
                    <div className="w-full md:w-32 space-y-1.5 mt-2 md:mt-0">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <Package size={12} className={isPaid ? "text-green-500" : "text-primary"} /> SL
                      </label>
                      <input
                        type="number"
                        step="any"
                        {...register(`assignments.${index}.quantity` as const, {
                          onChange: (e) => {
                            if (isRowDisabled) return;
                            let valStr = e.target.value;
                            if (valStr.length > 1 && valStr.startsWith('0') && valStr[1] !== '.') {
                              valStr = valStr.replace(/^0+/, '');
                              e.target.value = valStr;
                            }
                            const val = Number(valStr) || 0;
                            const currentUnitPrice = Number(watchAssignments[index]?.unit_price) || 0;
                            const expected = val * currentUnitPrice;
                            setValue(`assignments.${index}.expected_amount`, expected, { shouldValidate: true });
                            expectedAmountPrevDigitsRef.current[index] = amountToDigitString(expected);
                          }
                        })}
                        disabled={isRowDisabled}
                        placeholder="0"
                        className={clsx("w-full h-10.5 px-3 bg-muted/20 border border-border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-bold tabular-nums", isRowDisabled && "opacity-70 bg-muted text-muted-foreground cursor-not-allowed")}
                      />
                      {errors.assignments?.[index]?.quantity && <p className="text-red-500 text-[10px] font-medium absolute -bottom-4">{errors.assignments[index]?.quantity?.message}</p>}
                    </div>

                    {/* Đơn giá */}
                    <div className="w-full md:w-36 space-y-1.5 mt-2 md:mt-0">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        Đơn giá
                      </label>
                      <input
                        type="number"
                        step="any"
                        {...register(`assignments.${index}.unit_price` as const, {
                          onChange: (e) => {
                            if (isRowDisabled) return;
                            let valStr = e.target.value;
                            if (valStr.length > 1 && valStr.startsWith('0') && valStr[1] !== '.') {
                              valStr = valStr.replace(/^0+/, '');
                              e.target.value = valStr;
                            }
                            const price = Number(valStr) || 0;
                            const qty = Number(watchAssignments[index]?.quantity) || 0;
                            const expected = qty * price;
                            setValue(`assignments.${index}.expected_amount`, expected, { shouldValidate: true });
                            expectedAmountPrevDigitsRef.current[index] = amountToDigitString(expected);
                          }
                        })}
                        disabled={isRowDisabled}
                        placeholder="0"
                        className={clsx("w-full h-10.5 px-3 bg-card border border-border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-bold tabular-nums", isRowDisabled && "opacity-70 bg-muted text-muted-foreground cursor-not-allowed")}
                      />
                    </div>

                    {/* Tiền thu (chỉ đơn tạp hóa/standard) */}
                    {isStandardOrder && (
                      <div className="w-full md:w-44 space-y-1.5 mt-2 md:mt-0">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Tiền thu (VND)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            watchAssignments[index]?.expected_amount
                              ? new Intl.NumberFormat('vi-VN').format(
                                  Number(watchAssignments[index]?.expected_amount || 0)
                                )
                              : ''
                          }
                          onFocus={() => {
                            if (isRowDisabled) return;
                            const amt = Number(watchAssignments[index]?.expected_amount || 0);
                            expectedAmountPrevDigitsRef.current[index] = amountToDigitString(amt);
                          }}
                          onChange={(e) => {
                            if (isRowDisabled) return;
                            const newDigits = digitsOnly(e.target.value);
                            const prevDigits = expectedAmountPrevDigitsRef.current[index] ?? '';

                            let amount = 0;
                            if (newDigits.length === 0) {
                              amount = 0;
                              expectedAmountPrevDigitsRef.current[index] = '';
                            } else if (newDigits.length < prevDigits.length) {
                              amount = Number(newDigits);
                              if (!Number.isFinite(amount) || amount < 0) amount = 0;
                              expectedAmountPrevDigitsRef.current[index] = newDigits;
                            } else if (newDigits.length > prevDigits.length) {
                              const n = Number(newDigits);
                              if (!Number.isFinite(n) || n <= 0) {
                                amount = 0;
                                expectedAmountPrevDigitsRef.current[index] = '';
                              } else {
                                amount = n < 1000 ? n * 1000 : n;
                                expectedAmountPrevDigitsRef.current[index] = amountToDigitString(amount);
                              }
                            } else {
                              amount = Number(newDigits);
                              if (!Number.isFinite(amount) || amount < 0) amount = 0;
                              expectedAmountPrevDigitsRef.current[index] = newDigits;
                            }

                            setValue(`assignments.${index}.expected_amount`, amount, { shouldValidate: true });
                          }}
                          disabled={isRowDisabled}
                          placeholder=""
                          className={clsx(
                            "w-full h-10.5 px-3 bg-muted/20 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-bold tabular-nums",
                            isRowDisabled && "opacity-70 bg-muted text-muted-foreground cursor-not-allowed"
                          )}
                        />
                      </div>
                    )}

                    {/* Người bốc xếp (chỉ đơn rau) */}
                    {!isStandardOrder && (
                      <div className="w-full md:w-52 space-y-1.5 mt-2 md:mt-0">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Người bốc xếp</label>
                        <input
                          type="text"
                          {...register(`assignments.${index}.loader_name` as const)}
                          disabled={isRowDisabled}
                          placeholder="Nhập tên người bốc xếp"
                          className={clsx(
                            "w-full h-10.5 px-3 bg-muted/20 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-semibold",
                            isRowDisabled && "opacity-70 bg-muted text-muted-foreground cursor-not-allowed"
                          )}
                        />
                      </div>
                    )}

                    {/* Nút xóa */}
                    {fields.length > 1 && !isRowDisabled && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="absolute -top-2 -right-2 md:static md:w-10 md:h-10.5 flex items-center justify-center bg-card md:bg-transparent text-red-400 hover:text-red-500 hover:bg-red-50 border border-red-100 md:border-transparent rounded-full md:rounded-lg shadow-sm md:shadow-none transition-all"
                        title="Xóa xe này"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {order?.total_quantity && totalAssignedQuantity > order.total_quantity && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2 text-amber-700 mt-4">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p className="text-[12px] font-medium italic">Tổng số lượng đã phân ({totalAssignedQuantity.toLocaleString()}) đang vượt quá yêu cầu của đơn hàng ({order.total_quantity.toLocaleString()}).</p>
              </div>
            )}

            {isStandardOrder && (
              <div className="space-y-2 pt-4 border-t border-border mt-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Trạng thái thanh toán phiếu xuất</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setValue('export_payment_status', 'unpaid', { shouldValidate: true })}
                    className={clsx(
                      'h-10 rounded-xl border text-[13px] font-bold transition-all',
                      watchExportPaymentStatus === 'unpaid'
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                    )}
                  >
                    Chưa thanh toán
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('export_payment_status', 'paid', { shouldValidate: true })}
                    className={clsx(
                      'h-10 rounded-xl border text-[13px] font-bold transition-all',
                      watchExportPaymentStatus === 'paid'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                    )}
                  >
                    Đã thanh toán
                  </button>
                </div>
              </div>
            )}

            {/* Upload Image Section */}
            <div className="space-y-1.5 pt-4 border-t border-border mt-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Camera size={12} />
                Ảnh xuất hàng / Giao hàng ({watchImageUrls.length})
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {watchImageUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl border border-border overflow-hidden group bg-muted/20">
                    <img src={url} alt={`Receipt ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        const newUrls = watchImageUrls.filter((_, i) => i !== idx);
                        setValue('image_urls', newUrls, { shouldValidate: true });
                      }}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={cameraInputRef}
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full aspect-square border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground hover:text-orange-500 hover:border-orange-400/50 hover:bg-orange-50 transition-all bg-muted/5 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 size={18} className="animate-spin text-primary" />
                    ) : (
                      <>
                        <Camera size={20} className="mb-1 text-orange-500" />
                        <span className="text-[10px] font-bold text-center px-1">Chụp ảnh</span>
                      </>
                    )}
                  </button>
                </div>

                <div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full aspect-square border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all bg-muted/5 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 size={18} className="animate-spin text-primary" />
                    ) : (
                      <>
                        <ImagePlus size={20} className="mb-1 text-primary" />
                        <span className="text-[10px] font-bold text-center px-1">Chọn ảnh</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </form>

        {/* Footer Buttons */}
        <div className="p-5 sm:p-6 pt-4 bg-card border-t border-border shrink-0 sm:rounded-b-3xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border hover:bg-muted text-foreground text-[14px] font-bold transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="assign-vehicle-form"
              disabled={isSubmitting}
              className={clsx(
                "flex-2 py-3 rounded-xl bg-primary text-white text-[14px] font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2",
                isSubmitting && "opacity-70 cursor-not-allowed pointer-events-none"
              )}
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Truck size={18} />
              )}
              {isStandardOrder ? 'Xác nhận thông tin' : 'Xuất hàng'}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default AssignVehicleDialog;
