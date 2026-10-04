import {
  CITY_BUILDINGS,
  type CityBuilding,
  type CityDistrictId,
} from "./aurenfurt-districts";
import {
  buildingCategoryForId,
  categoryToBuildingKind,
  isBuildingCategory,
  type BuildingCategory,
} from "./aurenfurt-building-categories";
import type { AurenfurtStreet } from "./aurenfurt-streets";
import { clampUvPoint, type UvPoint } from "./aurenfurt-district-polygons";

export type MapEditorBuildingRow = {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  map_u: number | null;
  map_v: number | null;
  map_district_id: string | null;
  aurenfurt_street_id: string | null;
  created_via_map_editor: boolean;
  parent_location_id: string | null;
  npc_hint_dismissed_at?: string | null;
};

/** Gebäude aus dem Karten-Editor inkl. Straßen-/Aktiv-Status. */
export type EditorCityBuilding = CityBuilding & {
  category: BuildingCategory;
  streetId: string | null;
  fromEditor: true;
};

const NEAR_STREET_THRESHOLD = 0.085;

/** Wachturm 1–8, Kategorie Wache. „Wachtrum“ fängt die bestehende Schreibweise von Turm 6 ab. */
export function isNumberedWatchtower(name: string, category: BuildingCategory): boolean {
  if (category !== "Wache") return false;
  return /^wach(?:turm|trum)\s*[1-8]$/i.test(name.trim());
}

/** Festungspalast im Palastviertel trägt das Palais-Modell. */
export function isFestungspalast(name: string, category: BuildingCategory): boolean {
  if (category !== "Palast") return false;
  return name.trim().toLowerCase() === "festungspalast";
}

function editorLandmark(name: string, category: BuildingCategory): CityBuilding["landmark"] {
  if (isNumberedWatchtower(name, category)) return "wachturm";
  if (isFestungspalast(name, category)) return "palais";
  return undefined;
}

function distPointToSegment(p: UvPoint, a: UvPoint, b: UvPoint): number {
  const dx = b.u - a.u;
  const dy = b.v - a.v;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) {
    const ou = p.u - a.u;
    const ov = p.v - a.v;
    return Math.hypot(ou, ov);
  }
  const t = Math.max(0, Math.min(1, ((p.u - a.u) * dx + (p.v - a.v) * dy) / lenSq));
  return Math.hypot(p.u - (a.u + t * dx), p.v - (a.v + t * dy));
}

function minDistToPolyline(point: UvPoint, points: UvPoint[]): number {
  if (points.length === 0) return Number.POSITIVE_INFINITY;
  if (points.length === 1) return Math.hypot(point.u - points[0].u, point.v - points[0].v);
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length - 1; i++) {
    min = Math.min(min, distPointToSegment(point, points[i], points[i + 1]));
  }
  return min;
}

/** Straßen, die das Viertel schneiden oder deren Polyline nah am Pin liegt. */
export function nearbyStreetsForBuilding(
  districtId: CityDistrictId,
  pin: UvPoint | null,
  streets: AurenfurtStreet[],
): AurenfurtStreet[] {
  return streets.filter((street) => {
    if (street.districtIds.includes(districtId)) return true;
    if (!pin) return false;
    return minDistToPolyline(pin, street.points) <= NEAR_STREET_THRESHOLD;
  });
}

export function isEditorBuildingActive(streetId: string | null | undefined): boolean {
  return Boolean(streetId && streetId.trim());
}

export function isCityBuildingActive(
  building: Pick<CityBuilding, "fromEditor" | "streetId"> | EditorCityBuilding,
): boolean {
  if (!building.fromEditor) return true;
  return isEditorBuildingActive(building.streetId);
}

export function mapEditorRowToCityBuilding(row: MapEditorBuildingRow): EditorCityBuilding | null {
  const districtId = row.map_district_id as CityDistrictId | null;
  if (
    !districtId ||
    ![
      "suedtor",
      "adelsviertel",
      "tempelbezirk",
      "akademieviertel",
      "unterstadt",
      "handwerkerviertel",
      "palast",
    ].includes(districtId)
  ) {
    return null;
  }
  const category = buildingCategoryForId(row.id, row.type);
  const uv = clampUvPoint({
    u: typeof row.map_u === "number" && Number.isFinite(row.map_u) ? row.map_u : 0.5,
    v: typeof row.map_v === "number" && Number.isFinite(row.map_v) ? row.map_v : 0.5,
  });

  return {
    id: row.id,
    name: row.name,
    kind: categoryToBuildingKind(category),
    districtId,
    u: uv.u,
    v: uv.v,
    summary: (row.description ?? "").trim() || "Über den Karten-Editor angelegt.",
    guildId: isFestungspalast(row.name, category) ? "haeuser-des-nordens" : "zunftbund",
    prosperityLevel: isFestungspalast(row.name, category) ? 5 : 2,
    isHotspot: isFestungspalast(row.name, category) ? 6 : 20,
    specialBonus: {
      name: "Kartengebäude",
      effect: "Noch kein besonderer Bonus hinterlegt.",
    },
    category,
    streetId: row.aurenfurt_street_id,
    fromEditor: true,
    landmark: editorLandmark(row.name, category),
  };
}

export function mergeCityBuildings(
  editorBuildings: CityBuilding[],
  categoryOverrides: Record<string, BuildingCategory> = {},
): CityBuilding[] {
  const byId = new Map<string, CityBuilding>();
  for (const building of CITY_BUILDINGS) {
    const category = buildingCategoryForId(building.id, categoryOverrides[building.id]);
    byId.set(building.id, {
      ...building,
      category,
      kind: categoryToBuildingKind(category),
      fromEditor: false,
      streetId: building.streetId ?? null,
    });
  }
  for (const building of editorBuildings) {
    const category = categoryOverrides[building.id] ?? ("category" in building ? building.category : undefined);
    const resolvedCategory = isBuildingCategory(category) ? category : buildingCategoryForId(building.id);
    const next = {
      ...building,
      category: resolvedCategory,
      kind: categoryToBuildingKind(resolvedCategory),
      landmark: editorLandmark(building.name, resolvedCategory) ?? building.landmark,
    };
    if (!isNumberedWatchtower(building.name, resolvedCategory) && building.landmark === "wachturm") {
      next.landmark = undefined;
    }
    byId.set(building.id, next);
  }
  return Array.from(byId.values());
}

export function findBuildingInList(buildings: CityBuilding[], id: string | null): CityBuilding | null {
  if (!id) return null;
  return buildings.find((building) => building.id === id) ?? null;
}

export function buildingsInDistrictFromList(
  buildings: CityBuilding[],
  districtId: CityDistrictId,
): CityBuilding[] {
  return buildings.filter((building) => building.districtId === districtId);
}
