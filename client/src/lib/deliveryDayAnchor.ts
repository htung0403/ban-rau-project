import { format } from 'date-fns';

/** Giờ bắt đầu coi là «phiên giao tối»: từ đây anchor ngày «hàng mới» nhảy sang ngày hôm sau (VN). */
export const DELIVERY_NEW_DAY_CUT_HOUR = 20;

/**
 * Ngày giao (`delivery_date` YYYY-MM-DD) được coi là «hàng mới» trong bộ lọc.
 * Trước 19:00 → anchor = hôm nay; từ 19:00 → anchor = ngày mai (đơn có ngày giao hôm nay chuyển sang «cũ»).
 */
export function getDeliveryAnchorDateString(now: Date = new Date()): string {
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DELIVERY_NEW_DAY_CUT_HOUR, 0, 0, 0);
  const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (now >= cutoff) {
    anchor.setDate(anchor.getDate() + 1);
  }
  return format(anchor, 'yyyy-MM-dd');
}
