import type { UserPayload } from '../types';
import { supabaseService } from '../config/supabase';

export function goodsScopeFullAccess(role: string | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === 'admin' || r === 'manager';
}

export function goodsScopeIsStaffRole(role: string | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === 'staff' || r.includes('nhan_vien') || r.includes('nhân viên');
}

export function goodsScopeIsDriverRole(role: string | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === 'driver' || r.includes('tai_xe') || r.includes('tài xế');
}

export function normalizePlate(p: string | undefined | null): string {
  return (p || '').trim().toLowerCase().replace(/\s+/g, '');
}

export function normalizePersonName(p: string | undefined | null): string {
  return (p || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Cần giao / Hàng ở SG: chưa phân xe → không lọc theo nhân viên/tài xế. */
export function deliveryOrderBypassesGoodsScope(row: { status?: string | null } | null | undefined): boolean {
  const s = row?.status;
  return s === 'can_giao' || s === 'hang_o_sg';
}

export type DriverScope = { plates: Set<string>; vehicleIds: Set<string> };

export async function fetchDriverScopeForUser(userId: string): Promise<DriverScope> {
  const { data, error } = await supabaseService
    .from('vehicles')
    .select('id, license_plate')
    .eq('driver_id', userId);
  if (error) throw error;
  const plates = new Set<string>();
  const vehicleIds = new Set<string>();
  (data || []).forEach((v: any) => {
    if (v.id) vehicleIds.add(v.id);
    const np = normalizePlate(v.license_plate);
    if (np) plates.add(np);
  });
  return { plates, vehicleIds };
}

function plateInScope(plate: string | undefined | null, plates: Set<string>): boolean {
  const n = normalizePlate(plate);
  return Boolean(n && plates.has(n));
}

function importLikeRowMatchesDriver(
  row: {
    license_plate?: string | null;
    driver_name?: string | null;
    delivery_orders?: any[] | null;
  },
  actor: Pick<UserPayload, 'id' | 'full_name'>,
  scope: DriverScope
): boolean {
  if (plateInScope(row.license_plate, scope.plates)) return true;
  const an = normalizePersonName(actor.full_name);
  const dn = normalizePersonName(row.driver_name);
  if (an && dn && an === dn) return true;

  for (const d of row.delivery_orders || []) {
    for (const dv of d.delivery_vehicles || []) {
      if (dv.driver_id === actor.id) return true;
      if (dv.vehicle_id && scope.vehicleIds.has(dv.vehicle_id)) return true;
      if (plateInScope(dv.vehicles?.license_plate, scope.plates)) return true;
      const pfn = normalizePersonName(dv.profiles?.full_name);
      if (an && pfn && an === pfn) return true;
    }
  }
  return false;
}

/** Đơn nhập / đơn rau (danh sách API import-orders). */
export function importOrderRowMatchesGoodsScope(
  row: any,
  actor: UserPayload,
  driverScope: DriverScope | null
): boolean {
  if (goodsScopeFullAccess(actor.role)) return true;
  const isStaff = goodsScopeIsStaffRole(actor.role);
  const isDriver = goodsScopeIsDriverRole(actor.role);
  if (!isStaff && !isDriver) return true;

  let ok = false;
  if (isStaff && row.received_by === actor.id) ok = true;
  if (isDriver && driverScope && importLikeRowMatchesDriver(row, actor, driverScope)) ok = true;
  return ok;
}

/** Đơn giao (delivery_orders + nested import/veg + delivery_vehicles). */
export function deliveryOrderRowMatchesGoodsScope(
  row: any,
  actor: UserPayload,
  driverScope: DriverScope | null
): boolean {
  if (goodsScopeFullAccess(actor.role)) return true;
  if (deliveryOrderBypassesGoodsScope(row)) return true;
  const isStaff = goodsScopeIsStaffRole(actor.role);
  const isDriver = goodsScopeIsDriverRole(actor.role);
  if (!isStaff && !isDriver) return true;

  const io = row.import_orders;
  const vo = row.vegetable_orders;
  const src = io || vo;

  let ok = false;
  if (isStaff && src?.received_by === actor.id) ok = true;

  if (isDriver && driverScope) {
    const synthetic = {
      license_plate: src?.license_plate,
      driver_name: src?.driver_name,
      delivery_orders: [{ delivery_vehicles: row.delivery_vehicles || [] }],
    };
    if (importLikeRowMatchesDriver(synthetic, actor, driverScope)) ok = true;
  }
  return ok;
}

/** Phiếu xuất: cần meta delivery tương ứng product_id. */
export function exportOrderRowMatchesGoodsScope(
  exportRow: { product_id?: string | null },
  deliveryRow: any | undefined,
  actor: UserPayload,
  driverScope: DriverScope | null
): boolean {
  if (goodsScopeFullAccess(actor.role)) return true;
  if (!exportRow.product_id) return true;
  if (!deliveryRow) return false;
  if (deliveryOrderBypassesGoodsScope(deliveryRow)) return true;
  return deliveryOrderRowMatchesGoodsScope(deliveryRow, actor, driverScope);
}
