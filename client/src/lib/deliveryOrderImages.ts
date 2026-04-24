/** Gom ảnh từ đơn giao + đơn nhập (biên nhận + dòng hàng khớp product_id) để form sửa không mất ảnh khi chỉ đổi tên. */
const pickRelation = <T,>(relation: any): T | undefined => {
  if (Array.isArray(relation)) return relation[0];
  return relation || undefined;
};

export function collectDeliveryOrderImageUrlsForEdit(order: any): string[] {
  const seen = new Set<string>();
  const push = (u?: string | null) => {
    if (!u || typeof u !== 'string') return;
    const t = u.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
  };
  const pushMany = (arr?: string[] | null) => (arr || []).forEach(push);

  pushMany(order?.image_urls);
  push(order?.image_url);

  const linkedImport = pickRelation<any>(order?.import_orders);
  const linkedVeg = pickRelation<any>(order?.vegetable_orders);
  const linked = linkedImport || linkedVeg;
  const items = linkedImport?.import_order_items || linkedVeg?.vegetable_order_items;

  if (linked?.receipt_image_url) push(linked.receipt_image_url);
  pushMany(linked?.receipt_image_urls);

  const pid = order?.product_id;
  const itemList: any[] = Array.isArray(items) ? items : [];
  const matching = pid ? itemList.filter((it) => it.product_id === pid) : [];
  const toScan = matching.length > 0 ? matching : itemList;

  for (const it of toScan) {
    if (it?.image_url && typeof it.image_url === 'string') {
      if (it.image_url.includes(',')) {
        it.image_url.split(',').forEach((s: string) => push(s.trim()));
      } else {
        push(it.image_url);
      }
    }
    pushMany(it?.image_urls);
  }

  return Array.from(seen);
}
