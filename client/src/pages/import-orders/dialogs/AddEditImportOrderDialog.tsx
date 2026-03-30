import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, ChevronRight, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useCreateImportOrder, useUpdateImportOrder } from '../../../hooks/queries/useImportOrders';
import { useWarehouses } from '../../../hooks/queries/useWarehouses';
import { useCustomers } from '../../../hooks/queries/useCustomers';
import { useProducts } from '../../../hooks/queries/useProducts';
import type { ImportOrder } from '../../../types';
import CurrencyInput from '../../../components/shared/CurrencyInput';

const importOrderSchema = z.object({
  order_date: z.string().min(1, 'Vui lòng chọn ngày'),
  order_time: z.string().min(1, 'Vui lòng nhập giờ'),
  sender_name: z.string().min(1, 'Vui lòng nhập người gửi'),
  receiver_name: z.string().min(1, 'Vui lòng nhập người nhận'),
  receiver_phone: z.string().optional(),
  receiver_address: z.string().optional(),
  package_type: z.string().optional(),
  weight_kg: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().min(1, 'Số lượng tối thiểu là 1'),
  unit_price: z.coerce.number().min(0).optional(),
  warehouse_id: z.string().min(1, 'Vui lòng chọn kho'),
  customer_id: z.string().optional(),
  product_id: z.string().min(1, 'Vui lòng chọn hàng hóa'),
  status: z.string().default('pending'),
  notes: z.string().optional(),
});

type ImportOrderFormData = z.infer<typeof importOrderSchema>;

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  editingOrder: ImportOrder | null;
  onClose: () => void;
}

const AddEditImportOrderDialog: React.FC<Props> = ({ isOpen, isClosing, editingOrder, onClose }) => {
  const isEditMode = !!editingOrder;
  const createMutation = useCreateImportOrder();
  const updateMutation = useUpdateImportOrder();
  const { data: warehouses } = useWarehouses();
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(importOrderSchema),
    defaultValues: {
      order_date: format(new Date(), 'yyyy-MM-dd'),
      order_time: new Date().toTimeString().slice(0, 5),
      quantity: 1,
      status: 'pending',
    } as ImportOrderFormData,
  });

  const watchProductId = watch('product_id');
  const prevProductId = React.useRef(editingOrder?.product_id);

  // Auto-fill package_type when product changes
  useEffect(() => {
    if (watchProductId && products && watchProductId !== prevProductId.current) {
      const selectedProduct = products.find((p: any) => p.id === watchProductId);
      if (selectedProduct?.unit) {
        setValue('package_type', selectedProduct.unit);
      }
      prevProductId.current = watchProductId;
    }
  }, [watchProductId, products, setValue]);

  useEffect(() => {
    if (editingOrder) {
      reset({
        order_date: editingOrder.order_date,
        order_time: editingOrder.order_time,
        sender_name: editingOrder.sender_name,
        receiver_name: editingOrder.receiver_name,
        receiver_phone: editingOrder.receiver_phone || '',
        receiver_address: editingOrder.receiver_address || '',
        package_type: editingOrder.package_type || undefined,
        weight_kg: editingOrder.weight_kg || undefined,
        quantity: editingOrder.quantity,
        unit_price: editingOrder.unit_price || undefined,
        warehouse_id: editingOrder.warehouse_id || '',
        customer_id: editingOrder.customer_id || '',
        product_id: (editingOrder as any).product_id || '',
        status: editingOrder.status,
        notes: editingOrder.notes || '',
      });
    } else {
      reset({
        order_date: format(new Date(), 'yyyy-MM-dd'),
        order_time: new Date().toTimeString().slice(0, 5),
        quantity: 1,
        status: 'pending',
      });
    }
  }, [editingOrder, reset]);

  const watchQuantity = watch('quantity');
  const watchWeight = watch('weight_kg');
  const watchPrice = watch('unit_price');
  const calculatedTotal = Number(watchQuantity || 0) * Number(watchWeight || 0) * Number(watchPrice || 0);

  const onSubmit = async (data: Record<string, any>) => {
    try {
      const payload = { ...data };
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          delete payload[key];
        }
      });
      if (isEditMode && editingOrder) {
        await updateMutation.mutateAsync({ id: editingOrder.id, payload: payload as any });
      } else {
        await createMutation.mutateAsync(payload as any);
      }
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  if (!isOpen && !isClosing) return null;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

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
          'relative w-full max-w-[750px] bg-[#f8fafc] shadow-2xl flex flex-col h-screen border-l border-border',
          isClosing ? 'dialog-slide-out' : 'dialog-slide-in',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Package size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {isEditMode ? 'Chỉnh sửa đơn nhập' : 'Thêm đơn nhập hàng'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* THONG TIN DON HANG */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Package size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Thông tin đơn hàng</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Ngày nhập <span className="text-red-500">*</span></label>
                <input type="date" {...register('order_date')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                {errors.order_date && <p className="text-red-500 text-[11px]">{errors.order_date.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Giờ nhập <span className="text-red-500">*</span></label>
                <input type="time" {...register('order_time')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                {errors.order_time && <p className="text-red-500 text-[11px]">{errors.order_time.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Người gửi <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Tên người gửi" {...register('sender_name')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                {errors.sender_name && <p className="text-red-500 text-[11px]">{errors.sender_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Người nhận <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Tên người nhận" {...register('receiver_name')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                {errors.receiver_name && <p className="text-red-500 text-[11px]">{errors.receiver_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">SDT người nhận</label>
                <input type="text" placeholder="0901234567" {...register('receiver_phone')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Địa chỉ nhận</label>
                <input type="text" placeholder="Địa chỉ" {...register('receiver_address')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
              </div>
            </div>
          </div>

          {/* HANG HOA */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Package size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Chi tiết hàng hóa</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[13px] font-bold text-foreground">Hàng hóa <span className="text-red-500">*</span></label>
                <select {...register('product_id')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-bold">
                  <option value="">Chọn hàng hóa...</option>
                  {(products || []).map((p: any) => (
                    <option key={p.id} value={p.id}>[{p.sku}] {p.name} ({p.unit})</option>
                  ))}
                </select>
                {errors.product_id && <p className="text-red-500 text-[11px] font-medium">{errors.product_id.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Loại đóng gói</label>
                <input 
                  type="text" 
                  placeholder="Thùng, bao, kiện..." 
                  {...register('package_type')} 
                  list="package-types"
                  className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium" 
                />
                <datalist id="package-types">
                  <option value="thùng" />
                  <option value="bao" />
                  <option value="kiện" />
                  <option value="pallet" />
                  <option value="khác" />
                </datalist>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Số lượng <span className="text-red-500">*</span></label>
                <input type="number" min="1" {...register('quantity')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all tabular-nums" />
                {errors.quantity && <p className="text-red-500 text-[11px]">{errors.quantity.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Khối lượng (kg)</label>
                <input type="number" step="0.01" min="0" {...register('weight_kg')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all tabular-nums" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Đơn giá (VND)</label>
                <Controller
                  name="unit_price"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      {...field}
                      value={field.value as number | undefined}
                      onChange={field.onChange}
                      placeholder="0"
                      className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all tabular-nums"
                    />
                  )}
                />
              </div>
              {calculatedTotal > 0 && (
                <div className="md:col-span-2 bg-primary/5 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-[13px] font-bold text-primary">Thành tiền (SL x Kg x Đơn giá)</span>
                  <span className="text-lg font-bold text-primary tabular-nums">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculatedTotal)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* PHAN LOAI & KHO */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Package size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Phân loại</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Kho nhận</label>
                <select {...register('warehouse_id')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all">
                  <option value="">Chọn kho</option>
                  {(warehouses || []).map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Khách hàng</label>
                <select {...register('customer_id')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all">
                  <option value="">Chọn khách hàng</option>
                  {(customers || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Trạng thái</label>
                <select {...register('status')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-bold">
                  <option value="pending">Chờ xử lý</option>
                  <option value="processing">Đang xử lý</option>
                  <option value="delivered">Đã giao</option>
                  <option value="returned">Trả lại</option>
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[13px] font-bold text-foreground">Ghi chú</label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú thêm (tùy chọn)"
                  {...register('notes')}
                  className="w-full px-4 py-3 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none"
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
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className={clsx(
              'flex items-center gap-2 px-8 py-2 rounded-xl text-[13px] font-bold shadow-lg transition-all group',
              isSubmitting
                ? 'bg-primary/50 text-white/60 cursor-wait'
                : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20',
            )}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Plus size={18} />
                {isEditMode ? 'Lưu thay đổi' : 'Thêm mới'}
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

export default AddEditImportOrderDialog;
