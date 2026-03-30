import React, { useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useProducts, useDeleteProduct } from '../../hooks/queries/useProducts';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import AddEditProductDialog from './dialogs/AddEditProductDialog';

const formatCurrency = (value?: number | null) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const ProductsPage: React.FC = () => {
  const { data: products, isLoading, isError, refetch } = useProducts();
  const deleteMutation = useDeleteProduct();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddClosing, setIsAddClosing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const closeAddDialog = () => {
    setIsAddClosing(true);
    setTimeout(() => {
      setIsAddOpen(false);
      setIsAddClosing(false);
      setEditingProduct(null);
    }, 350);
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setIsAddOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa hàng hóa này?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        // Error handled in mutation
      }
    }
  };

  const filteredProducts = products?.filter((p: any) => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader
        title="Danh mục hàng hóa"
        description="Quản lý danh sách các mặt hàng trong hệ thống"
        backPath="/hang-hoa"
        actions={
          <button 
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
          >
            <Plus size={16} />
            Thêm hàng hóa
          </button>
        }
      />

      <div className="bg-card rounded-xl shadow-sm border border-border p-2 mb-6">
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/60">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="w-full text-[13px] bg-transparent border border-border rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/60"
            placeholder="Tìm kiếm theo mã hoặc tên hàng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton type="table" rows={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !filteredProducts?.length ? (
        <EmptyState 
          title={searchQuery ? "Không tìm thấy hàng hóa" : "Chưa có hàng hóa nào"} 
          description={searchQuery ? "Thử tìm kiếm với từ khóa khác." : "Bắt đầu bằng cách thêm hàng hóa mới."} 
        />
      ) : (
        <div className="flex-1 bg-white rounded-2xl border border-border shadow-sm flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-widest text-left w-32">Mã SKU</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-widest text-left">Tên hàng hóa</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-widest text-left w-24">Đơn vị</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-widest text-left">Phân loại</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-widest text-right">Giá cơ sở</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-widest text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredProducts.map((p: any) => (
                  <tr key={p.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 rounded-md bg-primary/5 text-primary text-[11px] font-bold tracking-wider">
                        {p.sku}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-[13.5px] text-foreground">{p.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[12px] font-semibold text-muted-foreground/80 uppercase italic">{p.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200/50">
                        {p.category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[14px] font-black text-primary tabular-nums">
                        {formatCurrency(p.base_price)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1 transition-opacity">
                        <button 
                          onClick={() => handleEdit(p)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-all active:scale-95"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-all active:scale-95"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddEditProductDialog 
        isOpen={isAddOpen} 
        isClosing={isAddClosing} 
        onClose={closeAddDialog}
        product={editingProduct}
      />
    </div>
  );
};

export default ProductsPage;
