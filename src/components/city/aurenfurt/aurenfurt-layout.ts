/** Kreisgeometrie von Aurenfurt. 0° = Norden, im Uhrzeigersinn — wie die Aufsicht. */
export const CITY_CENTER = { x: 500, y: 500 };
export const WALL_RADIUS = 430;
export const RING_RADII = [150, 250, 340, 430];
export const PALACE_RADIUS = 118;

export type Polar = { angle: number; radius: number };

export function polarToCartesian(angleDeg: number, radius: number, center = CITY_CENTER) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: center.x + radius * Math.sin(rad),
    y: center.y - radius * Math.cos(rad),
  };
}

/** Ringsegment zwischen zwei Winkeln. */
export function wedgePath(startDeg: number, endDeg: number, inner: number, outer: number): string {
  const span = (endDeg - startDeg + 360) % 360;
  const large = span > 180 ? 1 : 0;
  const outerStart = polarToCartesian(startDeg, outer);
  const outerEnd = polarToCartesian(endDeg, outer);
  const innerEnd = polarToCartesian(endDeg, inner);
  const innerStart = polarToCartesian(startDeg, inner);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export function wedgeCentroid(startDeg: number, endDeg: number, radius: number) {
  const span = (endDeg - startDeg + 360) % 360;
  const mid = (startDeg + span / 2) % 360;
  return polarToCartesian(mid, radius);
}
