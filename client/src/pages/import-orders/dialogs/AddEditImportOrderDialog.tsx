import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, Plus, Trash2, CheckCircle2, FileText, UserCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useCreateImportOrder, useUpdateImportOrder } from '../../../hooks/queries/useImportOrders';
import { useCustomers } from '../../../hooks/queries/useCustomers';
import { useCreateProduct, useProducts } from '../../../hooks/queries/useProducts';
import { useEmployees } from '../../../hooks/queries/useHR';
import type { ImportOrder, ImportOrderItem } from '../../../types';
import CurrencyInput from '../../../components/shared/CurrencyInput';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { CreatableSearchableSelect } from '../../../components/ui/CreatableSearchableSelect';
import toast from 'react-hot-toast';

const importOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Chọn hàng hóa'),
  package_type: z.string().optional().nullable().catch(null),
  quantity: z.coerce.number().min(1, 'SL > 0').catch(1),
  unit_price: z.coerce.number().optional().nullable().catch(null),
});

const importOrderSchema = z.object({
  order_date: z.string().min(1, 'Vui lòng chọn ngày'),
  order_time: z.string().min(1, 'Vui lòng nhập giờ'),
  received_by: z.string().min(1, 'Vui lòng chọn nhân viên'),
  customer_id: z.string().min(1, 'Vui lòng chọn Khách hàng / Chủ hàng'),
  notes: z.string().optional(),
  payment_status: z.enum(['paid', 'unpaid']).default('unpaid'),
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
  const createProductMutation = useCreateProduct();
  const { data: products } = useProducts(isOpen);
  const { data: customers } = useCustomers(isOpen);
  const { data: employees } = useEmployees(isOpen);

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
      items: [{ quantity: 1, package_type: '', product_id: '', unit_price: null }],
      payment_status: 'unpaid',
      customer_id: '',
      received_by: '',
      notes: ''
    } as any,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchCustomerId = watch('customer_id');
  const watchReceivedBy = watch('received_by');
  const watchPaymentStatus = watch('payment_status');


  useEffect(() => {
    if (editingOrder) {
      reset({
        order_date: editingOrder.order_date,
        order_time: editingOrder.order_time,
        received_by: editingOrder.received_by || '',
        customer_id: editingOrder.customer_id || '',
        notes: editingOrder.notes || '',
        items: editingOrder.import_order_items?.map((item: ImportOrderItem) => ({
          product_id: item.product_id,
          package_type: item.package_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })) || [],
        payment_status: editingOrder.import_order_items?.[0]?.payment_status || 'unpaid',
      });
    } else {
      reset({
        order_date: format(new Date(), 'yyyy-MM-dd'),
        order_time: new Date().toTimeString().slice(0, 5),
        items: [{ quantity: 1, package_type: '', product_id: '', unit_price: null }],
        payment_status: 'unpaid',
        customer_id: '',
        received_by: employees?.[0]?.id || '',
        notes: ''
      });
    }
  }, [editingOrder, reset, employees, isOpen]);

  const watchItems = watch('items');
  const totalAmount = (watchItems || []).reduce((sum: number, item: any) => {
    return sum + (Number(item.quantity || 0) * Number(item.unit_price || 0));
  }, 0);

  const handleCreateProduct = async (index: number, name: string) => {
    setValue(`items.${index}.product_id`, name);
    try {
      const resp = await createProductMutation.mutateAsync({
        name,
        sku: `P-${Date.now().toString().slice(-6)}`,
        unit: 'Kg', 
      });
      const newId = resp.data?.id || (resp as any).id;
      if (newId) {
        setValue(`items.${index}.product_id`, newId, { shouldValidate: true });
        toast.success(`Đã tạo nhanh mặt hàng: ${name}`);
      }
    } catch (error) {
      setValue(`items.${index}.product_id`, '', { shouldValidate: true });
      toast.error(`Lỗi khi tạo: ${name}`);
    }
  };

  const onSubmit = async (data: Record<string, any>) => {
    try {
      console.log('--- FORM SUBMIT DATA BEGIN ---', data);
      const payload = { ...data };
      if (payload.items) {
        payload.items = payload.items.map((item: any) => ({
          ...item,
          payment_status: payload.payment_status || 'unpaid',
        }));
      }
      
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') delete payload[key];
      });

      if (isEditMode && editingOrder) {
        console.log('--- DISPATCH UPDATE_MUTATION ---', payload);
        await updateMutation.mutateAsync({ id: editingOrder.id, payload: payload as any });
      } else {
        console.log('--- DISPATCH CREATE_MUTATION ---', payload);
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
          'relative w-full max-w-[1200px] bg-slate-50 shadow-2xl flex flex-col h-screen border-l border-border',
          isClosing ? 'dialog-slide-out' : 'dialog-slide-in',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border z-10 shadow-sm relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {isEditMode ? 'Chỉnh sửa Phiếu Nhập' : 'Lập Phiếu Nhập Hàng'}
              </h2>
              <p className="text-[12px] font-medium text-slate-500">
                Lưu trữ hàng hóa về vựa và cộng công nợ chủ hàng
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* THONG TIN CHUYEN XE & KHACH HANG */}
            <div className="lg:col-span-4 xl:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                  <UserCircle size={18} className="text-emerald-500" />
                  <span className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Thông tin Khách</span>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-700">Khách hàng / Chủ hàng <span className="text-red-500">*</span></label>
                    <SearchableSelect
                      options={(customers || []).map(c => ({ value: c.id, label: `${c.name} ${c.phone ? `(${c.phone})` : ''}` }))}
                      value={watchCustomerId}
                      onValueChange={(val) => setValue('customer_id', val, { shouldValidate: true })}
                      placeholder="Tìm khách hàng..."
                    />
                    {errors.customer_id && <p className="text-red-500 text-[11px] font-medium">{errors.customer_id.message as string}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-bold text-slate-700">Ngày</label>
                      <input type="date" {...register('order_date')} className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-bold text-slate-700">Giờ</label>
                      <input type="time" {...register('order_time')} className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-700">Nhân viên nhận</label>
                    <SearchableSelect
                      options={(employees || []).map(e => ({ value: e.id, label: e.full_name }))}
                      value={watchReceivedBy}
                      onValueChange={(val) => setValue('received_by', val, { shouldValidate: true })}
                      placeholder="Chọn NV..."
                    />
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                     <label className="text-[13px] font-bold text-slate-700">Trạng thái Tiền</label>
                     <div className="flex bg-slate-100 p-1 rounded-xl h-[38px] border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setValue('payment_status', 'unpaid', { shouldValidate: true })}
                          className={clsx(
                            'flex-1 flex items-center justify-center rounded-lg text-[11px] font-bold transition-all',
                            watchPaymentStatus === 'unpaid' ? 'bg-white shadow-sm text-red-500' : 'text-slate-500 hover:text-slate-700'
                          )}
                        >
                          Chưa trả
                        </button>
                        <button
                          type="button"
                          onClick={() => setValue('payment_status', 'paid', { shouldValidate: true })}
                          className={clsx(
                            'flex-1 flex items-center justify-center rounded-lg text-[11px] font-bold transition-all',
                            watchPaymentStatus === 'paid' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'
                          )}
                        >
                          Đã trả
                        </button>
                      </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                     <label className="text-[13px] font-bold text-slate-700">Ghi chú thêm</label>
                     <textarea rows={3} {...register('notes')} className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none" placeholder="Nhập ghi chú..." />
                  </div>
                </div>
              </div>
            </div>

            {/* BANG HANG HOA */}
            <div className="lg:col-span-8 xl:col-span-8 flex flex-col min-h-[500px]">
              <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col h-full overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-slate-50 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-emerald-500" />
                    <span className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Danh sách Nhập</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => append({ quantity: 1, package_type: '', product_id: '', unit_price: null })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[12px] font-bold hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-500/30 active:scale-95"
                  >
                    <Plus size={14} />
                    Thêm Dòng
                  </button>
                </div>
                
                <div className="flex-1 overflow-x-auto p-0">
                  <table className="w-full border-collapse">
                    <thead className="bg-white border-b border-border sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tên Mặt Hàng</th>
                        <th className="px-3 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">SL</th>
                        <th className="px-3 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28">Đơn vị</th>
                        <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-36">Đơn giá (VND)</th>
                        <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-36">Thành tiền</th>
                        <th className="px-3 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {fields.map((field, index) => {
                        const q = watch(`items.${index}.quantity`) || 0;
                        const p = watch(`items.${index}.unit_price`) || 0;
                        const rowTotal = q * p;
                        
                        return (
                          <tr key={field.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-4 py-2 relative">
                              <CreatableSearchableSelect
                                options={(products || []).map((p: any) => ({
                                  value: p.id,
                                  label: `[${p.sku}] ${p.name}`
                                }))}
                                value={watch(`items.${index}.product_id` as const)}
                                onValueChange={(val) => setValue(`items.${index}.product_id`, val, { shouldValidate: true })}
                                onCreate={(name) => handleCreateProduct(index, name)}
                                placeholder="Gõ tên hàng..."
                                className="h-9 border-slate-200 bg-white"
                              />
                               {(errors.items as any)?.[index]?.product_id && (
                                <span className="absolute bottom-0 left-4 text-[10px] text-red-500">Thiếu</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                {...register(`items.${index}.quantity` as const)}
                                className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-[13px] font-black text-center text-slate-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none tabular-nums transition-all"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <CreatableSearchableSelect
                                options={[
                                  { value: 'Két', label: 'Két' },
                                  { value: 'Bịch', label: 'Bịch' },
                                  { value: 'Thùng', label: 'Thùng' },
                                  { value: 'Hộp', label: 'Hộp' },
                                  { value: 'Bao', label: 'Bao' },
                                  { value: 'Kg', label: 'Kg' },
                                ]}
                                value={watch(`items.${index}.package_type` as const)}
                                onValueChange={(val) => setValue(`items.${index}.package_type`, val, { shouldValidate: true })}
                                onCreate={(val) => setValue(`items.${index}.package_type`, val, { shouldValidate: true })}
                                placeholder="VD: Két"
                                className="h-9 border-slate-200 bg-white"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Controller
                                name={`items.${index}.unit_price`}
                                control={control}
                                render={({ field }) => (
                                  <CurrencyInput
                                    {...field}
                                    value={field.value as number}
                                    onChange={field.onChange}
                                    className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-[13px] font-bold text-right text-slate-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none tabular-nums transition-all"
                                    placeholder="0"
                                  />
                                )}
                              />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <span className="text-[13px] font-black text-emerald-600 tabular-nums">
                                {new Intl.NumberFormat('vi-VN').format(rowTotal)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Xóa dòng"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Live Check Total */}
                <div className="p-5 bg-emerald-50/50 flex flex-col md:flex-row items-center justify-between border-t border-emerald-100 shrink-0">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-emerald-700 uppercase tracking-widest">Tổng tiền phiếu nhập</span>
                    <span className="text-[12px] text-emerald-600/70 font-medium">Được cộng vào Công Nợ của Khách</span>
                  </div>
                  <div className="text-3xl font-black text-emerald-600 tabular-nums drop-shadow-sm">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="bg-white border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-[13px] font-bold transition-all active:scale-95"
          >
            Đóng
          </button>
          <button
            onClick={handleSubmit(onSubmit, (err) => {
              console.error('Validation Error', err);
              toast.error('Thiếu thông tin bắt buộc (chữ đỏ) hoặc chưa điền Hàng hóa.');
            })}
            disabled={isSubmitting}
            className={clsx(
              'flex items-center gap-2 px-8 py-2.5 rounded-xl text-[13px] font-bold shadow-lg transition-all active:scale-95',
              isSubmitting
                ? 'bg-emerald-500/50 text-white/80 cursor-wait'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-emerald-500/25',
            )}
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 size={18} />
                {isEditMode ? 'Cập nhật Phiếu' : 'Chốt Phiếu Nhập'}
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
