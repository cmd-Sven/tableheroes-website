export type CrimeHeatColor = {
  r: number;
  g: number;
  b: number;
  opacity: number;
};

const HEAT_STOPS: { t: number; r: number; g: number; b: number; opacity: number }[] = [
  { t: 0, r: 0.08, g: 0.28, b: 0.52, opacity: 0.22 },
  { t: 0.28, r: 0.2, g: 0.55, b: 0.42, opacity: 0.38 },
  { t: 0.5, r: 0.92, g: 0.78, b: 0.16, opacity: 0.55 },
  { t: 0.72, r: 0.92, g: 0.38, b: 0.06, opacity: 0.74 },
  { t: 1, r: 0.78, g: 0.04, b: 0.05, opacity: 0.92 },
];

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/**
 * Niedrig kühl und durchsichtig, hoch Gelb über Orange nach Rot.
 * Erwartet bereits relativ gestreckte Heat-Werte (siehe citySectorHeat).
 */
export function heatColor(heat: number): CrimeHeatColor {
  const t = clampScore(heat) / 100;
  let lower = HEAT_STOPS[0];
  let upper = HEAT_STOPS[HEAT_STOPS.length - 1];
  for (let index = 0; index < HEAT_STOPS.length - 1; index += 1) {
    const next = HEAT_STOPS[index + 1];
    if (t >= HEAT_STOPS[index].t && t <= next.t) {
      lower = HEAT_STOPS[index];
      upper = next;
      break;
    }
  }
  const span = upper.t - lower.t || 1;
  const mix = (t - lower.t) / span;
  return {
    r: lower.r + (upper.r - lower.r) * mix,
    g: lower.g + (upper.g - lower.g) * mix,
    b: lower.b + (upper.b - lower.b) * mix,
    opacity: lower.opacity + (upper.opacity - lower.opacity) * mix,
  };
}

/** Alias für bestehende Aufrufer. */
export function crimeHeatColor(crime: number): CrimeHeatColor {
  return heatColor(crime);
}
