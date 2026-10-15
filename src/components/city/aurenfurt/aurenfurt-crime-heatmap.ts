import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { liveSectorCrimeDeltas } from "./aurenfurt-city-sim";
import { districtMetricsOn } from "./aurenfurt-history";
import type { DistrictSector } from "./aurenfurt-sectors";

export type { CrimeHeatColor } from "./aurenfurt-crime-heat-color";
export { crimeHeatColor } from "./aurenfurt-crime-heat-color";

export type SectorCrimeCell = {
  sector: DistrictSector;
  crime: number;
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/**
 * Kriminalität je Sektor für die ganze Stadt.
 * Quelle: Tageswert des Viertels (Gebäude, NPC, Straßenfeld, Pressure, Chronik)
 * plus die Abweichung, die sectorField schon je Sektor rechnet.
 * Die Abweichung wird um ihren Viertel-Mittelwert zentriert, damit der
 * veröffentlichte Viertelwert der Mittelwert der Sektoren bleibt.
 */
export function citySectorCrime(day: number): SectorCrimeCell[] {
  const grouped = new Map<CityDistrictId, ReturnType<typeof liveSectorCrimeDeltas>>();
  for (const row of liveSectorCrimeDeltas()) {
    const list = grouped.get(row.sector.districtId) ?? [];
    list.push(row);
    grouped.set(row.sector.districtId, list);
  }

  const cells: SectorCrimeCell[] = [];
  for (const district of AURENFURT_DISTRICTS) {
    const base = districtMetricsOn(district.id, day).crime;
    const rows = grouped.get(district.id) ?? [];
    const mean =
      rows.length === 0 ? 0 : rows.reduce((sum, row) => sum + row.crimeDelta, 0) / rows.length;
    for (const row of rows) {
      cells.push({
        sector: row.sector,
        crime: clampScore(base + (row.crimeDelta - mean)),
      });
    }
  }
  return cells;
}
