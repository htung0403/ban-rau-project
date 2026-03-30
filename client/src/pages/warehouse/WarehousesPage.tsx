import React, { useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useWarehouses } from '../../hooks/queries/useWarehouses';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Plus, Warehouse } from 'lucide-react';
import AddEditWarehouseDialog from './dialogs/AddEditWarehouseDialog';
import WarehouseInventoryDialog from './dialogs/WarehouseInventoryDialog';

const WarehousesPage: React.FC = () => {
  const { data: warehouses, isLoading, isError, refetch } = useWarehouses();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddClosing, setIsAddClosing] = useState(false);
  
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isInventoryClosing, setIsInventoryClosing] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);

  const closeAddDialog = () => {
    setIsAddClosing(true);
    setTimeout(() => {
      setIsAddOpen(false);
      setIsAddClosing(false);
    }, 350);
  };

  const openInventory = (warehouse: any) => {
    setSelectedWarehouse(warehouse);
    setIsInventoryOpen(true);
  };

  const closeInventory = () => {
    setIsInventoryClosing(true);
    setTimeout(() => {
      setIsInventoryOpen(false);
      setIsInventoryClosing(false);
      setSelectedWarehouse(null);
    }, 350);
  };
  
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader
        title="Danh sach kho"
        description="Quản lý các kho hàng"
        backPath="/hang-hoa"
        actions={
          <button 
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
          >
            <Plus size={16} />
            Thêm kho
          </button>
        }
      />
      {isLoading ? (
        <LoadingSkeleton type="card" rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !warehouses?.length ? (
        <EmptyState title="Chưa có kho nào" description="Bắt đầu bằng cách thêm kho hàng mới." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w) => (
            <div 
              key={w.id} 
              onClick={() => openInventory(w)}
              className="bg-white rounded-2xl border border-border shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <Warehouse size={22} className="text-teal-500" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-foreground">{w.name}</h3>
                  {w.address && <p className="text-[12px] text-muted-foreground">{w.address}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 text-[12px]">
                <div>
                  <span className="text-muted-foreground">Tồn kho: </span>
                  <span className="font-bold text-foreground">{w.current_stock}</span>
                </div>
                {w.capacity && (
                  <div>
                    <span className="text-muted-foreground">Sức chứa: </span>
                    <span className="font-bold text-foreground">{w.capacity}</span>
                  </div>
                )}
              </div>
              {w.capacity && (
                <div className="mt-3">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (w.current_stock / w.capacity) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AddEditWarehouseDialog 
        isOpen={isAddOpen} 
        isClosing={isAddClosing} 
        onClose={closeAddDialog} 
      />

      <WarehouseInventoryDialog
        isOpen={isInventoryOpen}
        isClosing={isInventoryClosing}
        onClose={closeInventory}
        warehouse={selectedWarehouse}
      />
    </div>
  );
};

export default WarehousesPage;
