/** Kreis der Stadtmauer in Bildkoordinaten. 0° = Norden, im Uhrzeigersinn. */
export const CITY_CENTER = { u: 0.5, v: 0.49 };
export const CITY_RADIUS_V = 0.42;
/** Breite der Aufsicht 1697×927, damit der Kreis in der Textur rund bleibt. */
export const CITY_RADIUS_U = CITY_RADIUS_V * (927 / 1697);

export function arcSpan(start: number, end: number) {
  if (end - start >= 359) return 360;
  return (end - start + 360) % 360;
}

export function polarToImage(angleDeg: number, radiusNorm: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    u: CITY_CENTER.u + Math.sin(rad) * radiusNorm * CITY_RADIUS_U,
    v: CITY_CENTER.v - Math.cos(rad) * radiusNorm * CITY_RADIUS_V,
  };
}

export function wedgeAnchor(start: number, end: number, inner: number, outer: number) {
  const span = arcSpan(start, end);
  const mid = (start + span / 2) % 360;
  const radius = inner <= 0.001 ? 0 : (inner + outer) / 2;
  return polarToImage(mid, radius);
}
