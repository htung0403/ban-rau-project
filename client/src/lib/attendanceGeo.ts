/** Haversine distance in metres */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface AttendanceGeofencePoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_m: number;
}

export function parseGeofenceListFromAttendanceSetting(settingValue: unknown): AttendanceGeofencePoint[] {
  const raw = settingValue as { locations?: unknown[] } | null | undefined;
  if (!Array.isArray(raw?.locations)) return [];

  const out: AttendanceGeofencePoint[] = [];
  for (const item of raw.locations) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const lat = Number(o.lat);
    const lng = Number(o.lng);
    const radius_m = Number(o.radius_m ?? o.radius ?? 50);
    const id = String(o.id || `loc-${out.length}-${lat}-${lng}`);
    const name = String(o.name || 'Điểm chấm công');
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius_m) || radius_m <= 0) continue;
    out.push({ id, name, lat, lng, radius_m });
  }
  return out;
}

/** When multi-location config is empty, fall back to legacy single `base_location` from Settings (cũ). */
export function legacyBaseLocationToPoint(legacy: {
  lat?: number;
  lng?: number;
  radius?: number;
} | null | undefined): AttendanceGeofencePoint | null {
  if (!legacy || typeof legacy.lat !== 'number' || typeof legacy.lng !== 'number') return null;
  const radius_m = typeof legacy.radius === 'number' && legacy.radius > 0 ? legacy.radius : 50;
  return {
    id: 'legacy-base',
    name: 'Vị trí gốc (cấu hình cũ)',
    lat: legacy.lat,
    lng: legacy.lng,
    radius_m,
  };
}

export function resolveActiveGeofencePoints(
  attendanceLocationsValue: unknown,
  legacyBase: { lat?: number; lng?: number; radius?: number } | null | undefined
): AttendanceGeofencePoint[] {
  const fromList = parseGeofenceListFromAttendanceSetting(attendanceLocationsValue);
  if (fromList.length > 0) return fromList;
  const legacy = legacyBaseLocationToPoint(legacyBase);
  return legacy ? [legacy] : [];
}

export function matchGeofence(
  userLat: number,
  userLng: number,
  points: AttendanceGeofencePoint[]
): { ok: true; name: string; distanceM: number } | { ok: false; minDistanceM: number } {
  if (!points.length) return { ok: false, minDistanceM: Infinity };

  let minDistanceM = Infinity;
  for (const p of points) {
    const d = calculateDistance(p.lat, p.lng, userLat, userLng);
    if (d < minDistanceM) minDistanceM = d;
    if (d <= p.radius_m) {
      return { ok: true, name: p.name, distanceM: d };
    }
  }
  return { ok: false, minDistanceM };
}
