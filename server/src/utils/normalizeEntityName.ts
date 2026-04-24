/** Chuẩn hóa tên để so sánh trùng (không phân biệt hoa thường, trim). */
export function normalizeEntityNameKey(name: string): string {
  return (name || '').trim().toLowerCase();
}
