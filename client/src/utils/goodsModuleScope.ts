import type { Vehicle } from '../types';

type ScopeUser = { id: string; role: string; full_name: string };

export function hasFullGoodsModuleAccess(user: { role?: string } | null | undefined): boolean {
  if (!user?.role) return false;
  const r = user.role.toLowerCase();
  return r === 'admin' || r === 'manager';
}

export function isStaffLikeRole(role: string | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === 'staff' || r.includes('nhan_vien') || r.includes('nhân viên');
}

export function isDriverLikeRole(role: string | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === 'driver' || r.includes('tai_xe') || r.includes('tài xế');
}

/** Cần giao / Hàng ở SG: chưa phân xe → hiện đầy đủ (không lọc NV/TX). */
export function deliveryOrderBypassesGoodsScope(order: { status?: string | null } | null | undefined): boolean {
  const s = order?.status;
  return s === 'can_giao' || s === 'hang_o_sg';
}

function normalizePlate(p: string | undefined | null): string {
  return (p || '').trim().toLowerCase().replace(/\s+/g, '');
}

function normalizePersonName(p: string | undefined | null): string {
  return (p || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buildDriverScopeFromVehicles(vehicles: Vehicle[] | undefined, userId: string) {
  const plates = new Set<string>();
  const vehicleIds = new Set<string>();
  (vehicles || []).forEach((v) => {
    if (v.driver_id !== userId) return;
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

function importLikeMatchesDriver(
  row: {
    license_plate?: string | null;
    driver_name?: string | null;
    delivery_orders?: any[] | null;
  },
  actor: ScopeUser,
  scope: { plates: Set<string>; vehicleIds: Set<string> }
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

/** Đơn nhập / đơn rau (danh sách import-orders API). */
export function importOrderVisibleToUser(order: any, user: ScopeUser, vehicles: Vehicle[]): boolean {
  if (hasFullGoodsModuleAccess(user)) return true;
  const isStaff = isStaffLikeRole(user.role);
  const isDriver = isDriverLikeRole(user.role);
  if (!isStaff && !isDriver) return true;

  let ok = false;
  if (isStaff && order.received_by === user.id) ok = true;
  if (isDriver) {
    const scope = buildDriverScopeFromVehicles(vehicles, user.id);
    if (importLikeMatchesDriver(order, user, scope)) ok = true;
  }
  return ok;
}

/** Đơn giao (delivery_orders + nested). */
export function deliveryOrderVisibleToUser(order: any, user: ScopeUser, vehicles: Vehicle[]): boolean {
  if (hasFullGoodsModuleAccess(user)) return true;
  if (deliveryOrderBypassesGoodsScope(order)) return true;
  const isStaff = isStaffLikeRole(user.role);
  const isDriver = isDriverLikeRole(user.role);
  if (!isStaff && !isDriver) return true;

  const io = order.import_orders;
  const vo = order.vegetable_orders;
  const src = io || vo;

  let ok = false;
  if (isStaff && src?.received_by === user.id) ok = true;

  if (isDriver) {
    const scope = buildDriverScopeFromVehicles(vehicles, user.id);
    const synthetic = {
      license_plate: src?.license_plate,
      driver_name: src?.driver_name,
      delivery_orders: [{ delivery_vehicles: order.delivery_vehicles || [] }],
    };
    if (importLikeMatchesDriver(synthetic, user, scope)) ok = true;
  }
  return ok;
}
