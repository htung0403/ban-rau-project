import React from 'react';
import { createPortal } from 'react-dom';
import { X, Box, Search, Package, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../../api/inventoryApi';
import LoadingSkeleton from '../../../components/shared/LoadingSkeleton';

interface Props {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  warehouse: any;
}

const WarehouseInventoryDialog: React.FC<Props> = ({ isOpen, isClosing, onClose, warehouse }) => {
  const { data: inventory, isLoading, isError } = useQuery({
    queryKey: ['warehouse-inventory', warehouse?.id],
    queryFn: async () => {
      const response = await inventoryApi.getWarehouseInventory(warehouse.id);
      return response.data; // axiosClient already unwraps response.data.data
    },
    enabled: !!warehouse?.id && isOpen,
  });

  const [searchQuery, setSearchQuery] = React.useState('');

  if (!isOpen && !isClosing) return null;

  const filteredInventory = inventory?.filter((item: any) =>
    item.products?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          'relative w-full max-w-[600px] bg-background shadow-2xl flex flex-col h-screen border-l border-border',
          isClosing ? 'dialog-slide-out' : 'dialog-slide-in',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Tồn kho chi tiết</h2>
              <p className="text-[11px] text-muted-foreground">{warehouse?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 bg-card border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={16} />
              <input
                type="text"
                placeholder="Tìm hàng hóa trong kho..."
                className="w-full pl-10 pr-4 py-2 bg-muted/10 border border-border rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <LoadingSkeleton type="table" rows={4} />
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertCircle size={40} className="text-red-500/50 mb-2" />
                <p className="text-[13px] font-medium">Lỗi tải dữ liệu tồn kho</p>
              </div>
            ) : !filteredInventory?.length ? (
              <div className="flex flex-col items-center justify-center py-12 bg-card rounded-2xl border border-dashed border-border border-spacing-4">
                <Box size={40} className="text-muted-foreground/20 mb-3" />
                <p className="text-[13px] font-bold text-muted-foreground">Kho chưa có hàng hóa này</p>
                <p className="text-[11px] text-muted-foreground/60">Sử dụng phiếu nhập kho để bắt đầu.</p>
              </div>
            ) : (
              filteredInventory.map((item: any) => (
                <div key={item.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between hover:border-primary/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Box size={18} />
                    </div>
                    <div>

                      <h4 className="text-[13px] font-bold text-foreground line-clamp-1">{item.products?.name}</h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] font-black text-foreground">
                      {item.quantity}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-card border-t border-border px-6 py-4 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-8 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-[13px] font-bold transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WarehouseInventoryDialog;
