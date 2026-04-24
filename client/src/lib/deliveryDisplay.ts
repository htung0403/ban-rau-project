/** Chuẩn hóa giờ từ API (TIME → "HH:mm") cho input type="time". */
export function deliveryTimeToInputValue(raw: unknown): string {
  if (raw == null || raw === '') return '';
  const s = String(raw);
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/** Hiển thị ngày (vi-VN) và giờ giao nếu có.
 *  Ưu tiên driver_delivered_at (giờ xuất thực tế khi tài xế giao đủ).
 *  Nếu delivery_time trống, fallback lấy giờ từ created_at. */
export function formatNgayGioGiaoVI(
  deliveryDate?: string | null,
  deliveryTimeRaw?: unknown,
  fallbackCreatedAt?: string | null,
  driverDeliveredAt?: string | null
): string {
  if (driverDeliveredAt) {
    const d = new Date(driverDeliveredAt);
    if (!Number.isNaN(d.getTime())) {
      const dateStr = d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const timeStr = d.toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `${dateStr} · ${timeStr}`;
    }
  }
  let dateStr = '—';
  if (deliveryDate) {
    const iso = deliveryDate.length === 10 ? `${deliveryDate}T12:00:00` : deliveryDate;
    const ms = Date.parse(iso);
    if (!Number.isNaN(ms)) {
      dateStr = new Date(ms).toLocaleDateString('vi-VN');
    } else {
      dateStr = deliveryDate;
    }
  }
  const t = deliveryTimeToInputValue(deliveryTimeRaw);
  if (t) return `${dateStr} · ${t}`;
  // Fallback: extract time from created_at ISO string
  if (fallbackCreatedAt) {
    const d = new Date(fallbackCreatedAt);
    if (!Number.isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${dateStr} · ${hh}:${mm}`;
    }
  }
  return dateStr;
}
