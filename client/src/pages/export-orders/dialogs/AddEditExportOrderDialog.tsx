import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, User, DollarSign, Plus, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useCreateExportOrder } from '../../../hooks/queries/useExportOrders';
import { useCustomers } from '../../../hooks/queries/useCustomers';
import { useProducts } from '../../../hooks/queries/useProducts';
import { useWarehouses } from '../../../hooks/queries/useWarehouses';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import CurrencyInput from '../../../components/shared/CurrencyInput';

const exportOrderSchema = z.object({
  export_date: z.string().min(1, 'Ngày xuất không được để trống'),
  product_id: z.string().min(1, 'Vui lòng chọn hàng hóa'),
  warehouse_id: z.string().min(1, 'Vui lòng chọn kho xuất'),
  quantity: z.coerce.number().min(1, 'Số lượng phải lớn hơn 0'),
  customer_id: z.string().min(1, 'Vui lòng chọn khách hàng'),
  debt_amount: z.coerce.number().min(0, 'Công nợ không được âm'),
});

type ExportOrderFormData = z.infer<typeof exportOrderSchema>;

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
}

const AddEditExportOrderDialog: React.FC<Props> = ({ isOpen, isClosing, onClose }) => {
  const createMutation = useCreateExportOrder();
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();
  const { data: warehouses } = useWarehouses();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExportOrderFormData>({
    resolver: zodResolver(exportOrderSchema) as any,
    defaultValues: {
      export_date: format(new Date(), 'yyyy-MM-dd'),
      product_id: '',
      warehouse_id: '',
      quantity: 1,
      customer_id: '',
      debt_amount: 0,
    },
  });

  const customerId = watch('customer_id');

  useEffect(() => {
    if (isOpen) {
      reset({
        export_date: format(new Date(), 'yyyy-MM-dd'),
        product_id: '',
        warehouse_id: '',
        quantity: 1,
        customer_id: '',
        debt_amount: 0,
      });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: ExportOrderFormData) => {
    try {
      const payload = {
        export_date: data.export_date,
        product_id: data.product_id,
        warehouse_id: data.warehouse_id,
        quantity: Number(data.quantity),
        customer_id: data.customer_id,
        debt_amount: Number(data.debt_amount),
        payment_status: 'unpaid' as const,
        paid_amount: 0,
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
          'relative w-full max-w-[600px] bg-[#f8fafc] shadow-2xl flex flex-col h-screen border-l border-border',
          isClosing ? 'dialog-slide-out' : 'dialog-slide-in',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Package size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">Thêm phiếu xuất</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form id="export-order-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* THÔNG TIN CHUNG */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Package size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Thông tin chung</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[13px] font-bold text-foreground">Ngày xuất <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="date"
                    {...register('export_date')}
                    className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  />
                  {errors.export_date && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.export_date.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[13px] font-bold text-foreground">Hàng xuất <span className="text-red-500">*</span></label>
                <select {...register('product_id')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-bold">
                  <option value="">Chọn hàng hóa...</option>
                  {(products || []).map((p: any) => (
                    <option key={p.id} value={p.id}>[{p.sku}] {p.name} ({p.unit})</option>
                  ))}
                </select>
                {errors.product_id && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.product_id.message}</p>}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[13px] font-bold text-foreground">Kho xuất <span className="text-red-500">*</span></label>
                <select {...register('warehouse_id')} className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all">
                  <option value="">Chọn kho xuất...</option>
                  {(warehouses || []).map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                {errors.warehouse_id && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.warehouse_id.message}</p>}
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[13px] font-bold text-foreground">Số lượng <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    {...register('quantity')}
                    className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  />
                  {errors.quantity && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.quantity.message}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* KHÁCH HÀNG & CÔNG NỢ */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <User size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Khách hàng & Công nợ</span>
            </div>
            <div className="p-5 grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Khách hàng <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={(customers || []).map(c => ({ value: c.id, label: `${c.name} ${c.phone ? `(${c.phone})` : ''}` }))}
                  value={customerId}
                  onValueChange={(val) => setValue('customer_id', val, { shouldValidate: true })}
                  placeholder="Chọn khách hàng..."
                />
                {errors.customer_id && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.customer_id.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-foreground">Ghi nợ hiện tại (VNĐ)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
                  <Controller
                    name="debt_amount"
                    control={control}
                    render={({ field }) => (
                      <CurrencyInput
                        {...field}
                        value={field.value as number | undefined}
                        onChange={field.onChange}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                      />
                    )}
                  />
                  {errors.debt_amount && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.debt_amount.message}</p>}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Sẽ tự động cộng dồn vào tổng công nợ của khách hàng này</p>
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
            form="export-order-form"
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

export default AddEditExportOrderDialog;
