import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PageHeader from '../../components/shared/PageHeader';
import { useProducts, useCreateProduct, useDeleteProduct } from '../../hooks/queries/useProducts';
import { useUnits, useCreateUnit, useDeleteUnit } from '../../hooks/queries/useUnits';
import { Database, Box, Scale, Plus, X, Trash2 } from 'lucide-react';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import ErrorState from '../../components/shared/ErrorState';

const InputDialog: React.FC<{
  isOpen: boolean;
  title: string;
  placeholder: string;
  onClose: () => void;
  onSubmit: (val: string) => void;
  isSubmitting?: boolean;
}> = ({ isOpen, title, placeholder, onClose, onSubmit, isSubmitting }) => {
  const [val, setVal] = useState('');

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-slate-50">
          <h2 className="text-[15px] font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <input 
            type="text"
            autoFocus
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 bg-white border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-slate-700"
            onKeyDown={e => {
              if (e.key === 'Enter' && val.trim() && !isSubmitting) {
                onSubmit(val.trim());
                setVal('');
              }
            }}
          />
        </div>
        <div className="px-5 py-4 border-t border-border bg-slate-50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-200 transition-colors">
            Hủy
          </button>
          <button 
            disabled={!val.trim() || isSubmitting}
            onClick={() => {
              if (val.trim()) {
                onSubmit(val.trim());
                setVal('');
              }
            }} 
            className="px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 shadow-sm bg-primary text-white hover:bg-primary/90 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Xác nhận
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ConfirmDialog: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, title, message, isLoading, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={isLoading ? undefined : onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-slate-50">
          <h2 className="text-[15px] font-bold text-slate-800">{title}</h2>
          <button onClick={isLoading ? undefined : onCancel} className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-full transition-colors disabled:opacity-50">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-[13px] text-slate-700">{message}</p>
        </div>
        <div className="px-5 py-4 border-t border-border bg-slate-50 flex items-center justify-end gap-3">
          <button 
            disabled={isLoading}
            onClick={onCancel} 
            className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button 
            disabled={isLoading}
            onClick={onConfirm} 
            className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-[13px] font-bold hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {isLoading && <span className="w-4 h-4 border-2 border-red-500/30 border-t-red-600 rounded-full animate-spin" />}
            Xác nhận
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const WarehouseSettingsPage: React.FC = () => {
  const { data: products, isLoading: isProductsLoading, isError: isProductsError, refetch: refetchProducts } = useProducts();
  const { data: units, isLoading: isUnitsLoading, isError: isUnitsError, refetch: refetchUnits } = useUnits();
  
  const createProduct = useCreateProduct();
  const createUnit = useCreateUnit();
  const deleteProduct = useDeleteProduct();
  const deleteUnit = useDeleteUnit();

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: 'products' | 'units' }>({ isOpen: false, type: 'products' });

  const handleAddProduct = async (name: string) => {
    await createProduct.mutateAsync({ name });
    setProductDialogOpen(false);
  };

  const handleAddUnit = async (name: string) => {
    await createUnit.mutateAsync(name);
    setUnitDialogOpen(false);
  };

  const handleToggleProduct = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleToggleUnit = (id: string) => {
    setSelectedUnits(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleDeleteProducts = () => {
    setDeleteConfirm({ isOpen: true, type: 'products' });
  };

  const handleDeleteUnits = () => {
    setDeleteConfirm({ isOpen: true, type: 'units' });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (deleteConfirm.type === 'products') {
        await Promise.all(selectedProducts.map(id => deleteProduct.mutateAsync(id)));
        setSelectedProducts([]);
      } else {
        await Promise.all(selectedUnits.map(id => deleteUnit.mutateAsync(id)));
        setSelectedUnits([]);
      }
      setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    } catch {
      // Error is handled in the mutation
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = isProductsLoading || isUnitsLoading;
  const isError = isProductsError || isUnitsError;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0 pb-6">
      <PageHeader
        title="Cài đặt hàng hóa"
        description="Xem danh sách dữ liệu từ điển hàng hóa và đơn vị tính hiện có trong hệ thống"
        backPath="/hang-hoa"
        actions={<div />}
      />

      {isLoading ? (
        <LoadingSkeleton type="table" rows={3} />
      ) : isError ? (
        <ErrorState onRetry={() => {
          refetchProducts();
          refetchUnits();
        }} />
      ) : (
        <div className="bg-card rounded-2xl border border-border shadow-sm flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
            <Database size={18} className="text-primary" />
            <h2 className="text-[14px] font-bold text-foreground">Dữ liệu hệ thống ({products?.length || 0} Sản phẩm, {units?.length || 0} Đơn vị)</h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto custom-scrollbar">
            {/* Products Data */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2">
                  <Box size={16} className="text-blue-500" />
                  Dữ liệu Hàng hóa
                </h3>
                <div className="flex items-center gap-2">
                  {selectedProducts.length > 0 && (
                    <button 
                      onClick={handleDeleteProducts}
                      disabled={isDeleting}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-[12px] font-bold disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Xóa ({selectedProducts.length})
                    </button>
                  )}
                  <button 
                    onClick={() => setProductDialogOpen(true)}
                    className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                    title="Thêm hàng hóa"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {products?.map((p: any) => {
                  const isSelected = selectedProducts.includes(p.id);
                  return (
                    <button 
                      key={p.id}
                      onClick={() => handleToggleProduct(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-[13px] border font-medium whitespace-nowrap transition-all ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20' 
                          : 'bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20'
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
                {(!products || products.length === 0) && (
                  <span className="text-[13px] text-muted-foreground italic">Chưa có sản phẩm nào.</span>
                )}
              </div>
            </div>

            {/* Units Data */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2">
                  <Scale size={16} className="text-emerald-500" />
                  Dữ liệu Đơn vị tính
                </h3>
                <div className="flex items-center gap-2">
                  {selectedUnits.length > 0 && (
                    <button 
                      onClick={handleDeleteUnits}
                      disabled={isDeleting}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-[12px] font-bold disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Xóa ({selectedUnits.length})
                    </button>
                  )}
                  <button 
                    onClick={() => setUnitDialogOpen(true)}
                    className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                    title="Thêm đơn vị tính"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {units?.map((u: any) => {
                  const isSelected = selectedUnits.includes(u.id);
                  return (
                    <button 
                      key={u.id}
                      onClick={() => handleToggleUnit(u.id)}
                      className={`px-3 py-1.5 rounded-lg text-[13px] border font-medium whitespace-nowrap transition-all ${
                        isSelected 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20' 
                          : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                    >
                      {u.name}
                    </button>
                  );
                })}
                {(!units || units.length === 0) && (
                  <span className="text-[13px] text-muted-foreground italic">Chưa có đơn vị tính nào.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <InputDialog
        isOpen={productDialogOpen}
        title="Thêm Hàng Hóa Mới"
        placeholder="VD: Cà chua Đài Loan"
        onClose={() => setProductDialogOpen(false)}
        onSubmit={handleAddProduct}
        isSubmitting={createProduct.isPending}
      />
      
      <InputDialog
        isOpen={unitDialogOpen}
        title="Thêm Đơn Vị Tính"
        placeholder="VD: Két"
        onClose={() => setUnitDialogOpen(false)}
        onSubmit={handleAddUnit}
        isSubmitting={createUnit.isPending}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.type === 'products' ? "Xóa Hàng Hóa" : "Xóa Đơn Vị Tính"}
        message={deleteConfirm.type === 'products' 
          ? `Bạn có chắc chắn muốn xóa ${selectedProducts.length} hàng hóa đã chọn? Thao tác này không thể hoàn tác.`
          : `Bạn có chắc chắn muốn xóa ${selectedUnits.length} đơn vị tính đã chọn? Thao tác này không thể hoàn tác.`
        }
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default WarehouseSettingsPage;
