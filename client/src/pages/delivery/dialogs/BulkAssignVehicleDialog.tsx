import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck, AlertCircle, Loader2 } from 'lucide-react';
import { useAssignVehicle } from '../../../hooks/queries/useDelivery';
import { useVehicles } from '../../../hooks/queries/useVehicles';
import type { DeliveryOrder, Vehicle } from '../../../types';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  isClosing?: boolean;
  orders: DeliveryOrder[];
  onClose: () => void;
}

const vehicleSupportsGoodsCategory = (vehicle: Vehicle, category: 'grocery' | 'vegetable') => {
  if (!vehicle.goods_categories || vehicle.goods_categories.length === 0) return true;
  return vehicle.goods_categories.includes(category);
};

const BulkAssignVehicleDialog: React.FC<Props> = ({ isOpen, isClosing, orders, onClose }) => {
  const assignMutation = useAssignVehicle();
  const { data: vehicles } = useVehicles();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validOrders = orders.filter(o => {
    const totalAssigned = (o.delivery_vehicles || []).reduce((sum, dv) => sum + (dv.assigned_quantity || 0), 0);
    return o.total_quantity - totalAssigned > 0;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      toast.error('Vui lòng chọn xe');
      return;
    }

    if (validOrders.length === 0) {
      toast.error('Không có đơn hàng nào còn số lượng cần giao');
      return;
    }

    const selectedVehicle = vehicles?.find(v => v.id === selectedVehicleId);
    if (!selectedVehicle) return;

    setIsSubmitting(true);
    try {
      await Promise.all(
        validOrders.map(async (order) => {
          const totalAssigned = (order.delivery_vehicles || []).reduce((sum, dv) => sum + (dv.assigned_quantity || 0), 0);
          const remainingQty = order.total_quantity - totalAssigned;
          
          if (remainingQty <= 0) return;

          // Merge with existing assignments to preserve them
          const existingAssignments = (order.delivery_vehicles || []).map(dv => ({
            vehicle_id: dv.vehicle_id,
            driver_id: dv.driver_id || '',
            loader_name: dv.loader_name || '',
            quantity: dv.assigned_quantity || 0,
            expected_amount: Number(dv.expected_amount || 0)
          }));

          const uPrice = order.unit_price || 0;
          const newAssignment = {
            vehicle_id: selectedVehicleId,
            driver_id: selectedVehicle.driver_id || selectedVehicle.in_charge_id || '',
            loader_name: '',
            quantity: remainingQty,
            expected_amount: remainingQty * uPrice
          };

          // Combine assignments
          const myExistingIndex = existingAssignments.findIndex((p) => p.vehicle_id === selectedVehicleId);
          if (myExistingIndex >= 0) {
            existingAssignments[myExistingIndex].quantity += remainingQty;
            existingAssignments[myExistingIndex].expected_amount = existingAssignments[myExistingIndex].quantity * uPrice;
          } else {
            existingAssignments.push(newAssignment);
          }

          await assignMutation.mutateAsync({
            id: order.id,
            payload: { assignments: existingAssignments }
          });
        })
      );
      toast.success('Phân xe hàng loạt thành công');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi phân xe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const eligibleVehicles = (vehicles || []).filter(v => vehicleSupportsGoodsCategory(v, 'grocery'));

  const vehicleOptions = eligibleVehicles.map(v => ({
    value: v.id,
    label: v.license_plate,
    icon: <Truck size={14} className="text-muted-foreground" />
  }));

  const content = (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div 
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={!isSubmitting ? onClose : undefined}
      />
      
      <div className={`relative w-full max-w-md bg-background rounded-2xl shadow-xl transition-all duration-300 overflow-hidden flex flex-col max-h-[90vh] ${
        isClosing ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold text-foreground">Phân xe hàng loạt</h2>
          <button 
            onClick={!isSubmitting ? onClose : undefined} 
            disabled={isSubmitting}
            className="p-2 hover:bg-muted rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar">
          <div className="mb-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex gap-2.5">
            <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="text-[13px] text-blue-700 leading-snug">
              Bạn đang phân xe cho <strong>{validOrders.length}</strong> đơn hàng. Hệ thống sẽ lấy toàn bộ số lượng <strong>Còn lại</strong> của từng đơn để gán cho xe được chọn.
            </div>
          </div>

          <form id="bulk-assign-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-foreground">Chọn xe <span className="text-red-500">*</span></label>
              <SearchableSelect
                options={vehicleOptions}
                value={selectedVehicleId}
                onValueChange={setSelectedVehicleId}
                placeholder="Chọn xe..."
                className="w-full"
                disabled={isSubmitting}
              />
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-border shrink-0 bg-muted/50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-[14px] font-bold text-muted-foreground bg-card border border-border rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            form="bulk-assign-form"
            type="submit"
            disabled={isSubmitting || !selectedVehicleId || validOrders.length === 0}
            className="px-4 py-2.5 text-[14px] font-bold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? 'Đang phân xe...' : 'Lưu thao tác'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default BulkAssignVehicleDialog;