import React, { useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { useVehicles } from '../../hooks/queries/useVehicles';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { Plus, Car } from 'lucide-react';
import AddEditVehicleDialog from './dialogs/AddEditVehicleDialog';
import VehicleDetailsDialog from './dialogs/VehicleDetailsDialog';
import type { Vehicle } from '../../types';

const VehiclesPage: React.FC = () => {
  const { data: vehicles, isLoading, isError, refetch } = useVehicles();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddClosing, setIsAddClosing] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailClosing, setIsDetailClosing] = useState(false);

  const closeAddDialog = () => {
    setIsAddClosing(true);
    setTimeout(() => {
      setIsAddOpen(false);
      setIsAddClosing(false);
    }, 350);
  };

  const openDetail = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailOpen(true);
  };

  const closeDetail = () => {
    setIsDetailClosing(true);
    setTimeout(() => {
      setIsDetailOpen(false);
      setIsDetailClosing(false);
      setSelectedVehicle(null);
    }, 350);
  };

  const columns = [
    { id: 'available', label: 'Sẵn sàng', icon: 'bg-emerald-500/10 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
    { id: 'in_transit', label: 'Đang chạy', icon: 'bg-blue-500/10 text-blue-600', badge: 'bg-blue-100 text-blue-700' },
    { id: 'maintenance', label: 'Bảo trì', icon: 'bg-orange-500/10 text-orange-600', badge: 'bg-orange-100 text-orange-700' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col -mt-2 min-h-0">
      <PageHeader
        title="Danh sách xe"
        description="Quản lý thông tin xe theo trạng thái"
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
        <div className="flex-1 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-6 min-h-full min-w-max lg:min-w-0 lg:grid lg:grid-cols-3">
            {columns.map((column) => {
              const columnVehicles = vehicles.filter(v => v.status === column.id);

              return (
                <div key={column.id} className="w-[320px] lg:w-full flex flex-col bg-slate-100 border border-slate-200 rounded-[24px] p-4 min-h-[500px]">
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-5 px-1">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${column.icon.split(' ')[1].replace('text-', 'bg-')}`} />
                      <h3 className="font-extrabold text-[15px] text-slate-800 tracking-tight">{column.label}</h3>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm ${column.badge}`}>
                        {columnVehicles.length}
                      </span>
                    </div>
                  </div>

                  {/* Column Content */}
                  <div className="flex flex-col gap-3 flex-1">
                    {columnVehicles.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                        <p className="text-[12px] text-slate-400 italic font-medium">Chưa có xe</p>
                      </div>
                    ) : (
                      columnVehicles.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => openDetail(v)}
                          className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] p-4 hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${column.icon}`}>
                              <Car size={22} />
                            </div>
                            <div>
                              <h3 className="text-[15px] font-extrabold text-slate-900 group-hover:text-primary transition-colors">
                                {v.license_plate}
                              </h3>
                              {v.vehicle_type && (
                                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                                  {v.vehicle_type}
                                </p>
                              )}
                            </div>
                          </div>

                          {v.profiles ? (
                            <div className="flex items-center justify-between pt-3.5 border-t border-slate-100">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-700 shadow-sm">
                                  {v.profiles.full_name?.charAt(0)}
                                </div>
                                <span className="text-[12px] font-semibold text-slate-600">{v.profiles.full_name}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-3.5 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-2 italic">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                              Chưa có tài xế
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AddEditVehicleDialog
        isOpen={isAddOpen}
        isClosing={isAddClosing}
        onClose={closeAddDialog}
      />

      <VehicleDetailsDialog
        vehicle={selectedVehicle}
        isOpen={isDetailOpen}
        isClosing={isDetailClosing}
        onClose={closeDetail}
      />
    </div>
  );
};

export default VehiclesPage;
