import React, { useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useVehicles } from '../../hooks/queries/useVehicles';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import StatusBadge from '../../components/shared/StatusBadge';
import { Plus, Car } from 'lucide-react';
import AddEditVehicleDialog from './dialogs/AddEditVehicleDialog';

const statusLabels: Record<string, string> = {
  available: 'Sẵn sàng',
  in_transit: 'Đang chạy',
  maintenance: 'Bảo trì',
};

const VehiclesPage: React.FC = () => {
  const { data: vehicles, isLoading, isError, refetch } = useVehicles();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddClosing, setIsAddClosing] = useState(false);

  const closeAddDialog = () => {
    setIsAddClosing(true);
    setTimeout(() => {
      setIsAddOpen(false);
      setIsAddClosing(false);
    }, 350);
  };


  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader
        title="Danh sách xe"
        description="Quản lý thông tin xe"
        backPath="/quan-ly-xe"
        actions={
          <button 
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
          >
            <Plus size={16} />
            Thêm xe
          </button>
        }
      />
      {isLoading ? (
        <LoadingSkeleton type="card" rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !vehicles?.length ? (
        <EmptyState title="Chưa có xe nào" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-border shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Car size={22} className="text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-foreground">{v.license_plate}</h3>
                    {v.vehicle_type && <p className="text-[12px] text-muted-foreground">{v.vehicle_type}</p>}
                  </div>
                </div>
                <StatusBadge status={v.status} label={statusLabels[v.status]} />
              </div>
              {v.profiles && (
                <p className="text-[12px] text-muted-foreground">
                  Tài xế: <span className="font-bold text-foreground">{v.profiles.full_name}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <AddEditVehicleDialog 
        isOpen={isAddOpen} 
        isClosing={isAddClosing} 
        onClose={closeAddDialog} 
      />
    </div>
  );
};

export default VehiclesPage;
