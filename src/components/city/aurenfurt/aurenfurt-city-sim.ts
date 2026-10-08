/**
 * Tageswerte der Stadt aus knappen Zuflüssen und dem Inhalt der Viertel.
 *
 * Vattrak kommt aus den Bergen und wird nach Priorität verteilt:
 * Adel, dann Wachen, dann zu gleichen Teilen Geistliche, Akademie und Handwerk, zuletzt Bürger.
 * Malanthir kommt als gestrecktes Schmuggelpulver herein und hält länger.
 * Es kann Vattrak ersetzen und treibt danach Kriminalität, Habgier und Untergrundzellen.
 * Die Zähler wirken erst am nächsten Tag aufeinander: der Vortag verschiebt das heutige Ziel,
 * approach zieht den Stand nur ein Stück dorthin. So entsteht ein Ausschlag ohne Schleife im selben Tag.
 * Fraktionsmacht liest die fertigen Zähler und schreibt nicht zurück.
 */

import {
  AURENFURT_DISTRICTS,
  CITY_BUILDINGS,
  type CityBuilding,
  type CityDistrictId,
} from "./aurenfurt-districts";
import {
  buildingCategoryForId,
  isBuildingCategory,
  type BuildingCategory,
} from "./aurenfurt-building-categories";
import type { DistrictPolygons } from "./aurenfurt-district-polygons";
import { sectorField } from "./aurenfurt-sector-reach";
import type { DistrictSectorsByDistrict } from "./aurenfurt-sectors";
import type { CityBond } from "./aurenfurt-bonds";
import type { SimProfile, UndergroundCell } from "./aurenfurt-sim";
import type { WeatherKind } from "./aurenfurt-weather";
import type { CityInfluenceTier } from "@/src/lib/npcs/city-simulation";

export type MagicBucket = "luxury" | "guard" | "rite" | "research" | "craft" | "civic";

const BUCKETS: MagicBucket[] = ["luxury", "guard", "rite", "research", "craft", "civic"];
const P3: MagicBucket[] = ["rite", "research", "craft"];

/** Bedarfseinheiten je Gebäude. Handwerk dürstet stärker, deshalb bleibt seine Sättigung niedriger. */
const DEMAND_PER: Record<MagicBucket, number> = {
  luxury: 6,
  guard: 4,
  rite: 3.48,
  research: 6.25,
  craft: 13.5,
  civic: 8,
};

/** Anteil des Bergvorrats, den eine Stufe höchstens bindet, damit zusätzliche Wachtürme die Tempel nicht aussperren. */
const P1_CAP = 0.3;
const P2_CAP = 0.2;

const MOUNTAIN_BASE = 85;

const ALPHA = {
  crime: 0.35,
  vattrak: 0.18,
  malanthir: 0.06,
  guard: 0.22,
  refugees: 0.06,
  economy: 0.08,
  unemployment: 0.05,
} as const;

const MAL_BASE: Record<CityDistrictId, number> = {
  unterstadt: 38,
  suedtor: 10,
  handwerkerviertel: 6,
  tempelbezirk: 24,
  akademieviertel: 25,
  palast: 9,
  adelsviertel: 6,
};

/** Gegenwart der Garde, unabhängig davon, wie viele Wachhäuser schon als Gebäude existieren. */
const GUARD_ROLE: Record<CityDistrictId, number> = {
  palast: 36,
  adelsviertel: 22,
  tempelbezirk: 29,
  akademieviertel: 29,
  handwerkerviertel: -2,
  suedtor: 18,
  unterstadt: -4,
};

const ECON_ROLE: Record<CityDistrictId, number> = {
  palast: 2,
  adelsviertel: -2,
  tempelbezirk: -4,
  akademieviertel: -4,
  handwerkerviertel: 13,
  suedtor: 6,
  unterstadt: -8,
};

const UNEMP_ROLE: Record<CityDistrictId, number> = {
  palast: 10,
  adelsviertel: 9,
  tempelbezirk: 26,
  akademieviertel: 12,
  handwerkerviertel: 13,
  suedtor: 9,
  unterstadt: 32,
};

const CIVIC_PULL: Record<CityDistrictId, number> = {
  unterstadt: 16,
  suedtor: 4,
  handwerkerviertel: 2,
  tempelbezirk: 2,
  akademieviertel: 2,
  palast: 1,
  adelsviertel: 1,
};

const REFUGEE_GEO: Record<CityDistrictId, number> = {
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
};

export type HistoryShift = {
  crime: number;
  guard: number;
  refugees: number;
  economy: number;
  unemployment: number;
  cells: { name: string; delta: number }[];
};

type Saturation = Record<MagicBucket, number>;

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

export function magicBucket(building: Pick<SimBuilding, "id" | "districtId" | "category">): MagicBucket {
  const category = building.category;
  if (category === "Wache" || category === "Tor") return "guard";
  if (category === "Tempel") return "rite";
  if (category === "Akademie" || category === "Bibliothek") return "research";
  if (category === "Schmiede" || category === "Werkstatt") return "craft";
  if (category === "Palast") return "luxury";
  if (
    (building.districtId === "palast" || building.districtId === "adelsviertel") &&
    (category === "Kontor" || category === "Wohnhaus")
  ) {
    return "luxury";
  }
  if (building.districtId === "handwerkerviertel" && category === "Kontor") return "craft";
  return "civic";
}

export function needsMagicSource(building: Pick<SimBuilding, "id" | "category">) {
  return building.category === "Schmiede" || building.id === "observatorium";
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
    active: building.fromEditor ? Boolean(building.streetId) : true,
    u: building.u,
    v: building.v,
  };
}

function activeBuildings(): SimBuilding[] {
  const source = live.buildings ?? CITY_BUILDINGS.map(simBuildingFromCity);
  return source.filter((building) => building.active);
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

function demandTotals(buildings: SimBuilding[]) {
  const totals = Object.fromEntries(BUCKETS.map((bucket) => [bucket, 0])) as Record<MagicBucket, number>;
  for (const building of buildings) {
    totals[magicBucket(building)] += DEMAND_PER[magicBucket(building)];
  }
  return totals;
}

function allocate(supply: number, demand: Record<MagicBucket, number>): Saturation {
  let left = Math.max(0, supply);
  const got = Object.fromEntries(BUCKETS.map((bucket) => [bucket, 0])) as Record<MagicBucket, number>;
  const take = (bucket: MagicBucket, amount: number) => {
    const given = Math.min(left, Math.max(0, amount));
    got[bucket] += given;
    left -= given;
  };

  take("luxury", Math.min(demand.luxury, supply * P1_CAP));
  take("guard", Math.min(demand.guard, supply * P2_CAP));

  let pool = left;
  let open: MagicBucket[] = [...P3];
  for (let round = 0; round < 4 && open.length > 0 && pool > 0.001; round += 1) {
    const share = pool / open.length;
    let spent = 0;
    const next: MagicBucket[] = [];
    for (const bucket of open) {
      const room = Math.max(0, demand[bucket] - got[bucket]);
      const given = Math.min(share, room);
      got[bucket] += given;
      spent += given;
      if (demand[bucket] - got[bucket] > 0.05) next.push(bucket);
    }
    pool -= spent;
    if (spent <= 0.001) break;
    open = next;
  }
  left = pool;
  take("civic", demand.civic);

  return Object.fromEntries(
    BUCKETS.map((bucket) => [bucket, demand[bucket] <= 0 ? 0 : Math.min(1, got[bucket] / demand[bucket])]),
  ) as Saturation;
}

function districtVattrak(districtId: CityDistrictId, sat: Saturation) {
  const luxury = sat.luxury * 96;
  const rite = sat.rite * 100;
  const research = sat.research * 100;
  const craft = sat.craft * 100;
  const civic = sat.civic * 36;
  const guard = sat.guard * 78;
  switch (districtId) {
    case "palast":
      return luxury * 0.9 + rite * 0.1;
    case "adelsviertel":
      return luxury * 0.74 + civic * 0.14 + guard * 0.12;
    case "tempelbezirk":
      return rite * 1.04;
    case "akademieviertel":
      return research * 1.08;
    case "handwerkerviertel":
      return craft * 1.05 + civic * 0.08;
    case "suedtor":
      return guard * 0.48 + civic * 0.52 + 6;
    case "unterstadt":
      return guard * 0.2 + civic * 0.8;
    default:
      return 0;
  }
}

function malanthirTarget(districtId: CityDistrictId, sat: Saturation, smuggleDelta: number) {
  const craftGap = districtId === "handwerkerviertel" ? (1 - sat.craft) * 10 : (1 - sat.craft) * 0.3;
  const raw = MAL_BASE[districtId] + CIVIC_PULL[districtId] * (1 - sat.civic) + craftGap;
  return raw * (1 + smuggleDelta);
}

function weatherSupplyFactor(kind: WeatherKind) {
  if (kind === "snow") return 0.78;
  if (kind === "frost") return 0.88;
  if (kind === "storm") return 0.92;
  if (kind === "rain") return 0.96;
  return 1;
}

function mountainSupply(kind: WeatherKind, winter: number, hunger: number) {
  const shortage = Math.min(0.72, winter * 0.42 + hunger * 0.16);
  return MOUNTAIN_BASE * (1 - shortage) * weatherSupplyFactor(kind);
}

function smuggleFactor(winter: number, hunger: number, unrest: number, tolls: number) {
  return 1 + tolls * 0.4 + hunger * 0.3 + unrest * 0.22 + winter * 0.12;
}

/** Unter 20 kaum, danach immer schärfer. */
export function malanthirCrimePush(malanthir: number) {
  if (malanthir <= 20) return malanthir * 0.1;
  if (malanthir <= 40) return 2 + (malanthir - 20) / 3;
      return 2 + 20 / 3 + (malanthir - 40) / 2.1;
}

function mean(values: number[], fallback: number) {
  if (values.length === 0) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function crimeFromBuildings(buildings: SimBuilding[]) {
  if (buildings.length === 0) return 35;
  return mean(
    buildings.map((building) => {
      let value = building.hotspot * 0.62 + (5 - building.prosperity) * 7;
      if (building.category === "Taverne" || building.category === "Markt") value += 10;
      if (building.category === "Lager") value += 8;
      if (building.category === "Wache" || building.category === "Tor") value -= 16;
      if (building.category === "Palast" || building.category === "Tempel") value -= 8;
      return Math.max(0, Math.min(100, value));
    }),
    35,
  );
}

function crimeFromNpcs(districtId: CityDistrictId) {
  const rows = npcSnaps.filter((npc) => npc.districtId === districtId);
  if (rows.length === 0) return null;
  let weight = 0;
  let acc = 0;
  for (const npc of rows) {
    const criminal = ((npc.loyalCriminal + 5) / 10) * 100;
    const greed = ((5 - npc.greedyAltruist) / 10) * 100;
    const influence = Math.max(0.35, npc.influence / 100);
    const rowWeight = npc.tierWeight * influence;
    acc += rowWeight * (criminal * 0.72 + greed * 0.28);
    weight += rowWeight;
  }
  return weight > 0 ? acc / weight : null;
}

function streetCrime(districtId: CityDistrictId) {
  const rows = live.streets.filter((street) => street.districtIds.includes(districtId));
  if (rows.length === 0) return null;
  let weight = 0;
  let acc = 0;
  for (const street of rows) {
    const categoryWeight = street.category === "alley" ? 1.45 : street.category === "side" ? 1.1 : 0.85;
    const rowWeight = Math.max(1, street.segments) * categoryWeight;
    const score = street.crime * 0.62 + (100 - street.security) * 0.28 + (100 - street.condition) * 0.1;
    acc += rowWeight * score;
    weight += rowWeight;
  }
  return weight > 0 ? acc / weight : null;
}

function streetEconomy(districtId: CityDistrictId) {
  const rows = live.streets.filter((street) => street.districtIds.includes(districtId));
  if (rows.length === 0) return null;
  let weight = 0;
  let acc = 0;
  for (const street of rows) {
    const categoryWeight = street.category === "main" ? 1.35 : street.category === "side" ? 1 : 0.7;
    const rowWeight = Math.max(1, street.segments) * categoryWeight;
    const score = street.traffic * 0.55 + street.condition * 0.3 + street.security * 0.15;
    acc += rowWeight * score;
    weight += rowWeight;
  }
  return weight > 0 ? acc / weight : null;
}

function poiShift(districtId: CityDistrictId, aspect: string) {
  let sum = 0;
  for (const poi of live.pois) {
    if (poi.districtId !== districtId) continue;
    for (const influence of poi.influences) {
      if (influence.aspect === aspect) sum += influence.delta;
      if (aspect === "vattrak" && influence.aspect === "religion") sum += influence.delta * 0.4;
      if (aspect === "vattrak" && influence.aspect === "knowledge") sum += influence.delta * 0.25;
      if (aspect === "economy" && influence.aspect === "prestige") sum += influence.delta * 0.5;
      if (aspect === "malanthir" && influence.aspect === "knowledge") sum -= influence.delta * 0.2;
    }
  }
  const cap = aspect === "vattrak" || aspect === "malanthir" ? 4 : 8;
  return Math.max(-cap, Math.min(cap, sum));
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

type RawMeters = {
  crime: number;
  vattrak: number;
  malanthir: number;
  guard: number;
  refugees: number;
  economy: number;
  unemployment: number;
};

function targetsFor(
  buildings: SimBuilding[],
  sat: Saturation,
  smuggle: number,
  shiftOf: (districtId: CityDistrictId) => HistoryShift,
): Record<CityDistrictId, RawMeters> {
  const out = {} as Record<CityDistrictId, RawMeters>;
  for (const district of AURENFURT_DISTRICTS) {
    const local = buildings.filter((building) => building.districtId === district.id);
    const civicBuildings = local.filter((building) => magicBucket(building) === "civic").length;
    const civicShare = local.length === 0 ? 0 : civicBuildings / local.length;
    const malanthir = malanthirTarget(district.id, sat, smuggle) + poiShift(district.id, "malanthir");
    const vattrak = districtVattrak(district.id, sat) + poiShift(district.id, "vattrak");
    const prosperity = mean(
      local.map((building) => building.prosperity),
      3,
    );
    const watches = local.filter((building) => magicBucket(building) === "guard").length;
    const buildingCrime = crimeFromBuildings(local);
    const npcCrime = crimeFromNpcs(district.id);
    const roads = streetCrime(district.id);
    let crime =
      buildingCrime * 0.62 +
      (npcCrime ?? buildingCrime) * 0.38 -
      sat.guard * 7 -
      sat.rite * 6 +
      malanthirCrimePush(malanthir);
    if (roads != null) crime = crime * 0.74 + roads * 0.26;

    const forgesDark = local.some((building) => needsMagicSource(building) && magicBucket(building) === "craft")
      ? Math.max(0, 0.45 - sat.craft) * 28
      : 0;
    const researchDark =
      district.id === "akademieviertel" ? Math.max(0, 0.62 - sat.research) * 18 : 0;
    let economy =
      prosperity * 15.5 +
      sat.luxury * 12 +
      sat.craft * 18 +
      ECON_ROLE[district.id] +
      (district.id === "suedtor" ? 8 : 0) -
      forgesDark -
      researchDark -
      malanthir * 0.06;
    const trade = streetEconomy(district.id);
    if (trade != null) economy = economy * 0.82 + trade * 0.18;

    let guard =
      18 +
      GUARD_ROLE[district.id] +
      watches * 8 +
      prosperity * 3 +
      sat.guard * 16 +
      sat.rite * 6 -
      Math.max(0, malanthir - 18) * 0.72;

    const localField = sectorField(
      district.id,
      crime,
      guard,
      local,
      npcSnaps,
      live.sectors,
      live.polygons,
    );
    crime = localField.crime;
    guard = localField.guard;

    const refugees = REFUGEE_GEO[district.id] + (1 - sat.civic) * 6 - sat.guard * 4;
    const unemployment =
      Math.max(0, 100 - prosperity * 18) * 0.28 +
      civicShare * (1 - sat.civic) * 22 +
      refugees * 0.05 +
      UNEMP_ROLE[district.id] -
      sat.craft * 6 -
      sat.luxury * 4;

    const shift = shiftOf(district.id);
    out[district.id] = {
      crime: clampScore(crime + shift.crime + poiShift(district.id, "crime")),
      vattrak: clampScore(vattrak),
      malanthir: clampScore(malanthir),
      guard: clampScore(guard + shift.guard + poiShift(district.id, "guard")),
      refugees: clampScore(refugees + shift.refugees + poiShift(district.id, "refugees")),
      economy: clampScore(economy + shift.economy + poiShift(district.id, "economy")),
      unemployment: clampScore(unemployment + shift.unemployment + poiShift(district.id, "unemployment")),
    };
  }
  return out;
}

/** Wie viel Raum Zellen noch haben. Dichte Garde und reichliches Vattrak drücken, löschen aber nicht. */
export function undergroundRoom(guard: number, vattrak: number) {
  const guardPressure = Math.max(0, guard - 42) / 190;
  const ritePressure = Math.max(0, vattrak - 55) / 320;
  return Math.max(0.5, 1 - guardPressure - ritePressure);
}

const FEEDBACK_CAP = 14;

function capDelta(delta: number) {
  return Math.max(-FEEDBACK_CAP, Math.min(FEEDBACK_CAP, delta));
}

/**
 * Verschiebt die strukturellen Tagesziele mit dem Stand von gestern.
 * Hohe Wirtschaft dämpft Notverbrechen, hohe Kriminalität vertreibt Händler.
 * Malanthir treibt Kriminalität und Habgier, Vattrak beruhigt und dämpft die Kopplung.
 * Hohe Kriminalität ruft die Garde; die Garde selbst engt die Zellen erst über undergroundRoom ein.
 */
export function applyDistrictFeedback(base: RawMeters, prior: RawMeters | null): RawMeters {
  if (!prior) return base;
  const calm = 1 - Math.min(100, Math.max(0, prior.vattrak)) / 280;

  const necessityCrime = Math.max(0, 42 - prior.economy) * 0.32;
  const prosperityCalm = Math.max(0, prior.economy - 48) * 0.18;
  const malanthirCrime = prior.malanthir * 0.1;
  const vattrakCalm = prior.vattrak * 0.05;
  const guardOrder = Math.max(0, prior.guard - 55) * 0.1;
  const crimeDelta = (necessityCrime - prosperityCalm + malanthirCrime - vattrakCalm - guardOrder) * calm;

  const merchantFlight = Math.max(0, prior.crime - 32) * 0.16;
  const vattrakTrade = Math.max(0, prior.vattrak - 50) * 0.04;
  const economyDelta = (-merchantFlight + vattrakTrade) * calm;

  const calledGuard = Math.max(0, prior.crime - 28) * 0.2;
  const vattrakOrder = prior.vattrak * 0.03;
  const malanthirRot = Math.max(0, prior.malanthir - 20) * 0.06;
  const guardDelta = (calledGuard + vattrakOrder - malanthirRot) * calm;

  const greedFromDisorder = Math.max(0, prior.crime - 45) * 0.1;
  const greedFromWealth = Math.max(0, prior.economy - 72) * (prior.malanthir / 100) * 0.08;
  const vattrakPurge = Math.max(0, prior.vattrak - 50) * 0.08;
  const malanthirDelta = (greedFromDisorder + greedFromWealth - vattrakPurge) * calm;

  const malanthirSiphon = Math.max(0, prior.malanthir - 25) * 0.05;
  const vattrakDelta = -malanthirSiphon * calm;

  const joblessness = Math.max(0, 40 - prior.economy) * 0.2 + prior.malanthir * 0.05;
  const hiring = Math.max(0, prior.economy - 60) * 0.08;
  const unemploymentDelta = (joblessness - hiring) * calm;

  return {
    crime: clampScore(base.crime + capDelta(crimeDelta)),
    economy: clampScore(base.economy + capDelta(economyDelta)),
    guard: clampScore(base.guard + capDelta(guardDelta)),
    malanthir: clampScore(base.malanthir + capDelta(malanthirDelta)),
    vattrak: clampScore(base.vattrak + capDelta(vattrakDelta)),
    unemployment: clampScore(base.unemployment + capDelta(unemploymentDelta)),
    refugees: base.refugees,
  };
}

function cellsFor(districtId: CityDistrictId, malanthir: number, guard: number, vattrak: number, shift: HistoryShift): UndergroundCell[] {
  const district = AURENFURT_DISTRICTS.find((entry) => entry.id === districtId);
  if (!district) return [];
  const factor = 0.35 + malanthir / 120;
  const brand = malanthir > 40 ? (malanthir - 40) * 0.45 : 0;
  const room = undergroundRoom(guard, vattrak);
  return district.sim.underground.flatMap((cell) => {
    const hist = shift.cells.find((entry) => entry.name === cell.name)?.delta ?? 0;
    const strength = clampScore((cell.strength * factor + hist + brand) * room);
    if (strength < 1) return [];
    return [{ name: cell.name, strength }];
  });
}

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

export function simulateCityRange(context: CitySimContext) {
  const buildings = activeBuildings();
  const demand = demandTotals(buildings);
  const series = new Map<number, Record<CityDistrictId, SimProfile>>();
  let previous: Record<CityDistrictId, RawMeters> | null = null;
  const anchorSmuggle = smuggleFactor(
    context.eventWeight("winter", context.anchor),
    context.eventWeight("hunger", context.anchor),
    context.eventWeight("aufstand", context.anchor),
    context.eventWeight("zoelle", context.anchor),
  );

  for (let day = context.from; day <= context.to; day += context.dayMs) {
    const kind =
      live.liveWeatherKind && day === context.today ? live.liveWeatherKind : context.weatherKind(day);
    const winter = context.eventWeight("winter", day);
    const hunger = context.eventWeight("hunger", day);
    const supply = mountainSupply(kind, winter, hunger);
    const sat = allocate(supply, demand);
    const smuggle =
      smuggleFactor(winter, hunger, context.eventWeight("aufstand", day), context.eventWeight("zoelle", day)) /
        anchorSmuggle -
      1;
    const target = targetsFor(buildings, sat, smuggle, (districtId) => context.historyShift(districtId, day));
    const shown = {} as Record<CityDistrictId, RawMeters>;
    const profiles = {} as Record<CityDistrictId, SimProfile>;

    for (const district of AURENFURT_DISTRICTS) {
      const prior = previous?.[district.id] ?? null;
      const aimed = applyDistrictFeedback(target[district.id], prior);
      const next: RawMeters = {
        crime: approach(prior?.crime ?? null, aimed.crime, ALPHA.crime),
        vattrak: approach(prior?.vattrak ?? null, aimed.vattrak, ALPHA.vattrak),
        malanthir: approach(prior?.malanthir ?? null, aimed.malanthir, ALPHA.malanthir),
        guard: approach(prior?.guard ?? null, aimed.guard, ALPHA.guard),
        refugees: approach(prior?.refugees ?? null, aimed.refugees, ALPHA.refugees),
        economy: approach(prior?.economy ?? null, aimed.economy, ALPHA.economy),
        unemployment: approach(prior?.unemployment ?? null, aimed.unemployment, ALPHA.unemployment),
      };
      shown[district.id] = next;
      const shift = context.historyShift(district.id, day);
      profiles[district.id] = {
        crime: next.crime,
        vattrak: next.vattrak,
        malanthir: next.malanthir,
        guard: next.guard,
        refugees: next.refugees,
        economy: next.economy,
        unemployment: next.unemployment,
        underground: cellsFor(district.id, next.malanthir, next.guard, next.vattrak, shift),
      };
    }
    series.set(day, profiles);
    previous = shown;
  }

  return series;
}

function approach(prev: number | null, target: number, alpha: number) {
  if (prev == null) return target;
  return prev + alpha * (target - prev);
}
