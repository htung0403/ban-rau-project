import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, Truck, AlertTriangle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useRevertVehicle } from '../../../hooks/queries/useDelivery';
import type { DeliveryOrder } from '../../../types';

interface Props {
  isOpen: boolean;
  isClosing?: boolean;
  order: DeliveryOrder | null;
  isAdmin: boolean;
  myVehicleIds: string[];
  onClose: () => void;
}

const RevertVehicleDialog: React.FC<Props> = ({
  isOpen,
  isClosing,
  order,
  isAdmin,
  myVehicleIds,
  onClose,
}) => {
  const revertMutation = useRevertVehicle();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (!isOpen && !isClosing) return null;
  if (!order) return null;

  const assignedVehicles = (order.delivery_vehicles || []).filter(
    (dv) => (dv.assigned_quantity || 0) > 0
  );

  const revertableVehicles = isAdmin
    ? assignedVehicles
    : assignedVehicles.filter((dv) => dv.vehicle_id && myVehicleIds.includes(dv.vehicle_id));

  const handleRevert = async (vehicleId: string) => {
    setConfirming(true);
    try {
      await revertMutation.mutateAsync({ id: order.id, vehicleId });
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  const handleAdminConfirm = async () => {
    if (!selectedVehicleId) return;
    await handleRevert(selectedVehicleId);
  };

  const handleDriverConfirm = async () => {
    if (revertableVehicles.length !== 1 || !revertableVehicles[0].vehicle_id) return;
    await handleRevert(revertableVehicles[0].vehicle_id);
  };

  const formatNumber = (val?: number) => {
    if (val == null) return '0';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(val);
  };

  return createPortal(
    <div
      className={clsx(
        'fixed inset-0 z-[1000] flex items-center justify-center p-4',
        isClosing ? 'animate-out fade-out duration-200' : 'animate-in fade-in duration-200'
      )}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'relative bg-card rounded-2xl shadow-xl border border-border w-full max-w-md flex flex-col gap-0 overflow-hidden',
          isClosing ? 'animate-out zoom-out-95 duration-200' : 'animate-in zoom-in-95 duration-200'
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600">
              <RotateCcw size={16} strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-bold text-foreground">Hoàn tác giao hàng</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[13px] text-amber-700 dark:text-amber-500 font-medium leading-relaxed">
              Hoàn tác sẽ xóa xe được chọn khỏi đơn hàng này, xóa phiếu thu nháp tương ứng và cập nhật phiếu xuất.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Đơn hàng</span>
            <span className="text-[14px] font-bold text-foreground">{order.product_name}</span>
            <span className="text-[12px] text-muted-foreground">Tổng SL: {formatNumber(order.total_quantity)}</span>
          </div>

          {revertableVehicles.length === 0 ? (
            <p className="text-[13px] text-muted-foreground text-center py-2">
              Không có xe nào bạn có thể hoàn tác.
            </p>
          ) : isAdmin ? (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Chọn xe muốn hoàn tác</span>
              {revertableVehicles.map((dv) => (
                <button
                  key={dv.id}
                  onClick={() => setSelectedVehicleId(dv.vehicle_id || null)}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left',
                    selectedVehicleId === dv.vehicle_id
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-border bg-muted/20 hover:bg-muted/40'
                  )}
                >
                  <div className={clsx(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    selectedVehicleId === dv.vehicle_id
                      ? 'border-amber-500 bg-amber-500'
                      : 'border-border'
                  )}>
                    {selectedVehicleId === dv.vehicle_id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <Truck size={14} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-foreground">
                      {dv.vehicles?.license_plate || 'N/A'}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      SL: {formatNumber(dv.assigned_quantity)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Xe sẽ hoàn tác</span>
              {revertableVehicles.map((dv) => (
                <div
                  key={dv.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/5"
                >
                  <Truck size={14} className="text-amber-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-foreground">
                      {dv.vehicles?.license_plate || 'N/A'}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      SL: {formatNumber(dv.assigned_quantity)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-[13px] font-bold text-muted-foreground hover:bg-muted transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={isAdmin ? handleAdminConfirm : handleDriverConfirm}
            disabled={
              revertMutation.isPending ||
              confirming ||
              revertableVehicles.length === 0 ||
              (isAdmin && !selectedVehicleId)
            }
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-[13px] font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(revertMutation.isPending || confirming) ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCcw size={14} strokeWidth={2.5} />
            )}
            Hoàn tác
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RevertVehicleDialog;
