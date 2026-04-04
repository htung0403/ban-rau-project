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
import { useUnits, useCreateUnit } from '../../../hooks/queries/useUnits';
import { useEmployees } from '../../../hooks/queries/useHR';
import type { ImportOrder, ImportOrderItem } from '../../../types';
import CurrencyInput from '../../../components/shared/CurrencyInput';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { CreatableSearchableSelect } from '../../../components/ui/CreatableSearchableSelect';
import { TimePicker24h } from '../../../components/shared/TimePicker24h';
import { DatePicker } from '../../../components/shared/DatePicker';
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
  total_amount: z.coerce.number().optional().nullable().catch(null),
});

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  editingOrder: ImportOrder | null;
  onClose: () => void;
  defaultCategory?: 'standard' | 'vegetable';
}

const AddEditImportOrderDialog: React.FC<Props> = ({ isOpen, isClosing, editingOrder, onClose, defaultCategory = 'standard' }) => {
  const isEditMode = !!editingOrder;
  const createMutation = useCreateImportOrder();
  const updateMutation = useUpdateImportOrder();
  const createProductMutation = useCreateProduct();
  const { data: products } = useProducts(isOpen);
  const { data: customers } = useCustomers(isOpen);
  const { data: employees } = useEmployees(isOpen);
  const { data: units } = useUnits(isOpen);
  const createUnitMutation = useCreateUnit();

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
      notes: '',
      total_amount: null,
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
        total_amount: editingOrder.is_custom_amount ? editingOrder.total_amount : null,
      });
    } else {
      reset({
        order_date: format(new Date(), 'yyyy-MM-dd'),
        order_time: new Date().toTimeString().slice(0, 5),
        items: [{ quantity: 1, package_type: '', product_id: '', unit_price: null }],
        payment_status: 'unpaid',
        customer_id: '',
        received_by: employees?.[0]?.id || '',
        notes: '',
        total_amount: null,
      });
    }
  }, [editingOrder, reset, employees, isOpen]);

  const watchItems = watch('items');
  const watchTotalAmountInput = watch('total_amount');
  const calculatedTotalAmount = (watchItems || []).reduce((sum: number, item: any) => {
    return sum + (Number(item.quantity || 0) * Number(item.unit_price || 0));
  }, 0);
  const displayTotalAmount = watchTotalAmountInput || calculatedTotalAmount;

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

  const handleCreateUnit = async (index: number, name: string) => {
    setValue(`items.${index}.package_type`, name, { shouldValidate: true });
    try {
      await createUnitMutation.mutateAsync(name);
    } catch {
      // Silently fail if exists or error
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
      payload.order_category = defaultCategory;

      if (!payload.total_amount) {
        payload.total_amount = calculatedTotalAmount;
        payload.is_custom_amount = false;
      } else {
        payload.is_custom_amount = payload.total_amount !== calculatedTotalAmount;
        // if user explicitly typed same number as calculated, we treat it as custom if input has value
        if (watchTotalAmountInput !== null && watchTotalAmountInput !== undefined) {
          payload.is_custom_amount = true;
        }
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
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
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
                  <UserCircle size={18} className="text-primary" />
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
                      <Controller
                        name="order_date"
                        control={control}
                        render={({ field }) => (
                          <DatePicker value={field.value as string} onChange={field.onChange} />
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-bold text-slate-700">Giờ</label>
                      <Controller
                        name="order_time"
                        control={control}
                        render={({ field }) => (
                          <TimePicker24h value={field.value as string} onChange={field.onChange} />
                        )}
                      />
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
                    <label className="text-[13px] font-bold text-slate-700">Tổng số tiền</label>
                    <Controller
                      name="total_amount"
                      control={control}
                      render={({ field }) => (
                        <CurrencyInput
                          {...field}
                          value={(field.value ?? calculatedTotalAmount) as number}
                          onChange={field.onChange}
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-primary tabular-nums"
                        />
                      )}
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
                          watchPaymentStatus === 'paid' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'
                        )}
                      >
                        Đã trả
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-[13px] font-bold text-slate-700">Ghi chú thêm</label>
                    <textarea rows={3} {...register('notes')} className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none" placeholder="Nhập ghi chú..." />
                  </div>
                </div>
              </div>
            </div>

            {/* BANG HANG HOA */}
            <div className="lg:col-span-8 xl:col-span-8 flex flex-col min-h-[500px]">
              <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col h-full overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-slate-50 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    <span className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Danh sách Nhập</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => append({ quantity: 1, package_type: '', product_id: '', unit_price: null })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-bold hover:bg-primary/90 transition-all shadow-sm shadow-primary/30 active:scale-95"
                  >
                    <Plus size={14} />
                    Thêm Dòng
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-0 bg-slate-50/30 md:bg-transparent custom-scrollbar">
                  <div className="md:min-w-[700px] w-full">
                    {/* Desktop Header */}
                    <div className="hidden md:grid grid-cols-[minmax(160px,3fr)_70px_120px_110px_130px_36px] gap-3 px-4 py-3 bg-white border-b border-border sticky top-0 z-10 md:items-center">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tên Mặt Hàng</div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SL</div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đơn vị</div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Đơn giá (VND)</div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Thành tiền</div>
                      <div></div>
                    </div>

                    {/* Items List */}
                    <div className="flex flex-col md:block md:divide-y md:divide-slate-100 p-3 md:p-0 gap-4 md:gap-0">
                      {fields.map((field, index) => {
                        const q = watch(`items.${index}.quantity`) || 0;
                        const p = watch(`items.${index}.unit_price`) || 0;
                        const rowTotal = q * p;

                        return (
                          <div key={field.id} className="grid grid-cols-1 md:grid-cols-[minmax(160px,3fr)_70px_120px_110px_130px_36px] gap-3 md:gap-3 p-4 md:px-4 md:py-2 md:items-center bg-white rounded-xl md:rounded-none border border-slate-200 md:border-none shadow-sm md:shadow-none hover:bg-slate-50/50 transition-all group relative">

                            {/* Mobile Delete Button (Absolute TR) */}
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="md:hidden absolute top-2 right-2 p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all z-10"
                              title="Xóa dòng"
                            >
                              <Trash2 size={16} />
                            </button>

                            {/* 1. Tên Mặt Hàng */}
                            <div className="flex flex-col justify-center space-y-1.5 md:space-y-0 relative">
                              <label className="text-[11px] font-bold text-slate-500 md:hidden uppercase">Mặt hàng</label>
                              <CreatableSearchableSelect
                                options={(products || []).map((p: any) => ({
                                  value: p.id,
                                  label: p.name
                                }))}
                                value={watch(`items.${index}.product_id` as const)}
                                onValueChange={(val) => setValue(`items.${index}.product_id`, val, { shouldValidate: true })}
                                onCreate={(name) => handleCreateProduct(index, name)}
                                placeholder="Gõ tên hàng..."
                                className="h-9 border-slate-200 bg-white"
                              />
                              {(errors.items as any)?.[index]?.product_id && (
                                <span className="md:absolute md:bottom-[-16px] md:left-2 text-[10px] text-red-500">Thiếu</span>
                              )}
                            </div>

                            <div className="grid grid-cols-3 md:contents gap-3">
                              {/* 2. Số lượng */}
                              <div className="flex flex-col justify-center space-y-1.5 md:space-y-0 col-span-1">
                                <label className="text-[11px] font-bold text-slate-500 md:hidden uppercase">SL</label>
                                <input
                                  type="number"
                                  {...register(`items.${index}.quantity` as const)}
                                  className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-[13px] font-black text-center text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary/50 focus:outline-none tabular-nums transition-all"
                                />
                              </div>

                              {/* 3. Đơn vị */}
                              <div className="flex flex-col justify-center space-y-1.5 md:space-y-0 col-span-2 md:col-span-1">
                                <label className="text-[11px] font-bold text-slate-500 md:hidden uppercase">Đơn vị</label>
                                <CreatableSearchableSelect
                                  options={(units || []).map((u: any) => ({ value: u.name, label: u.name }))}
                                  value={watch(`items.${index}.package_type` as const)}
                                  onValueChange={(val) => setValue(`items.${index}.package_type`, val, { shouldValidate: true })}
                                  onCreate={(val) => handleCreateUnit(index, val)}
                                  placeholder="VD: Két"
                                  className="h-9 border-slate-200 bg-white"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:contents gap-3 border-t border-dashed border-slate-200 md:border-none pt-3 md:pt-0 mt-1 md:mt-0">
                              {/* 4. Đơn giá */}
                              <div className="flex flex-col justify-center space-y-1.5 md:space-y-0">
                                <label className="text-[11px] font-bold text-slate-500 md:hidden uppercase">Đơn giá (VND)</label>
                                <Controller
                                  name={`items.${index}.unit_price`}
                                  control={control}
                                  render={({ field }) => (
                                    <CurrencyInput
                                      {...field}
                                      value={field.value as number}
                                      onChange={field.onChange}
                                      className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-[13px] font-bold text-right text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary/50 focus:outline-none tabular-nums transition-all"
                                      placeholder="0"
                                    />
                                  )}
                                />
                              </div>

                              {/* 5. Thành tiền */}
                              <div className="flex flex-col justify-center space-y-1.5 md:space-y-0 md:text-right">
                                <label className="text-[11px] font-bold text-slate-500 md:hidden uppercase">Thành tiền</label>
                                <div className="h-9 flex items-center md:justify-end bg-slate-50 md:bg-transparent rounded-lg px-3 md:px-0 border border-slate-200 md:border-none">
                                  <span className="text-[14px] md:text-[13px] font-black text-primary/90 tabular-nums">
                                    {new Intl.NumberFormat('vi-VN').format(rowTotal)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Desktop Delete Button */}
                            <div className="hidden md:flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Xóa dòng"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Live Check Total */}
                <div className="p-5 bg-primary/5 flex flex-col md:flex-row items-center justify-between border-t border-primary/10 shrink-0">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-primary uppercase tracking-widest">Tổng tiền phiếu nhập</span>
                    <span className="text-[12px] text-primary/70 font-medium">Được cộng vào Công Nợ của Khách</span>
                  </div>
                  <div className="text-3xl font-black text-primary tabular-nums drop-shadow-sm">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(displayTotalAmount)}
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
                ? 'bg-primary/50 text-white/80 cursor-wait'
                : 'bg-primary text-white hover:bg-primary/90 hover:shadow-primary/25',
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
