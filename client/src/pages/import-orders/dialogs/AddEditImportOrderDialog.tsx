import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, Plus, Trash2, CheckCircle2, FileText, UserCircle, ImagePlus, Loader2 } from 'lucide-react';
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
import { uploadApi } from '../../../api/uploadApi';
import CurrencyInput from '../../../components/shared/CurrencyInput';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { CreatableSearchableSelect } from '../../../components/ui/CreatableSearchableSelect';
import { TimePicker24h } from '../../../components/shared/TimePicker24h';
import { DatePicker } from '../../../components/shared/DatePicker';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

const importOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Chọn hàng hóa'),
  package_type: z.string().optional().nullable().catch(null),
  weight_kg: z.coerce.number().optional().nullable().catch(null),
  quantity: z.coerce.number().min(1, 'SL > 0').catch(1),
  image_url: z.string().optional().nullable().catch(null),
});

const importOrderSchema = z.object({
  order_date: z.string().min(1, 'Vui lòng chọn ngày'),
  order_time: z.string().min(1, 'Vui lòng nhập giờ'),
  received_by: z.string().min(1, 'Vui lòng chọn nhân viên'),
  customer_id: z.string().min(1, 'Vui lòng chọn Khách hàng / Chủ hàng'),
  receiver_name: z.string().optional(),
  notes: z.string().optional(),
  payment_status: z.enum(['paid', 'unpaid']).default('unpaid'),
  items: z.array(importOrderItemSchema).min(1, 'Vui lòng thêm ít nhất 1 mặt hàng'),
  total_amount: z.coerce.number().min(0, 'Tổng tiền không hợp lệ').catch(0),
  receipt_image_url: z.string().optional().nullable().catch(null),
});

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  editingOrder: ImportOrder | null;
  onClose: () => void;
  defaultCategory?: 'standard' | 'vegetable';
}

const AddEditImportOrderDialog: React.FC<Props> = ({ isOpen, isClosing, editingOrder, onClose, defaultCategory = 'standard' }) => {
  const { user } = useAuth();
  const isEditMode = !!editingOrder;
  const createMutation = useCreateImportOrder();
  const updateMutation = useUpdateImportOrder();
  const createProductMutation = useCreateProduct();
  const { data: products } = useProducts(isOpen);
  const { data: customers } = useCustomers(undefined, isOpen);
  const { data: employees } = useEmployees(isOpen);

  const filteredProducts = React.useMemo(() => {
    const list = products?.filter((p: any) => p.category === defaultCategory || (!p.category && defaultCategory === 'standard')) || [];
    if (editingOrder?.import_order_items) {
      const addedIds = new Set(list.map((p: any) => p.id));
      editingOrder.import_order_items.forEach((item: any) => {
        if (item.products && !addedIds.has(item.product_id)) {
          list.push(item.products);
          addedIds.add(item.product_id);
        }
      });
    }
    return list;
  }, [products, defaultCategory, editingOrder]);

  const filteredCustomers = React.useMemo(() => {
    const list: any[] = customers?.filter((c: any) =>
      defaultCategory === 'vegetable'
        ? (c.customer_type === 'wholesale' || c.customer_type === 'vegetable')
        : c.customer_type === 'grocery'
    ) || [];
    
    if (editingOrder?.customers && !list.find((c: any) => c.id === editingOrder.customer_id)) {
      list.push(editingOrder.customers);
    }
    return list;
  }, [customers, defaultCategory, editingOrder]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(importOrderSchema),
    defaultValues: {
      order_date: format(new Date(), 'yyyy-MM-dd'),
      order_time: new Date().toTimeString().slice(0, 5),
      items: [{ quantity: 1, weight_kg: '', product_id: '', image_url: null }],
      payment_status: 'unpaid',
      customer_id: '',
      received_by: '',
      notes: '',
      total_amount: 0,
      receipt_image_url: null,
    } as any,
  });

  const watchItems = watch('items');

  useEffect(() => {
    if (!watchItems || !filteredProducts.length) return;
    let sum = 0;
    watchItems.forEach((item: any) => {
      const product = filteredProducts.find((p: any) => p.id === item.product_id);
      if (product && product.base_price) {
        const kg = Number(item.weight_kg) || 0;
        const qty = Number(item.quantity) || 0;
        const amount = Math.round((qty * kg / 1000) * product.base_price);
        sum += amount;
      }
    });

    if (sum > 0) {
      setValue('total_amount', sum, { shouldValidate: true });
    }
  }, [JSON.stringify(watchItems), filteredProducts, defaultCategory, setValue]);

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
        receiver_name: editingOrder.receiver_name || '',
        notes: editingOrder.notes || '',
        items: editingOrder.import_order_items?.map((item: ImportOrderItem) => ({
          product_id: item.product_id,
          package_type: item.package_type,
          weight_kg: item.weight_kg,
          quantity: item.quantity,
          image_url: item.image_url || null,
        })) || [],
        payment_status: editingOrder.import_order_items?.[0]?.payment_status || 'unpaid',
        total_amount: editingOrder.total_amount || 0,
        receipt_image_url: editingOrder.receipt_image_url || null,
      });
    } else {
      reset({
        order_date: format(new Date(), 'yyyy-MM-dd'),
        order_time: new Date().toTimeString().slice(0, 5),
        items: [{ quantity: 1, weight_kg: '', product_id: '', image_url: null }],
        payment_status: 'unpaid',
        customer_id: '',
        receiver_name: '',
        received_by: user?.id || employees?.[0]?.id || '',
        notes: '',
        total_amount: 0,
        receipt_image_url: null,
      });
    }
  }, [editingOrder, reset, employees, isOpen, user?.id]);

  const watchTotalAmountInput = watch('total_amount');
  const watchReceiptImageUrl = watch('receipt_image_url');
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadingItemIndex, setUploadingItemIndex] = React.useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ hỗ trợ file ảnh');
      return;
    }

    try {
      setIsUploading(true);
      const resp = await uploadApi.uploadFile(file, 'import-orders', 'orders');
      setValue('receipt_image_url', resp.url, { shouldValidate: true });
      toast.success('Tải ảnh lên thành công!');
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Lỗi khi tải ảnh lên');
    } finally {
      setIsUploading(false);
    }
  };

  const handleItemImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ hỗ trợ file ảnh');
      return;
    }

    try {
      setUploadingItemIndex(index);
      const resp = await uploadApi.uploadFile(file, 'import-orders', 'items');
      setValue(`items.${index}.image_url`, resp.url, { shouldValidate: true });

      // Tự động gán ảnh lên phần phiếu báo cáo chung nếu đang trống
      if (!getValues('receipt_image_url')) {
        setValue('receipt_image_url', resp.url, { shouldValidate: true });
      }

      toast.success('Tải ảnh thành công!');
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Lỗi tải ảnh');
    } finally {
      setUploadingItemIndex(null);
    }
  };

  const handleCreateProduct = async (index: number, name: string) => {
    setValue(`items.${index}.product_id`, name);
    try {
      const resp = await createProductMutation.mutateAsync({
        name,
        category: defaultCategory,
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
      payload.order_category = defaultCategory;

      // Always treat as explicit amount
      payload.is_custom_amount = true;

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
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white border-b border-border z-10 shadow-sm relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-800 text-balance pr-6">
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
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-6 space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

            {/* THONG TIN CHUYEN XE & KHACH HANG */}
            <div className="lg:col-span-4 xl:col-span-4 space-y-4 md:space-y-6">
              <div className="bg-white rounded-2xl border border-border shadow-sm p-4 md:p-5 space-y-3 md:space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                  <UserCircle size={18} className="text-primary" />
                  <span className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Thông tin Khách</span>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-700">
                      {defaultCategory === 'vegetable' ? 'Vựa rau / KH Rau' : 'Tạp hóa'} <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={filteredCustomers.map((c: any) => ({ value: c.id, label: `${c.name} ${c.phone ? `(${c.phone})` : ''}` }))}
                      value={watchCustomerId}
                      onValueChange={(val) => setValue('customer_id', val, { shouldValidate: true })}
                      placeholder={defaultCategory === 'vegetable' ? 'Tìm vựa rau hoặc KH Rau...' : 'Tìm tạp hóa...'}
                    />
                    {errors.customer_id && <p className="text-red-500 text-[11px] font-medium">{errors.customer_id.message as string}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-700">Người nhận hàng</label>
                    <input
                      type="text"
                      {...register('receiver_name')}
                      className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      placeholder="Nhập tên người nhận..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:gap-3">
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
                    <label className="text-[13px] font-bold text-slate-700">Trạng thái Tiền</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl h-[38px] border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setValue('payment_status', 'unpaid', { shouldValidate: true });
                          setValue('total_amount', 0, { shouldValidate: true });
                        }}
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

                  {watchPaymentStatus === 'paid' && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-1">
                      <label className="text-[13px] font-bold text-slate-700">Tổng số tiền</label>
                      <Controller
                        name="total_amount"
                        control={control}
                        render={({ field }) => (
                          <CurrencyInput
                            {...field}
                            value={field.value as number}
                            onChange={field.onChange}
                            className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-primary tabular-nums"
                            placeholder="Nhập tổng tiền..."
                          />
                        )}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 pt-2">
                    <label className="text-[13px] font-bold text-slate-700">Ảnh biên nhận / Sản phẩm</label>
                    <div className="flex flex-col gap-2">
                      {watchReceiptImageUrl ? (
                        <div className="relative inline-block w-24 h-24 rounded-xl border border-slate-200 overflow-hidden group">
                          <img src={watchReceiptImageUrl} alt="Receipt" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setValue('receipt_image_url', null, { shouldValidate: true })}
                            className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleImageUpload}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50 disabled:opacity-50"
                          >
                            {isUploading ? (
                              <Loader2 size={20} className="animate-spin text-primary" />
                            ) : (
                              <>
                                <Plus size={20} className="mb-1" />
                                <span className="text-[11px] font-medium">Tải ảnh</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
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
                <div className="px-4 md:px-5 py-3 border-b border-border bg-slate-50 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    <span className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Danh sách Nhập</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => append({ quantity: 1, weight_kg: '', product_id: '', image_url: null })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-bold hover:bg-primary/90 transition-all shadow-sm shadow-primary/30 active:scale-95"
                  >
                    <Plus size={14} />
                    Thêm Dòng
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-0 bg-slate-50/30 md:bg-transparent custom-scrollbar">
                  <div className="md:min-w-[750px] w-full">
                    {/* Desktop Header */}
                    <div className="hidden md:grid grid-cols-[minmax(150px,3fr)_70px_70px_100px_36px_36px] gap-3 px-4 py-3 bg-white border-b border-border sticky top-0 z-10 md:items-center">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tên Mặt Hàng</div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Số Kg</div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SL</div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Thành tiền</div>
                      <div></div>
                      <div></div>
                    </div>

                    {/* Items List */}
                    <div className="flex flex-col md:block md:divide-y md:divide-slate-100 p-2 md:p-0 gap-3 md:gap-0">
                      {fields.map((field, index) => {
                        return (
                          <div key={field.id} className="grid grid-cols-1 md:grid-cols-[minmax(150px,3fr)_70px_70px_100px_36px_36px] gap-2 md:gap-3 p-3 md:px-4 md:py-2 md:items-center bg-white rounded-xl md:rounded-none border border-slate-200 md:border-none shadow-sm md:shadow-none hover:bg-slate-50/50 transition-all group relative">

                            {/* 1. Tên Mặt Hàng & Nút xoá (Mobile) */}
                            <div className="flex items-end gap-2 md:contents">
                              <div className="flex-1 flex flex-col justify-center space-y-1 md:space-y-0 relative">
                                <label className="text-[11px] font-bold text-slate-500 md:hidden uppercase">Mặt hàng</label>
                                <CreatableSearchableSelect
                                  options={filteredProducts.map((p: any) => ({
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

                              {/* Mobile Image Button */}
                              <div className="md:hidden shrink-0 mt-auto">
                                <div className="relative w-9 h-9">
                                  {watch(`items.${index}.image_url`) ? (
                                    <div className="relative w-full h-full rounded-xl border border-slate-200 overflow-hidden group/img">
                                      <img src={watch(`items.${index}.image_url`)} alt="item" className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => setValue(`items.${index}.image_url`, null, { shouldValidate: true })}
                                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="w-9 h-9 border border-slate-200 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/50 cursor-pointer transition-all">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleItemImageUpload(index, e)}
                                      />
                                      {uploadingItemIndex === index ? <Loader2 size={16} className="animate-spin text-primary" /> : <ImagePlus size={16} />}
                                    </label>
                                  )}
                                </div>
                              </div>

                              {/* Mobile Delete Button */}
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="md:hidden shrink-0 h-9 w-9 mt-auto flex items-center justify-center text-red-500 hover:bg-red-100 hover:text-red-600 rounded-xl transition-all bg-red-50/50 border border-red-100 hover:border-red-200"
                                title="Xóa dòng"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 md:contents gap-2 md:gap-3 border-t border-dashed border-slate-200 md:border-none pt-2 md:pt-0 mt-2 md:mt-0">
                              {/* 2. Số Kg */}
                              <div className="flex flex-col justify-center space-y-1 md:space-y-0 col-span-1">
                                <label className="text-[11px] font-bold text-slate-500 md:hidden uppercase">Số Kg</label>
                                <input
                                  type="number"
                                  placeholder="VD: 5"
                                  {...register(`items.${index}.weight_kg` as const)}
                                  className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-center text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary/50 focus:outline-none tabular-nums transition-all"
                                />
                              </div>

                              {/* 3. Số lượng */}
                              <div className="flex flex-col justify-center space-y-1 md:space-y-0 col-span-1">
                                <label className="text-[11px] font-bold text-slate-500 md:hidden uppercase">SL</label>
                                <input
                                  type="number"
                                  {...register(`items.${index}.quantity` as const)}
                                  className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-[13px] font-black text-center text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary/50 focus:outline-none tabular-nums transition-all"
                                />
                              </div>

                              {/* 4. Thành tiền */}
                              <div className="flex flex-col justify-center space-y-1 md:space-y-0 col-span-2 md:col-span-1 md:text-right">
                                {(() => {
                                  const productId = watch(`items.${index}.product_id`);
                                  const kg = Number(watch(`items.${index}.weight_kg`) || 0);
                                  const qty = Number(watch(`items.${index}.quantity`) || 0);
                                  const prod = filteredProducts.find((p: any) => p.id === productId);
                                  const price = prod?.base_price || 0;
                                  const total = Math.round((qty * kg / 1000) * price);
                                  return (
                                    <>
                                      <label className="text-[11px] font-bold text-slate-500 md:hidden uppercase flex justify-between items-center pr-2">
                                        <span>Thành tiền</span>
                                        {price > 0 && <span className="text-[9px] text-slate-400 normal-case">(Cước: {new Intl.NumberFormat('vi-VN').format(price)}/Tấn)</span>}
                                      </label>
                                      <span className="text-[13px] font-bold text-primary tabular-nums h-9 md:h-auto flex items-center md:justify-end bg-slate-50 md:bg-transparent px-3 md:px-0 rounded-lg border border-slate-200 md:border-transparent">
                                        {total > 0 ? new Intl.NumberFormat('vi-VN').format(total) : '-'}
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Desktop Image Button */}
                            <div className="hidden md:flex items-center justify-center w-full">
                              <div className="relative w-[36px] h-[36px]">
                                {watch(`items.${index}.image_url`) ? (
                                  <div className="relative w-full h-full rounded-lg border border-slate-200 overflow-hidden group/imgDesk">
                                    <img src={watch(`items.${index}.image_url`)} alt="item" className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => setValue(`items.${index}.image_url`, null, { shouldValidate: true })}
                                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/imgDesk:opacity-100 transition-opacity"
                                      title="Xoá ảnh"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <label className="w-[36px] h-[36px] border border-slate-200 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/50 cursor-pointer transition-all" title="Tải ảnh">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleItemImageUpload(index, e)}
                                    />
                                    {uploadingItemIndex === index ? <Loader2 size={16} className="animate-spin text-primary" /> : <ImagePlus size={16} />}
                                  </label>
                                )}
                              </div>
                            </div>

                            {/* Desktop Delete Button */}
                            <div className="hidden md:flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
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
                <div className="p-4 md:p-5 bg-primary/5 flex flex-col md:flex-row items-center justify-between border-t border-primary/10 shrink-0 gap-1 md:gap-0">
                  <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-[12px] font-bold text-primary uppercase tracking-widest">Tổng tiền phiếu nhập</span>
                    <span className="text-[12px] text-primary/70 font-medium">Được cộng vào Công Nợ của Khách</span>
                  </div>
                  <div className="text-3xl font-black text-primary tabular-nums drop-shadow-sm">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(watchTotalAmountInput || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="bg-white border-t border-border px-4 md:px-6 py-3 md:py-4 flex items-center justify-between shrink-0">
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
