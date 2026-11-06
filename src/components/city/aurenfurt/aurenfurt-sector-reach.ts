/**
 * Gebäude liegen auf dem Sektorraster. Der Einfluss ihrer NPCs reicht
 * einige Sektoren weit und verändert dort Kriminalität und Sicherheit.
 * Die Zuordnung wird aus Pin und Gitter neu berechnet, nicht extra gespeichert.
 */

import {
  AURENFURT_DISTRICTS,
  type CityDistrictId,
} from "./aurenfurt-districts";
import {
  defaultDistrictPolygons,
  type DistrictPolygons,
  type UvPoint,
} from "./aurenfurt-district-polygons";
import {
  divideDistrictIntoSectors,
  SECTOR_GRID_ORIGIN,
  SECTOR_SIZE_DEFAULT,
  type DistrictSector,
  type DistrictSectorsByDistrict,
} from "./aurenfurt-sectors";
import type { CityInfluenceTier } from "@/src/lib/npcs/city-simulation";

/** Halbe Kantenlänge des Gebäude-Fußabdrucks in Karten-UV. Nahe an einer Grenze zählen beide Sektoren. */
export const BUILDING_FOOTPRINT_HALF = 0.01;

/**
 * Chebyshev-Schritte, eigener Sektor immer dabei.
 * Nach Halbierung der Sektorgröße (0.04→0.02) verdoppelt, damit die UV-Reichweite gleich bleibt.
 */
export const NPC_SECTOR_REACH: Record<CityInfluenceTier, number> = {
  local: 2,
  regional_economy: 4,
  authority_faction: 6,
  apex_global: 8,
};

/** Basis-Sektorradius für Gebäude-Wohlstand/Unruhe auf der Heatmap (ohne NPCs). */
export const BUILDING_ASPECT_REACH = 2;

export type ReachNpc = {
  locationId: string | null;
  tier: CityInfluenceTier;
  influence: number;
  loyalCriminal: number;
  greedyAltruist?: number;
};

export type ReachBuilding = {
  id: string;
  districtId: CityDistrictId;
  category: string;
  hotspot: number;
  u: number;
  v: number;
};

type GridCoord = { col: number; row: number };

function aabb(points: UvPoint[]) {
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const point of points) {
    if (point.u < minU) minU = point.u;
    if (point.u > maxU) maxU = point.u;
    if (point.v < minV) minV = point.v;
    if (point.v > maxV) maxV = point.v;
  }
  return { minU, maxU, minV, maxV };
}

function rectsOverlap(
  a: { minU: number; maxU: number; minV: number; maxV: number },
  b: { minU: number; maxU: number; minV: number; maxV: number },
) {
  return a.minU <= b.maxU && a.maxU >= b.minU && a.minV <= b.maxV && a.maxV >= b.minV;
}

export function gridCoord(sector: DistrictSector): GridCoord {
  const box = aabb(sector.polygon);
  const width = Math.max(box.maxU - box.minU, 1e-6);
  const height = Math.max(box.maxV - box.minV, 1e-6);
  return {
    col: Math.round((box.minU - SECTOR_GRID_ORIGIN.u) / width),
    row: Math.round((box.minV - SECTOR_GRID_ORIGIN.v) / height),
  };
}

export function chebyshev(a: GridCoord, b: GridCoord) {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
}

const derivedSectorCache = new Map<string, DistrictSector[]>();

function polygonSignature(points: UvPoint[]) {
  return points.map((point) => `${point.u.toFixed(4)},${point.v.toFixed(4)}`).join(";");
}

/** Gespeichertes Gitter, sonst das Standardraster über dem Viertelpolygon. */
export function sectorsForDistrict(
  districtId: CityDistrictId,
  stored: DistrictSectorsByDistrict | null | undefined,
  polygons?: DistrictPolygons | null,
): DistrictSector[] {
  const saved = stored?.[districtId];
  if (saved && saved.length > 0) return saved;
  const district = AURENFURT_DISTRICTS.find((entry) => entry.id === districtId);
  const points =
    polygons?.[districtId]?.points ??
    defaultDistrictPolygons()[districtId]?.points ??
    [];
  if (!district || points.length < 3) return [];
  const key = `${districtId}|v3|${SECTOR_SIZE_DEFAULT}|${polygonSignature(points)}`;
  const cached = derivedSectorCache.get(key);
  if (cached) return cached;
  const sectors = divideDistrictIntoSectors(districtId, district.name, points, {
    width: SECTOR_SIZE_DEFAULT,
    height: SECTOR_SIZE_DEFAULT,
  }).sectors;
  if (derivedSectorCache.size > 24) derivedSectorCache.clear();
  derivedSectorCache.set(key, sectors);
  return sectors;
}

export function sectorsOccupiedByBuilding(
  building: Pick<ReachBuilding, "u" | "v">,
  sectors: DistrictSector[],
): DistrictSector[] {
  if (sectors.length === 0) return [];
  const footprint = {
    minU: building.u - BUILDING_FOOTPRINT_HALF,
    maxU: building.u + BUILDING_FOOTPRINT_HALF,
    minV: building.v - BUILDING_FOOTPRINT_HALF,
    maxV: building.v + BUILDING_FOOTPRINT_HALF,
  };
  const hit = sectors.filter((sector) => rectsOverlap(footprint, aabb(sector.polygon)));
  if (hit.length > 0) return hit;
  let nearest = sectors[0];
  let best = Infinity;
  for (const sector of sectors) {
    const du = sector.centroid.u - building.u;
    const dv = sector.centroid.v - building.v;
    const dist = du * du + dv * dv;
    if (dist < best) {
      best = dist;
      nearest = sector;
    }
  }
  return [nearest];
}

export function sectorsWithinReach(
  origins: DistrictSector[],
  radius: number,
  all: DistrictSector[],
): { sector: DistrictSector; distance: number }[] {
  if (origins.length === 0 || radius < 0) return [];
  const originCoords = origins.map(gridCoord);
  const found: { sector: DistrictSector; distance: number }[] = [];
  for (const sector of all) {
    const coord = gridCoord(sector);
    let distance = Infinity;
    for (const origin of originCoords) {
      distance = Math.min(distance, chebyshev(coord, origin));
    }
    if (distance <= radius) found.push({ sector, distance });
  }
  found.sort((a, b) => a.distance - b.distance || a.sector.label.localeCompare(b.sector.label));
  return found;
}

function falloff(distance: number, radius: number) {
  if (radius < 0) return 0;
  return Math.max(0, 1 - distance / (radius + 1));
}

function isGuardSite(building: ReachBuilding) {
  return building.category === "Wache" || building.category === "Tor";
}

function isCriminalSite(building: ReachBuilding) {
  if (building.id === "malanthir-umschlagplatz") return true;
  if (building.category === "Lager" && building.hotspot >= 70) return true;
  if (building.category === "Taverne" && building.hotspot >= 65) return true;
  return false;
}

export type SectorField = {
  crime: number;
  guard: number;
};

export type SectorCrimeShift = {
  sector: DistrictSector;
  /** Gedeckelte Abweichung vom Viertelwert, dieselbe Spanne wie in sectorField. */
  crimeDelta: number;
};

/**
 * Dieselbe Sektor-Verschiebung wie sectorField, ohne den Viertelwert zu mitteln.
 * Kriminalität liegt in der Simulation je Viertel vor; die Sektoren weichen nur
 * durch Wache und kriminelle Orte in Reichweite ab.
 */
export function sectorCrimeShifts(
  districtId: CityDistrictId,
  buildings: ReachBuilding[],
  npcs: ReachNpc[],
  stored: DistrictSectorsByDistrict | null | undefined,
  polygons?: DistrictPolygons | null,
): SectorCrimeShift[] {
  return sectorShifts(districtId, buildings, npcs, stored, polygons).map((row) => ({
    sector: row.sector,
    crimeDelta: row.crimeDelta,
  }));
}

export type SectorFaithShift = {
  sector: DistrictSector;
  elysiaDelta: number;
  chromusDelta: number;
};

/** Meter, die die Heatmap und das Stadt-Dashboard teilen. */
export const HEATMAP_ASPECTS = [
  { key: "crime", label: "Kriminalität" },
  { key: "economy", label: "Wirtschaft" },
  { key: "guard", label: "Garde" },
  { key: "vattrak", label: "Religion" },
  { key: "malanthir", label: "Malanthir" },
  { key: "refugees", label: "Flüchtlinge" },
  { key: "unemployment", label: "Arbeitslosigkeit" },
  { key: "elysia", label: "Elysia" },
  { key: "chromus", label: "Chromus" },
] as const;

export type HeatmapAspect = (typeof HEATMAP_ASPECTS)[number]["key"];

export type SectorAspectShift = {
  sector: DistrictSector;
} & Record<HeatmapAspect, number>;

export type ReachPoi = {
  u: number;
  v: number;
  districtId: CityDistrictId;
  influences: { aspect: string; delta: number }[];
  reach?: { mode: "sector" | "district"; radius: 0 | 1 | 2 | 3 | 4 };
};

/** Anteil eines POI-Einflussaspekts am Heatmap-/Sim-Meter. */
export function poiAspectWeight(influenceAspect: string, meter: HeatmapAspect): number {
  if (influenceAspect === meter) return 1;
  if (meter === "vattrak" && influenceAspect === "religion") return 0.55;
  if (meter === "vattrak" && influenceAspect === "knowledge") return 0.25;
  if (meter === "economy" && influenceAspect === "prestige") return 0.5;
  if (meter === "malanthir" && influenceAspect === "knowledge") return -0.2;
  if (meter === "guard" && influenceAspect === "crime") return -0.35;
  if (meter === "crime" && influenceAspect === "guard") return -0.35;
  return 0;
}

type FaithBuilding = ReachBuilding & {
  elysia: number;
  chromus: number;
  prosperity?: number;
};
type FaithNpc = ReachNpc & { faith?: "elysia" | "chromus" | null };

/**
 * Dieselbe Sektor-Verteilung wie bei der Kriminalität: Gebäude und Gruppen
 * ziehen die Präsenz auf ihre Sektoren, der Viertelwert bleibt der Mittelwert.
 */
export function sectorFaithShifts(
  districtId: CityDistrictId,
  buildings: FaithBuilding[],
  npcs: FaithNpc[],
  stored: DistrictSectorsByDistrict | null | undefined,
  polygons?: DistrictPolygons | null,
): SectorFaithShift[] {
  const sectors = sectorsForDistrict(districtId, stored, polygons);
  const delta = new Map<string, { elysia: number; chromus: number }>();
  for (const sector of sectors) delta.set(sector.id, { elysia: 0, chromus: 0 });

  for (const building of buildings) {
    if (building.districtId !== districtId) continue;
    const occupied = sectorsOccupiedByBuilding(building, sectors);
    const staff = npcs.filter((npc) => npc.locationId === building.id);
    for (const sector of occupied) {
      const slot = delta.get(sector.id);
      if (!slot) continue;
      slot.elysia += (building.elysia - 35) * 0.12;
      slot.chromus += (building.chromus - 15) * 0.12;
    }
    for (const npc of staff) {
      if (npc.faith !== "elysia" && npc.faith !== "chromus") continue;
      const radius = NPC_SECTOR_REACH[npc.tier] ?? 1;
      const reached = sectorsWithinReach(occupied, radius, sectors);
      for (const { sector, distance } of reached) {
        const weight = Math.max(0, Math.min(1, npc.influence / 100)) * falloff(distance, radius);
        const slot = delta.get(sector.id);
        if (!slot) continue;
        if (npc.faith === "elysia") slot.elysia += 8 * weight;
        else slot.chromus += 8 * weight;
      }
    }
  }

  return sectors.map((sector) => {
    const shift = delta.get(sector.id) ?? { elysia: 0, chromus: 0 };
    return {
      sector,
      elysiaDelta: Math.max(-14, Math.min(18, shift.elysia)),
      chromusDelta: Math.max(-14, Math.min(18, shift.chromus)),
    };
  });
}

function emptyAspectSlot(): Record<HeatmapAspect, number> {
  return {
    crime: 0,
    economy: 0,
    guard: 0,
    vattrak: 0,
    malanthir: 0,
    refugees: 0,
    unemployment: 0,
    elysia: 0,
    chromus: 0,
  };
}

function clampAspect(aspect: HeatmapAspect, value: number) {
  if (aspect === "crime") return Math.max(-10, Math.min(14, value));
  if (aspect === "guard") return Math.max(-8, Math.min(12, value));
  if (aspect === "economy") return Math.max(-10, Math.min(14, value));
  if (aspect === "unemployment") return Math.max(-8, Math.min(12, value));
  if (aspect === "elysia" || aspect === "chromus") return Math.max(-14, Math.min(18, value));
  if (aspect === "vattrak" || aspect === "malanthir") return Math.max(-8, Math.min(10, value));
  return Math.max(-8, Math.min(10, value));
}

/**
 * Sektor-Abweichungen für alle Heatmap-Meter: Gebäude, NPCs und Orte mit Reichweite.
 * Der Viertelwert bleibt der Mittelwert der Sektoren (Zentrierung in der Heatmap).
 */
export function sectorAspectShifts(
  districtId: CityDistrictId,
  buildings: FaithBuilding[],
  npcs: FaithNpc[],
  pois: ReachPoi[],
  stored: DistrictSectorsByDistrict | null | undefined,
  polygons?: DistrictPolygons | null,
): SectorAspectShift[] {
  const sectors = sectorsForDistrict(districtId, stored, polygons);
  const delta = new Map<string, Record<HeatmapAspect, number>>();
  for (const sector of sectors) delta.set(sector.id, emptyAspectSlot());

  const crimeRows = sectorShifts(districtId, buildings, npcs, stored, polygons);
  for (const row of crimeRows) {
    const slot = delta.get(row.sector.id);
    if (!slot) continue;
    slot.crime += row.crimeDelta;
    slot.guard += row.guardDelta;
  }

  const faithRows = sectorFaithShifts(districtId, buildings, npcs, stored, polygons);
  for (const row of faithRows) {
    const slot = delta.get(row.sector.id);
    if (!slot) continue;
    slot.elysia += row.elysiaDelta;
    slot.chromus += row.chromusDelta;
    slot.vattrak += row.elysiaDelta * 0.22 + row.chromusDelta * 0.12;
  }

  for (const building of buildings) {
    if (building.districtId !== districtId) continue;
    const occupied = sectorsOccupiedByBuilding(building, sectors);
    const prosperityPull = ((building.prosperity ?? 3) - 3) * 3.2;
    const unrestPull = (building.hotspot - 35) * 0.12;
    const marketBoost =
      building.category === "Markt"
        ? 6
        : building.category === "Geschäft" || building.category === "Kontor"
          ? 4.5
          : building.category === "Werkstatt" || building.category === "Schmiede"
            ? 3.5
            : building.category === "Taverne"
              ? 3
              : 0;
    const templePull = building.category === "Tempel" ? 4 : 0;
    const unrestRadius = Math.min(
      4,
      BUILDING_ASPECT_REACH + (building.hotspot >= 70 ? 1 : 0) + ((building.prosperity ?? 3) <= 1 ? 1 : 0),
    );
    const reached = sectorsWithinReach(occupied, unrestRadius, sectors);
    for (const { sector, distance } of reached) {
      const weight = falloff(distance, unrestRadius);
      const slot = delta.get(sector.id);
      if (!slot) continue;
      slot.economy += (prosperityPull + marketBoost - unrestPull * 0.85) * weight;
      slot.unemployment += (-prosperityPull * 0.55 - marketBoost * 0.35 + unrestPull * 0.7) * weight;
      slot.crime += unrestPull * 1.1 * weight + ((building.prosperity ?? 3) <= 2 ? (3 - (building.prosperity ?? 3)) * 1.4 * weight : 0);
      slot.vattrak += (templePull + (building.elysia - 35) * 0.05) * weight;
      slot.malanthir += (building.category === "Lager" && building.hotspot >= 70 ? 5 : unrestPull * 0.25) * weight;
      slot.refugees +=
        (building.category === "Tor" ? 2.5 : building.category === "Taverne" ? 1.2 : 0) * weight;
    }
  }

  for (const building of buildings) {
    if (building.districtId !== districtId) continue;
    const occupied = sectorsOccupiedByBuilding(building, sectors);
    const staff = npcs.filter((npc) => npc.locationId === building.id);
    for (const npc of staff) {
      const radius = NPC_SECTOR_REACH[npc.tier] ?? 2;
      const reached = sectorsWithinReach(occupied, radius, sectors);
      for (const { sector, distance } of reached) {
        const weight = Math.max(0, Math.min(1, npc.influence / 100)) * falloff(distance, radius);
        const slot = delta.get(sector.id);
        if (!slot) continue;
        const altruism = (npc.greedyAltruist ?? 0) / 5;
        slot.economy += 3.2 * altruism * weight;
        slot.unemployment -= 2.4 * altruism * weight;
        slot.vattrak += Math.max(0, -npc.loyalCriminal) * 0.35 * weight;
      }
    }
  }

  for (const poi of pois) {
    if (poi.districtId !== districtId) continue;
    const reached = sectorsInPoiInfluence(poi, stored, polygons);
    if (reached.length === 0) continue;
    const radius = resolvePoiRadius(poi);
    for (const { sector, distance } of reached) {
      const weight = Number.isFinite(radius) ? falloff(distance, radius) : distance === 0 ? 1 : 0.72;
      const slot = delta.get(sector.id);
      if (!slot) continue;
      for (const influence of poi.influences) {
        for (const aspect of HEATMAP_ASPECTS) {
          const factor = poiAspectWeight(influence.aspect, aspect.key);
          if (factor === 0) continue;
          slot[aspect.key] += influence.delta * factor * weight;
        }
      }
    }
  }

  return sectors.map((sector) => {
    const shift = delta.get(sector.id) ?? emptyAspectSlot();
    return {
      sector,
      crime: clampAspect("crime", shift.crime),
      economy: clampAspect("economy", shift.economy),
      guard: clampAspect("guard", shift.guard),
      vattrak: clampAspect("vattrak", shift.vattrak),
      malanthir: clampAspect("malanthir", shift.malanthir),
      refugees: clampAspect("refugees", shift.refugees),
      unemployment: clampAspect("unemployment", shift.unemployment),
      elysia: clampAspect("elysia", shift.elysia),
      chromus: clampAspect("chromus", shift.chromus),
    };
  });
}

function sectorShifts(
  districtId: CityDistrictId,
  buildings: ReachBuilding[],
  npcs: ReachNpc[],
  stored: DistrictSectorsByDistrict | null | undefined,
  polygons?: DistrictPolygons | null,
) {
  const sectors = sectorsForDistrict(districtId, stored, polygons);
  const delta = new Map<string, { crime: number; guard: number }>();
  for (const sector of sectors) delta.set(sector.id, { crime: 0, guard: 0 });

  for (const building of buildings) {
    if (building.districtId !== districtId) continue;
    const occupied = sectorsOccupiedByBuilding(building, sectors);
    const staff = npcs.filter((npc) => npc.locationId === building.id);
    const guardSite = isGuardSite(building);
    const criminalSite = isCriminalSite(building);
    for (const npc of staff) {
      const radius = NPC_SECTOR_REACH[npc.tier] ?? 1;
      const reached = sectorsWithinReach(occupied, radius, sectors);
      const guards = guardSite && npc.loyalCriminal <= 0;
      const criminal = npc.loyalCriminal >= 1 || (criminalSite && npc.loyalCriminal > -1);
      for (const { sector, distance } of reached) {
        const weight = Math.max(0, Math.min(1, npc.influence / 100)) * falloff(distance, radius);
        const slot = delta.get(sector.id);
        if (!slot) continue;
        // Klein gehalten: ein Viertel wie der Palast hat nur wenige Sektoren,
        // und eine Wache mit großem Radius darf den Zähler nicht auf 0 drücken.
        if (guards) {
          slot.crime -= 5 * weight;
          slot.guard += 3.5 * weight;
        }
        if (criminal && !guards) {
          slot.crime += 9 * weight;
          slot.guard -= 3.5 * weight;
        }
        const greed = Math.max(0, -(npc.greedyAltruist ?? 0)) / 5;
        const altruism = Math.max(0, npc.greedyAltruist ?? 0) / 5;
        slot.crime += 3.5 * greed * weight;
        slot.crime -= 2.2 * altruism * weight;
        // Dichte Präsenz der Garde beruhigt Crime, erzeugt aber lokalen Druck (Unruhe-Proxy).
        if (guards) slot.crime += 1.2 * weight * 0.35;
      }
    }
  }

  return sectors.map((sector) => {
    const shift = delta.get(sector.id) ?? { crime: 0, guard: 0 };
    return {
      sector,
      crimeDelta: Math.max(-8, Math.min(12, shift.crime)),
      guardDelta: Math.max(-5, Math.min(7, shift.guard)),
    };
  });
}

/**
 * Basiswerte je Sektor, plus lokale Wache und krimineller Einfluss.
 * Der Viertelwert ist danach der Mittelwert der Sektoren.
 */
export function sectorField(
  districtId: CityDistrictId,
  baseCrime: number,
  baseGuard: number,
  buildings: ReachBuilding[],
  npcs: ReachNpc[],
  stored: DistrictSectorsByDistrict | null | undefined,
  polygons?: DistrictPolygons | null,
): { crime: number; guard: number; sectorCount: number } {
  const rows = sectorShifts(districtId, buildings, npcs, stored, polygons);
  if (rows.length === 0) {
    return { crime: baseCrime, guard: baseGuard, sectorCount: 0 };
  }
  let crimeSum = 0;
  let guardSum = 0;
  for (const row of rows) {
    crimeSum += Math.max(0, Math.min(100, baseCrime + row.crimeDelta));
    guardSum += Math.max(0, Math.min(100, baseGuard + row.guardDelta));
  }
  const count = rows.length;
  return {
    crime: crimeSum / count,
    guard: guardSum / count,
    sectorCount: count,
  };
}

export type PoiReachPoint = {
  u: number;
  v: number;
  districtId: CityDistrictId;
  influences: { delta: number }[];
  /** Explizit gesetzt (Admin); sonst Ableitung aus Einflussstärke. */
  reach?: { mode: "sector" | "district"; radius: 0 | 1 | 2 | 3 | 4 };
};

export type PoiReachCell = {
  sector: DistrictSector;
  distance: number;
};

/**
 * Reichweite in Sektor-Schritten aus der Stärke der Einflussfaktoren.
 * Ohne Faktoren nur der eigene Sektor; starke Orte bis zwei Schritte.
 */
export function poiInfluenceRadius(influences: { delta: number }[]): number {
  if (!influences.length) return 0;
  const peak = Math.max(...influences.map((entry) => Math.abs(entry.delta)));
  if (peak >= 5) return 4;
  if (peak >= 3) return 3;
  if (peak >= 2) return 2;
  if (peak >= 1) return 1;
  return 0;
}

function resolvePoiRadius(poi: PoiReachPoint): number {
  if (poi.reach?.mode === "district") return Number.POSITIVE_INFINITY;
  if (poi.reach?.mode === "sector") return poi.reach.radius;
  return poiInfluenceRadius(poi.influences);
}

/** Sektoren im optischen Einflussbereich eines besonderen Orts. */
export function sectorsInPoiInfluence(
  poi: PoiReachPoint,
  stored: DistrictSectorsByDistrict | null | undefined,
  polygons?: DistrictPolygons | null,
): PoiReachCell[] {
  const sectors = sectorsForDistrict(poi.districtId, stored, polygons);
  if (sectors.length === 0) return [];
  const occupied = sectorsOccupiedByBuilding(poi, sectors);
  if (occupied.length === 0) return [];
  const radius = resolvePoiRadius(poi);
  if (!Number.isFinite(radius)) {
    return sectors.map((sector) => {
      const home = occupied.some((entry) => entry.id === sector.id);
      return { sector, distance: home ? 0 : 1 };
    });
  }
  const reached = sectorsWithinReach(occupied, radius, sectors);
  if (reached.length > 0) return reached;
  return occupied.map((sector) => ({ sector, distance: 0 }));
}

/** Sektoren im optischen Einflussbereich eines Gebäudes (NPCs + Standort). */
export function sectorsInBuildingInfluence(
  building: ReachBuilding,
  npcs: ReachNpc[],
  stored: DistrictSectorsByDistrict | null | undefined,
  polygons?: DistrictPolygons | null,
): PoiReachCell[] {
  const sectors = sectorsForDistrict(building.districtId, stored, polygons);
  if (sectors.length === 0) return [];
  const occupied = sectorsOccupiedByBuilding(building, sectors);
  if (occupied.length === 0) return [];
  const staff = npcs.filter((npc) => npc.locationId === building.id);
  const radius = staff.reduce(
    (max, npc) => Math.max(max, NPC_SECTOR_REACH[npc.tier] ?? 1),
    0,
  );
  const reached = sectorsWithinReach(occupied, radius, sectors);
  if (reached.length > 0) return reached;
  return occupied.map((sector) => ({ sector, distance: 0 }));
}

export type BuildingReachReport = {
  id: string;
  name: string;
  /** Sektoren, auf denen das Gebäude steht. */
  occupied: string[];
  radius: number;
  /** Alle Sektoren im Einfluss, inklusive des eigenen. */
  affected: string[];
  kind: "wache" | "kriminell" | "beides" | "keiner";
};

export function reportBuildingReach(
  building: ReachBuilding & { name?: string },
  npcs: ReachNpc[],
  stored?: DistrictSectorsByDistrict | null,
  polygons?: DistrictPolygons | null,
): BuildingReachReport {
  const sectors = sectorsForDistrict(building.districtId, stored, polygons);
  const occupied = sectorsOccupiedByBuilding(building, sectors);
  const staff = npcs.filter((npc) => npc.locationId === building.id);
  const radius = staff.reduce((max, npc) => Math.max(max, NPC_SECTOR_REACH[npc.tier] ?? 1), 0);
  const affected =
    radius > 0 ? sectorsWithinReach(occupied, radius, sectors).map((entry) => entry.sector.address) : occupied.map((sector) => sector.address);
  const guardSite = isGuardSite(building) && staff.some((npc) => npc.loyalCriminal <= 0);
  const criminalSite =
    isCriminalSite(building) || staff.some((npc) => npc.loyalCriminal >= 1);
  const kind = guardSite && criminalSite ? "beides" : guardSite ? "wache" : criminalSite ? "kriminell" : "keiner";
  return {
    id: building.id,
    name: building.name ?? building.id,
    occupied: occupied.map((sector) => sector.address),
    radius,
    affected,
    kind,
  };
}
