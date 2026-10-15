export type CrimeHeatColor = {
  r: number;
  g: number;
  b: number;
  opacity: number;
};

const HEAT_STOPS: { t: number; r: number; g: number; b: number; opacity: number }[] = [
  { t: 0, r: 0.1, g: 0.32, b: 0.55, opacity: 0.14 },
  { t: 0.34, r: 0.9, g: 0.78, b: 0.18, opacity: 0.4 },
  { t: 0.67, r: 0.9, g: 0.4, b: 0.08, opacity: 0.66 },
  { t: 1, r: 0.72, g: 0.05, b: 0.04, opacity: 0.9 },
];

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/** Niedrig kühl und durchsichtig, hoch Gelb über Orange nach Rot. Gleiche Werte, gleiche Farbe. */
export function crimeHeatColor(crime: number): CrimeHeatColor {
  const t = clampScore(crime) / 100;
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
