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
export const BUILDING_FOOTPRINT_HALF = 0.008;

/** Chebyshev-Schritte, eigener Sektor immer dabei. */
export const NPC_SECTOR_REACH: Record<CityInfluenceTier, number> = {
  local: 1,
  regional_economy: 2,
  authority_faction: 3,
  apex_global: 4,
};

export type ReachNpc = {
  locationId: string | null;
  tier: CityInfluenceTier;
  influence: number;
  loyalCriminal: number;
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
  const key = `${districtId}|${polygonSignature(points)}`;
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
  const sectors = sectorsForDistrict(districtId, stored, polygons);
  if (sectors.length === 0) {
    return { crime: baseCrime, guard: baseGuard, sectorCount: 0 };
  }
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
          slot.crime -= 4 * weight;
          slot.guard += 3 * weight;
        }
        if (criminal && !guards) {
          slot.crime += 8 * weight;
          slot.guard -= 3 * weight;
        }
      }
    }
  }

  let crimeSum = 0;
  let guardSum = 0;
  for (const sector of sectors) {
    const shift = delta.get(sector.id) ?? { crime: 0, guard: 0 };
    const crimeDelta = Math.max(-6, Math.min(10, shift.crime));
    const guardDelta = Math.max(-4, Math.min(5, shift.guard));
    crimeSum += Math.max(0, Math.min(100, baseCrime + crimeDelta));
    guardSum += Math.max(0, Math.min(100, baseGuard + guardDelta));
  }
  const count = sectors.length;
  return {
    crime: crimeSum / count,
    guard: guardSum / count,
    sectorCount: count,
  };
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
