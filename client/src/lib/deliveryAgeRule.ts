import type { DeliveryOrder, DeliveryStatus } from '../types';

export const getDeliveryRemainingQty = (order: DeliveryOrder): number => {
  const totalAssigned = (order.delivery_vehicles || []).reduce(
    (sum, dv) => sum + (dv.assigned_quantity || 0),
    0
  );
  return order.total_quantity - totalAssigned;
};

/** Trạng thái hiển thị/lọc: còn hàng chưa giao hết thì luôn là Cần giao, không hiện Đã giao. */
export const getEffectiveDeliveryStatus = (order: DeliveryOrder, remainingQty?: number): DeliveryStatus => {
  if (order.status === 'hang_o_sg') return 'hang_o_sg';
  const remaining = remainingQty ?? getDeliveryRemainingQty(order);
  if (remaining > 0) return 'can_giao';
  if (order.status === 'da_giao') return 'da_giao';
  return 'can_giao';
};

export const isOldOrderForAgeRule = (order: DeliveryOrder, anchorDate: string): boolean => {
  const effectiveStatus = getEffectiveDeliveryStatus(order);
  if (effectiveStatus === 'hang_o_sg') return false;
  
  if (order.confirmed_at) {
    const confirmedDate = new Date(order.confirmed_at);
    const cutoffTime = new Date(confirmedDate);
    cutoffTime.setHours(19, 0, 0, 0);
    if (confirmedDate >= cutoffTime) {
      cutoffTime.setDate(cutoffTime.getDate() + 1);
    }
    return Date.now() >= cutoffTime.getTime();
  }
  
  const refDate = order.delivery_date;
  return Boolean(refDate && refDate < anchorDate);
};
