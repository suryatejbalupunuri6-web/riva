// Fixed delivery zone polygon — read-only, cannot be modified by vendors
export const GLOBAL_DELIVERY_ZONE: { lat: number; lng: number }[] = [
  { lat: 17.34137, lng: 78.54815 },
  { lat: 17.34196, lng: 78.55624 },
  { lat: 17.33848, lng: 78.5578 },
  { lat: 17.33475, lng: 78.56227 },
  { lat: 17.33292, lng: 78.55295 },
  { lat: 17.33607, lng: 78.55182 },
  { lat: 17.33888, lng: 78.54896 },
  { lat: 17.34137, lng: 78.54815 }, // closed
];

/**
 * Expand polygon outward from centroid by `buffer` degrees to handle GPS jitter.
 * ~10 metres ≈ 0.00009°
 */
function expandPolygon(
  polygon: { lat: number; lng: number }[],
  buffer: number,
): { lat: number; lng: number }[] {
  const n = polygon.length;
  if (n === 0) return polygon;
  const cLat = polygon.reduce((s, p) => s + p.lat, 0) / n;
  const cLng = polygon.reduce((s, p) => s + p.lng, 0) / n;
  return polygon.map((p) => {
    const dLat = p.lat - cLat;
    const dLng = p.lng - cLng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng) || 1e-9;
    return {
      lat: p.lat + (dLat / dist) * buffer,
      lng: p.lng + (dLng / dist) * buffer,
    };
  });
}

/**
 * Ray-casting point-in-polygon with a ~10 m buffer (0.00009°) for GPS edge tolerance.
 */
export function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: { lat: number; lng: number }[],
  buffer = 0.00009,
): boolean {
  const expanded = expandPolygon(polygon, buffer);
  let inside = false;
  const n = expanded.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = expanded[i].lng;
    const yi = expanded[i].lat;
    const xj = expanded[j].lng;
    const yj = expanded[j].lat;
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
