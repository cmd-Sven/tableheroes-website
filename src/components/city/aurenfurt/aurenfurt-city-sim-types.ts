import type { CityDistrictId } from "./aurenfurt-districts";
import type { BuildingCategory } from "./aurenfurt-building-categories";
import type { DistrictPolygons } from "./aurenfurt-district-polygons";
import type { DistrictSectorsByDistrict } from "./aurenfurt-sectors";
import type { WeatherKind } from "./aurenfurt-weather";
import type { CityInfluenceTier } from "@/src/lib/npcs/city-simulation";

export type MagicBucket = "luxury" | "guard" | "rite" | "research" | "craft" | "civic";

export const BUCKETS: MagicBucket[] = ["luxury", "guard", "rite", "research", "craft", "civic"];
export const P3: MagicBucket[] = ["rite", "research", "craft"];

/** Bedarfseinheiten je Gebäude. Handwerk dürstet stärker, deshalb bleibt seine Sättigung niedriger. */
export const DEMAND_PER: Record<MagicBucket, number> = {
  luxury: 6,
  guard: 4,
  rite: 3.48,
  research: 6.25,
  craft: 13.5,
  civic: 8,
};

/** Anteil des Bergvorrats, den eine Stufe höchstens bindet, damit zusätzliche Wachtürme die Tempel nicht aussperren. */
export const P1_CAP = 0.3;
export const P2_CAP = 0.2;

export const MOUNTAIN_BASE = 85;

export const ALPHA = {
  crime: 0.35,
  vattrak: 0.18,
  malanthir: 0.06,
  guard: 0.22,
  refugees: 0.06,
  economy: 0.08,
  unemployment: 0.05,
  elysia: 0.05,
  chromus: 0.07,
} as const;

export const MAL_BASE: Record<CityDistrictId, number> = {
  unterstadt: 38,
  suedtor: 10,
  handwerkerviertel: 6,
  tempelbezirk: 24,
  akademieviertel: 25,
  palast: 9,
  adelsviertel: 6,
};

/** Gegenwart der Garde, unabhängig davon, wie viele Wachhäuser schon als Gebäude existieren. */
export const GUARD_ROLE: Record<CityDistrictId, number> = {
  palast: 36,
  adelsviertel: 22,
  tempelbezirk: 29,
  akademieviertel: 29,
  handwerkerviertel: -2,
  suedtor: 18,
  unterstadt: -4,
};

export const ECON_ROLE: Record<CityDistrictId, number> = {
  palast: 2,
  adelsviertel: -2,
  tempelbezirk: -4,
  akademieviertel: -4,
  handwerkerviertel: 13,
  suedtor: 6,
  unterstadt: -8,
};

export const UNEMP_ROLE: Record<CityDistrictId, number> = {
  palast: 10,
  adelsviertel: 9,
  tempelbezirk: 26,
  akademieviertel: 12,
  handwerkerviertel: 13,
  suedtor: 9,
  unterstadt: 32,
};

export const CIVIC_PULL: Record<CityDistrictId, number> = {
  unterstadt: 16,
  suedtor: 4,
  handwerkerviertel: 2,
  tempelbezirk: 2,
  akademieviertel: 2,
  palast: 1,
  adelsviertel: 1,
};

export const REFUGEE_GEO: Record<CityDistrictId, number> = {
  suedtor: 78,
  unterstadt: 86,
  handwerkerviertel: 36,
  tempelbezirk: 28,
  akademieviertel: 10,
  adelsviertel: 12,
  palast: 4,
};

export type SimBuilding = {
  id: string;
  districtId: CityDistrictId;
  category: BuildingCategory;
  prosperity: number;
  hotspot: number;
  elysia: number;
  chromus: number;
  active: boolean;
  u: number;
  v: number;
};

export type SimStreet = {
  districtIds: CityDistrictId[];
  category: "main" | "side" | "alley";
  crime: number;
  security: number;
  condition: number;
  traffic: number;
  segments: number;
};

export type SimPoi = {
  districtId: CityDistrictId;
  influences: { aspect: string; delta: number }[];
};

export type CitySimLive = {
  buildings: SimBuilding[] | null;
  streets: SimStreet[];
  pois: SimPoi[];
  liveWeatherKind: WeatherKind | null;
  /** null: Standardraster. Gespeicherte Sektoren kommen aus aurenfurt-district-sectors-v2. */
  sectors: DistrictSectorsByDistrict | null;
  polygons: DistrictPolygons | null;
};

export type NpcSimSnap = {
  districtId: CityDistrictId;
  loyalCriminal: number;
  greedyAltruist: number;
  influence: number;
  tierWeight: number;
  tier: CityInfluenceTier;
  locationId: string | null;
  /** Linie der Elysia, des Chromus, oder keiner von beiden. */
  faith: "elysia" | "chromus" | null;
};

export type HistoryShift = {
  crime: number;
  guard: number;
  refugees: number;
  economy: number;
  unemployment: number;
  elysia: number;
  chromus: number;
  cells: { name: string; delta: number }[];
};

export type Saturation = Record<MagicBucket, number>;

export type RawMeters = {
  crime: number;
  vattrak: number;
  malanthir: number;
  guard: number;
  refugees: number;
  economy: number;
  unemployment: number;
  elysia: number;
  chromus: number;
};

export type CitySimContext = {
  from: number;
  to: number;
  dayMs: number;
  today: number;
  /** Tag, dessen Schmuggel- und Berglage die Vergleichsbasis ist. */
  anchor: number;
  weatherKind: (day: number) => WeatherKind;
  eventWeight: (id: string, day: number) => number;
  historyShift: (districtId: CityDistrictId, day: number) => HistoryShift;
};
