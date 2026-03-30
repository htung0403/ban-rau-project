import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Box, Tag, Layers, BarChart, Plus, ChevronRight, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateProduct, useUpdateProduct } from '../../../hooks/queries/useProducts';

const productSchema = z.object({
  sku: z.string().min(2, 'Mã hàng phải từ 2 ký tự'),
  name: z.string().min(2, 'Tên hàng phải từ 2 ký tự'),
  unit: z.string().min(1, 'Vui lòng nhập đơn vị tính'),
  category: z.string().optional(),
  base_price: z.coerce.number().min(0, 'Giá không được âm').optional(),
  description: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  product?: any; // If provided, we are in edit mode
}

const AddEditProductDialog: React.FC<Props> = ({ isOpen, isClosing, onClose, product }) => {
  const isEdit = !!product;
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      sku: '',
      name: '',
      unit: '',
      category: '',
      base_price: 0,
      description: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (product) {
        reset({
          sku: product.sku || '',
          name: product.name || '',
          unit: product.unit || '',
          category: product.category || '',
          base_price: product.base_price || 0,
          description: product.description || '',
        });
      } else {
        reset({
          sku: '',
          name: '',
          unit: '',
          category: '',
          base_price: 0,
          description: '',
        });
      }
    }
  }, [isOpen, product, reset]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: product.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!isOpen && !isClosing) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;

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
              <Box size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {isEdit ? 'Cập nhật hàng hóa' : 'Thêm hàng hóa mới'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/5 flex items-center gap-2">
              <Tag size={16} className="text-primary" />
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">Thông tin hàng hóa</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[13px] font-bold text-foreground">Mã hàng (SKU) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  {...register('sku')}
                  placeholder="VD: SP-001"
                  className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                />
                {errors.sku && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.sku.message}</p>}
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[13px] font-bold text-foreground">Đơn vị tính <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  {...register('unit')}
                  placeholder="VD: kg, thùng, bao"
                  className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                />
                {errors.unit && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.unit.message}</p>}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[13px] font-bold text-foreground">Tên hàng hóa <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="VD: Gạo sạch ST25"
                  className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                />
                {errors.name && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[13px] font-bold text-foreground">Phân loại</label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
                  <input
                    type="text"
                    {...register('category')}
                    placeholder="VD: Lương thực"
                    className="w-full pl-10 pr-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[13px] font-bold text-foreground">Giá cơ sở</label>
                <div className="relative">
                  <BarChart className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
                  <input
                    type="number"
                    {...register('base_price')}
                    placeholder="VD: 25000"
                    className="w-full pl-10 pr-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[13px] font-bold text-foreground">Ghi chú / Mô tả</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Thông tin thêm về sản phẩm..."
                  className="w-full px-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none"
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
            form="product-form"
            disabled={isPending}
            className={clsx(
              "flex items-center gap-2 px-8 py-2 rounded-xl text-[13px] font-bold shadow-lg transition-all group",
              isPending 
                ? "bg-primary/50 text-white/60 cursor-wait" 
                : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
            )}
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isEdit ? (
              <Save size={18} />
            ) : (
              <Plus size={18} />
            )}
            {isEdit ? 'Lưu thay đổi' : 'Thêm mới'}
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddEditProductDialog;
