import {
  CITY_BUILDINGS,
  buildingsInDistrict,
  findBuilding,
  type CityBuilding,
  type CityDistrictId,
  type ProsperityLevel,
  type SpecialBonus,
} from "./aurenfurt-districts";
import { factionName, type FactionId } from "./aurenfurt-factions";

export type { ProsperityLevel, SpecialBonus };

export type KeyLocation = CityBuilding & {
  guildId: FactionId;
  guildName: string;
  prosperityLevel: ProsperityLevel;
  isHotspot: number;
  specialBonus: SpecialBonus;
};

const MAIN_DISTRICTS = [
  "palast",
  "adelsviertel",
  "tempelbezirk",
  "handwerkerviertel",
  "unterstadt",
] as const satisfies readonly CityDistrictId[];

function clampHotspot(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampProsperity(value: number): ProsperityLevel {
  const rounded = Math.max(1, Math.min(5, Math.round(value)));
  return rounded as ProsperityLevel;
}

function asFactionId(id: string): FactionId {
  return id as FactionId;
}

/**
 * Reichert ein Gebäude aus `CITY_BUILDINGS` um den Anzeigenamen der Gilde an.
 * Keine Kriminalitäts-/Wetter-Zeitreihen an Gebäuden.
 */
export function generateKeyLocation(building: CityBuilding): KeyLocation {
  const guildId = asFactionId(building.guildId);
  return {
    ...building,
    guildId,
    guildName: factionName(guildId),
    prosperityLevel: clampProsperity(building.prosperityLevel),
    isHotspot: clampHotspot(building.isHotspot),
    specialBonus: {
      name: building.specialBonus.name,
      effect: building.specialBonus.effect,
    },
  };
}

export function allKeyLocations(): KeyLocation[] {
  return CITY_BUILDINGS.map(generateKeyLocation);
}

export function keyLocationsInDistrict(districtId: CityDistrictId): KeyLocation[] {
  return buildingsInDistrict(districtId).map(generateKeyLocation);
}

export function findKeyLocation(id: string | null): KeyLocation | null {
  const building = findBuilding(id);
  if (!building) return null;
  return generateKeyLocation(building);
}

export function districtHasEnoughKeyLocations(districtId: CityDistrictId, min = 4) {
  return keyLocationsInDistrict(districtId).length >= min;
}

/** Prüft die fünf Hauptviertel (ohne Südtor). */
export function mainDistrictLocationCoverage(min = 4) {
  return MAIN_DISTRICTS.map((id) => ({
    districtId: id,
    count: keyLocationsInDistrict(id).length,
    ok: districtHasEnoughKeyLocations(id, min),
  }));
}
