import {
  AURENFURT_DISTRICTS,
  CITY_BUILDINGS,
  type CityBuilding,
  type CityDistrictId,
} from "./aurenfurt-districts";
import { buildingCategoryForId, isBuildingCategory } from "./aurenfurt-building-categories";
import { sectorCrimeShifts, sectorFaithShifts } from "./aurenfurt-sector-reach";
import { faithPresenceForBuilding } from "./aurenfurt-faith";
import type { CityBond } from "./aurenfurt-bonds";
import type { CityActor, CitySimEvent } from "./aurenfurt-pressure";
import type { CitySimLive, NpcSimSnap, SimBuilding } from "./aurenfurt-city-sim-types";

type Listener = () => void;

let version = 0;
const listeners = new Set<Listener>();
let live: CitySimLive = {
  buildings: null,
  streets: [],
  pois: [],
  liveWeatherKind: null,
  sectors: null,
  polygons: null,
};
let npcSnaps: NpcSimSnap[] = [];
let cityBondList: CityBond[] = [];
let pressureActors: CityActor[] = [];
let pressureEvents: CitySimEvent[] = [];
let pressureSignature = "";

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

export function citySimVersion() {
  return version;
}

export function subscribeCitySim(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setCitySimLive(next: CitySimLive) {
  const signature = JSON.stringify(next);
  if (signature === JSON.stringify(live)) return;
  live = next;
  emit();
}

export function bindNpcSnaps(snaps: NpcSimSnap[]) {
  npcSnaps = snaps;
  emit();
}

export function bindCityBonds(next: CityBond[]) {
  if (JSON.stringify(next) === JSON.stringify(cityBondList)) return;
  cityBondList = next;
  emit();
}

export function cityBonds() {
  return cityBondList;
}

export function bindCityPressure(actors: CityActor[], events: CitySimEvent[]) {
  const signature = JSON.stringify({ actors, events });
  if (signature === pressureSignature) return;
  pressureSignature = signature;
  pressureActors = actors;
  pressureEvents = events;
  emit();
}

export function cityPressureActors() {
  return pressureActors;
}

export function cityPressureEvents() {
  return pressureEvents;
}

/** Intern für die Simulationsmodule: aktueller Live-Stand. Nicht Teil der öffentlichen API. */
export function currentCitySimLive() {
  return live;
}

/** Intern für die Simulationsmodule: aktuelle NPC-Schnappschüsse. Nicht Teil der öffentlichen API. */
export function currentNpcSnaps() {
  return npcSnaps;
}

export function simBuildingFromCity(building: CityBuilding): SimBuilding {
  const category = isBuildingCategory(building.category)
    ? building.category
    : buildingCategoryForId(building.id, building.category);
  return {
    id: building.id,
    districtId: building.districtId,
    category,
    prosperity: building.prosperityLevel,
    hotspot: building.isHotspot,
    ...faithPresenceForBuilding(building),
    active: building.fromEditor ? Boolean(building.streetId) : true,
    u: building.u,
    v: building.v,
  };
}

export function activeBuildings(): SimBuilding[] {
  const source = live.buildings ?? CITY_BUILDINGS.map(simBuildingFromCity);
  return source.filter((building) => building.active);
}

/** Sektoren der ganzen Stadt mit der Glaubens-Abweichung aus Gebäuden und Gruppen. */
export function liveSectorFaithDeltas() {
  const buildings = activeBuildings();
  return AURENFURT_DISTRICTS.flatMap((district) =>
    sectorFaithShifts(district.id, buildings, npcSnaps, live.sectors, live.polygons),
  );
}

/** Sektoren der ganzen Stadt mit der Kriminalitäts-Abweichung aus sectorField. */
export function liveSectorCrimeDeltas() {
  const buildings = activeBuildings();
  return AURENFURT_DISTRICTS.flatMap((district) =>
    sectorCrimeShifts(district.id, buildings, npcSnaps, live.sectors, live.polygons),
  );
}

export function buildingWeights(): Record<CityDistrictId, number> {
  const weights = Object.fromEntries(AURENFURT_DISTRICTS.map((district) => [district.id, 1])) as Record<
    CityDistrictId,
    number
  >;
  for (const building of activeBuildings()) {
    weights[building.districtId] += 1;
  }
  return weights;
}
