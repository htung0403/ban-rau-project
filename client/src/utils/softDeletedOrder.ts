type SourceRow = { deleted_at?: string | null } | null | undefined;

function firstRelation<T extends SourceRow>(rel: T | T[] | null | undefined): SourceRow {
  if (rel == null) return null;
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

/** Bản ghi đơn nhập / đơn rau (import_orders / vegetable_orders) đã soft-delete. */
export function isSoftDeletedOrderRecord(order: { deleted_at?: string | null } | null | undefined): boolean {
  return Boolean(order?.deleted_at);
}

/** Đơn nhập / đơn rau nguồn đã soft-delete (có deleted_at). */
export function isSoftDeletedSourceOrder(item: {
  import_orders?: SourceRow | SourceRow[] | null;
  vegetable_orders?: SourceRow | SourceRow[] | null;
}): boolean {
  const io = firstRelation(item.import_orders);
  const vo = firstRelation(item.vegetable_orders);
  return Boolean(io?.deleted_at || vo?.deleted_at);
}
