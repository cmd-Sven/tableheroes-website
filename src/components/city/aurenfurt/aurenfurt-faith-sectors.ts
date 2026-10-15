import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { liveSectorFaithDeltas } from "./aurenfurt-city-sim";
import { districtMetricsOn } from "./aurenfurt-history";
import type { DistrictSector } from "./aurenfurt-sectors";

export type SectorFaithCell = {
  sector: DistrictSector;
  elysia: number;
  chromus: number;
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/**
 * Präsenz je Sektor, dieselbe Zentrierung wie die Kriminalitätskarte:
 * Viertelwert plus Abweichung aus Gebäuden und Gruppen, Mittelwert bleibt das Viertel.
 */
export function citySectorFaith(day: number): SectorFaithCell[] {
  const grouped = new Map<CityDistrictId, ReturnType<typeof liveSectorFaithDeltas>>();
  for (const row of liveSectorFaithDeltas()) {
    const list = grouped.get(row.sector.districtId) ?? [];
    list.push(row);
    grouped.set(row.sector.districtId, list);
  }

  const cells: SectorFaithCell[] = [];
  for (const district of AURENFURT_DISTRICTS) {
    const base = districtMetricsOn(district.id, day);
    const rows = grouped.get(district.id) ?? [];
    const elysiaMean =
      rows.length === 0 ? 0 : rows.reduce((sum, row) => sum + row.elysiaDelta, 0) / rows.length;
    const chromusMean =
      rows.length === 0 ? 0 : rows.reduce((sum, row) => sum + row.chromusDelta, 0) / rows.length;
    for (const row of rows) {
      cells.push({
        sector: row.sector,
        elysia: clampScore(base.elysia + (row.elysiaDelta - elysiaMean)),
        chromus: clampScore(base.chromus + (row.chromusDelta - chromusMean)),
      });
    }
  }
  return cells;
}
