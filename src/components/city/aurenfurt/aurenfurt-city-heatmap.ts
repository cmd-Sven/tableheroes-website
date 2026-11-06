import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { liveSectorAspectDeltas } from "./aurenfurt-city-sim";
import { districtMetricsOn } from "./aurenfurt-history";
import {
  HEATMAP_ASPECTS,
  type HeatmapAspect,
} from "./aurenfurt-sector-reach";
import type { DistrictSector } from "./aurenfurt-sectors";

export type { HeatmapAspect };
export { HEATMAP_ASPECTS };

export type SectorHeatCell = {
  sector: DistrictSector;
  /** Absoluter Sektorwert 0–100 (Dashboard-kompatibel). */
  value: number;
  /** Relativ gestreckter Wert für die Farbskala (stärkere Kontraste). */
  heat: number;
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/**
 * Relativ über die Stadt strecken, damit Hotspots sichtbar werden.
 * Absolute Lage bleibt leicht spürbar (Untergrenze der Spanne).
 */
function relativeHeat(values: number[]): number[] {
  if (values.length === 0) return [];
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const span = Math.max(16, max - min);
  return values.map((value) => clampScore(((value - min) / span) * 100));
}

/**
 * Sektorwerte für ein Dashboard-Meter über die ganze Stadt.
 * Basis = Tageswert des Viertels (Gebäude, NPCs, Orte, Straßen, Wetter, Chronik),
 * plus zentrierte lokale Abweichung aus Reichweiten.
 */
export function citySectorHeat(day: number, aspect: HeatmapAspect): SectorHeatCell[] {
  const grouped = new Map<CityDistrictId, ReturnType<typeof liveSectorAspectDeltas>>();
  for (const row of liveSectorAspectDeltas(aspect)) {
    const list = grouped.get(row.sector.districtId) ?? [];
    list.push(row);
    grouped.set(row.sector.districtId, list);
  }

  const raw: { sector: DistrictSector; value: number }[] = [];
  for (const district of AURENFURT_DISTRICTS) {
    const base = districtMetricsOn(district.id, day)[aspect];
    const rows = grouped.get(district.id) ?? [];
    const mean =
      rows.length === 0 ? 0 : rows.reduce((sum, row) => sum + row.delta, 0) / rows.length;
    for (const row of rows) {
      raw.push({
        sector: row.sector,
        value: clampScore(base + (row.delta - mean)),
      });
    }
  }

  const heats = relativeHeat(raw.map((row) => row.value));
  return raw.map((row, index) => ({
    sector: row.sector,
    value: row.value,
    heat: heats[index] ?? row.value,
  }));
}

/** Rückwärtskompatibel: Kriminalitätszellen mit `crime` = Heat-Wert. */
export type SectorCrimeCell = {
  sector: DistrictSector;
  crime: number;
  value: number;
};

export function citySectorCrime(day: number): SectorCrimeCell[] {
  return citySectorHeat(day, "crime").map((cell) => ({
    sector: cell.sector,
    crime: cell.heat,
    value: cell.value,
  }));
}
