import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, ChevronRight, Plus, Trash2, Upload, CheckCircle2, Circle } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useCreateImportOrder, useUpdateImportOrder } from '../../../hooks/queries/useImportOrders';
import { useWarehouses } from '../../../hooks/queries/useWarehouses';
import { useCustomers } from '../../../hooks/queries/useCustomers';
import { useProducts } from '../../../hooks/queries/useProducts';
import { useEmployees } from '../../../hooks/queries/useHR';
import type { ImportOrder, ImportOrderItem } from '../../../types';
import CurrencyInput from '../../../components/shared/CurrencyInput';
import axiosClient from '../../../api/axiosClient';
import toast from 'react-hot-toast';

const importOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Vui lòng chọn hàng hóa'),
  package_type: z.string().optional(),
  weight_kg: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().min(1, 'Số lượng tối thiểu là 1'),
  unit_price: z.coerce.number().min(0).optional(),
  image_url: z.string().optional(),
  payment_status: z.enum(['paid', 'unpaid']).default('unpaid'),
});

const importOrderSchema = z.object({
  order_date: z.string().min(1, 'Vui lòng chọn ngày'),
  order_time: z.string().min(1, 'Vui lòng nhập giờ'),
  received_by: z.string().min(1, 'Vui lòng chọn nhân viên'),
  receiver_phone: z.string().optional(),
  receiver_address: z.string().optional(),
  warehouse_id: z.string().optional(),
  customer_id: z.string().min(1, 'Vui lòng chọn khách hàng'),
  notes: z.string().optional(),
  items: z.array(importOrderItemSchema).min(1, 'Vui lòng thêm ít nhất 1 mặt hàng'),
});


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
  const { data: products } = useProducts();
  const { data: customers } = useCustomers();
  const { data: employees } = useEmployees();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(importOrderSchema) as any,
    defaultValues: {
      order_date: format(new Date(), 'yyyy-MM-dd'),
      order_time: new Date().toTimeString().slice(0, 5),
      items: [{ quantity: 1, payment_status: 'unpaid' }],
      status: 'pending',
    } as any,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchCustomerId = watch('customer_id');
  const selectedCustomer = customers?.find(c => c.id === watchCustomerId);

  useEffect(() => {
    if (editingOrder) {
      reset({
        order_date: editingOrder.order_date,
        order_time: editingOrder.order_time,
        received_by: editingOrder.received_by || '',
        receiver_phone: editingOrder.receiver_phone || '',
        receiver_address: editingOrder.receiver_address || '',
        warehouse_id: editingOrder.warehouse_id || '',
        customer_id: editingOrder.customer_id || '',
        notes: editingOrder.notes || '',
        items: editingOrder.import_order_items?.map((item: ImportOrderItem) => ({
          product_id: item.product_id,
          package_type: item.package_type,
          weight_kg: item.weight_kg,
          quantity: item.quantity,
          unit_price: item.unit_price,
          image_url: item.image_url,
          payment_status: item.payment_status,
        })) || [],
      });
    } else {
      reset({
        order_date: format(new Date(), 'yyyy-MM-dd'),
        order_time: new Date().toTimeString().slice(0, 5),
        items: [{ quantity: 1, payment_status: 'unpaid' }],
        status: 'pending',
        warehouse_id: warehouses?.[0]?.id || '',
      });
    }
  }, [editingOrder, reset, warehouses]);

  const watchItems = watch('items');
  const totalAmount = (watchItems || []).reduce((sum: number, item: any) => {
    return sum + (Number(item.quantity || 0) * Number(item.weight_kg || 0) * Number(item.unit_price || 0));
  }, 0);

  const handleFileUpload = async (index: number, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'import-orders');

      const response = await axiosClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.url) {
        setValue(`items.${index}.image_url`, response.data.url);
        toast.success('Upload ảnh thành công');
      } else {
        throw new Error('Dữ liệu trả về không hợp lệ');
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error?.response?.data?.message || error.message || 'Lỗi khi upload ảnh');
    }
  };

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
          {/* DOI TUONG & THOI GIAN */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Package size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Thông tin chung</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Ngày nhập <span className="text-red-500">*</span></label>
                <input type="date" {...register('order_date')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium" />
                {errors.order_date && <p className="text-red-500 text-[11px]">{errors.order_date.message as string}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Giờ nhập <span className="text-red-500">*</span></label>
                <input type="time" {...register('order_time')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium" />
                {errors.order_time && <p className="text-red-500 text-[11px]">{errors.order_time.message as string}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Người nhận (Khách hàng) <span className="text-red-500">*</span></label>
                <select {...register('customer_id')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-bold">
                  <option value="">Chọn khách hàng...</option>
                  {(customers || []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.customer_id && <p className="text-red-500 text-[11px] font-medium">{errors.customer_id.message as string}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Nhân viên nhận <span className="text-red-500">*</span></label>
                <select {...register('received_by')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-bold">
                  <option value="">Chọn nhân viên...</option>
                  {(employees || []).map((e: any) => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </select>
                {errors.received_by && <p className="text-red-500 text-[11px] font-medium">{errors.received_by.message as string}</p>}
              </div>

              {selectedCustomer && (
                <div className="md:col-span-2 p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] uppercase font-bold text-primary/60">Số điện thoại</span>
                      <span className="text-[13px] font-black text-primary">{selectedCustomer.phone || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="w-[1px] h-8 bg-primary/10" />
                    <div className="flex flex-col flex-1">
                      <span className="text-[11px] uppercase font-bold text-primary/60">Địa chỉ</span>
                      <span className="text-[13px] font-bold text-foreground truncate">{selectedCustomer.address || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 hidden">
                <label className="text-[13px] font-bold text-foreground">Kho nhận <span className="text-red-500">*</span></label>
                <select {...register('warehouse_id')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-bold">
                  <option value="">Chọn kho...</option>
                  {(warehouses || []).map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                {errors.warehouse_id && <p className="text-red-500 text-[11px] font-medium">{errors.warehouse_id.message as string}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Ghi chú</label>
                <input type="text" placeholder="Ghi chú thêm..." {...register('notes')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium" />
              </div>
            </div>
          </div>

          {/* BANG HANG HOA */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-primary" />
                <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Danh sách hàng hóa</span>
              </div>
              <button
                type="button"
                onClick={() => append({ quantity: 1, payment_status: 'unpaid' })}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-white text-[11px] font-bold hover:bg-primary/90 transition-all active:scale-95"
              >
                <Plus size={14} />
                Thêm hàng
              </button>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/10 border-b border-border">
                    <th className="px-4 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase">Hàng hóa</th>
                    <th className="px-4 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase w-24">Số lượng</th>
                    <th className="px-4 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase w-24">Kg</th>
                    <th className="px-4 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase w-32">Đơn giá</th>
                    <th className="px-4 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase w-20">Ảnh</th>
                    <th className="px-4 py-2 text-center text-[11px] font-bold text-muted-foreground uppercase w-24">Thanh toán</th>
                    <th className="px-4 py-2 text-center text-[11px] font-bold text-muted-foreground uppercase w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {fields.map((field, index) => (
                    <tr key={field.id} className="hover:bg-muted/5 transition-colors">
                      <td className="px-4 py-3">
                        <select
                          {...register(`items.${index}.product_id` as const)}
                          className="w-full px-2 py-1.5 bg-muted/20 border border-transparent rounded-lg text-[12px] focus:border-primary/30 focus:outline-none transition-all font-bold"
                        >
                          <option value="">Chọn...</option>
                          {(products || []).map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          {...register(`items.${index}.quantity` as const)}
                          className="w-full px-2 py-1.5 bg-muted/20 border border-transparent rounded-lg text-[12px] text-center focus:border-primary/30 focus:outline-none font-bold tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.weight_kg` as const)}
                          className="w-full px-2 py-1.5 bg-muted/20 border border-transparent rounded-lg text-[12px] text-center focus:border-primary/30 focus:outline-none font-bold tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Controller
                          name={`items.${index}.unit_price`}
                          control={control}
                          render={({ field }) => (
                            <CurrencyInput
                              {...field}
                              value={field.value as number}
                              onChange={field.onChange}
                              className="w-full px-2 py-1.5 bg-muted/20 border border-transparent rounded-lg text-[12px] text-right focus:border-primary/30 focus:outline-none font-bold tabular-nums"
                              placeholder="0"
                            />
                          )}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          <label className="cursor-pointer group relative">
                            {watch(`items.${index}.image_url`) ? (
                              <div className="w-8 h-8 rounded-lg overflow-hidden border border-border group-hover:opacity-50 transition-opacity">
                                <img src={watch(`items.${index}.image_url`)} alt="Product" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-muted/20 border border-dashed border-border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                <Upload size={14} />
                              </div>
                            )}
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(index, file);
                              }}
                            />
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              const current = watch(`items.${index}.payment_status`);
                              setValue(`items.${index}.payment_status`, current === 'paid' ? 'unpaid' : 'paid');
                            }}
                            className={clsx(
                              'p-1.5 rounded-lg transition-all active:scale-90',
                              watch(`items.${index}.payment_status`) === 'paid'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-slate-100 text-slate-400'
                            )}
                          >
                            {watch(`items.${index}.payment_status`) === 'paid' ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <Circle size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalAmount > 0 && (
              <div className="p-5 bg-gradient-to-r from-primary/5 to-transparent flex items-center justify-between border-t border-border">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-primary uppercase tracking-widest">Tổng thành tiền</span>
                  <span className="text-[13px] text-muted-foreground font-medium">Dự kiến dựa trên SL x KG x Đơn giá</span>
                </div>
                <div className="text-2xl font-black text-primary tabular-nums">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}
                </div>
              </div>
            )}
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
