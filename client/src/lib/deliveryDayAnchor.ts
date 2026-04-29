import { format } from 'date-fns';

/**
 * Ngày giao (`delivery_date` YYYY-MM-DD) được coi là «hàng mới» trong bộ lọc.
 * Anchor luôn là ngày hiện tại (cắt tại 00:00 - nửa đêm).
 */
export function getDeliveryAnchorDateString(now: Date = new Date()): string {
  return format(now, 'yyyy-MM-dd');
}
