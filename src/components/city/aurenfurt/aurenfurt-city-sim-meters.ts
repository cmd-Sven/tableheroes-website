import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { sectorField } from "./aurenfurt-sector-reach";
import { CHROMUS_ROLE, ELYSIA_ROLE } from "./aurenfurt-faith";
import { currentCitySimLive, currentNpcSnaps } from "./aurenfurt-city-sim-store";
import {
  districtVattrak,
  malanthirCrimePush,
  malanthirTarget,
  magicBucket,
  needsMagicSource,
} from "./aurenfurt-city-sim-magic";
import {
  ECON_ROLE,
  GUARD_ROLE,
  REFUGEE_GEO,
  UNEMP_ROLE,
  type HistoryShift,
  type RawMeters,
  type Saturation,
  type SimBuilding,
} from "./aurenfurt-city-sim-types";

export function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
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
      // Rose und Konklave liegen auf denselben Tempel-Orten und drücken das Verbrechen nur leicht extra.
      if (building.category === "Tempel" && building.elysia >= 70) value -= 3;
      if (building.category === "Tempel" && building.chromus >= 70) value -= 2;
      return Math.max(0, Math.min(100, value));
    }),
    35,
  );
}

function crimeFromNpcs(districtId: CityDistrictId) {
  const rows = currentNpcSnaps().filter((npc) => npc.districtId === districtId);
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

function faithFromNpcs(districtId: CityDistrictId) {
  const rows = currentNpcSnaps().filter((npc) => npc.districtId === districtId);
  if (rows.length === 0) return null;
  let weight = 0;
  let elysia = 0;
  let chromus = 0;
  for (const npc of rows) {
    const rowWeight = npc.tierWeight * Math.max(0.35, npc.influence / 100);
    weight += rowWeight;
    if (npc.faith === "elysia") elysia += rowWeight * 78;
    else if (npc.faith === "chromus") chromus += rowWeight * 78;
    else {
      elysia += rowWeight * ELYSIA_ROLE[districtId] * 0.35;
      chromus += rowWeight * CHROMUS_ROLE[districtId] * 0.35;
    }
  }
  if (weight <= 0) return null;
  return { elysia: elysia / weight, chromus: chromus / weight };
}

function streetCrime(districtId: CityDistrictId) {
  const rows = currentCitySimLive().streets.filter((street) => street.districtIds.includes(districtId));
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
  const rows = currentCitySimLive().streets.filter((street) => street.districtIds.includes(districtId));
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
  for (const poi of currentCitySimLive().pois) {
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

export function targetsFor(
  buildings: SimBuilding[],
  sat: Saturation,
  smuggle: number,
  shiftOf: (districtId: CityDistrictId) => HistoryShift,
): Record<CityDistrictId, RawMeters> {
  const live = currentCitySimLive();
  const npcSnaps = currentNpcSnaps();
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

    const roseRites = local.filter((building) => building.category === "Tempel" && building.elysia >= 70).length;
    const conclaveRites = local.filter((building) => building.category === "Tempel" && building.chromus >= 70).length;
    let guard =
      18 +
      GUARD_ROLE[district.id] +
      watches * 8 +
      prosperity * 3 +
      sat.guard * 16 +
      sat.rite * 6 +
      roseRites * 1.5 +
      conclaveRites * 1.2 -
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

    const buildingElysia = mean(
      local.map((building) => building.elysia),
      ELYSIA_ROLE[district.id],
    );
    const buildingChromus = mean(
      local.map((building) => building.chromus),
      CHROMUS_ROLE[district.id],
    );
    const npcFaith = faithFromNpcs(district.id);
    let elysia = ELYSIA_ROLE[district.id] * 0.55 + buildingElysia * 0.45;
    let chromus = CHROMUS_ROLE[district.id] * 0.55 + buildingChromus * 0.45;
    if (npcFaith) {
      elysia = elysia * 0.82 + npcFaith.elysia * 0.18;
      chromus = chromus * 0.82 + npcFaith.chromus * 0.18;
    }
    // Elysia stützt die etablierte Ordnung von Hof und Silberner Rose.
    // Chromus zieht über das Konklave in dieselbe Richtung, erst ab dichter örtlicher Präsenz.
    const elysiaOrder = Math.max(0, elysia - 48) * 0.035;
    const chromusOrder = Math.max(0, chromus - 40) * 0.03;
    crime -= elysiaOrder + chromusOrder;
    guard += elysiaOrder * 0.85 + chromusOrder * 0.7;
    economy += elysiaOrder * 0.4 - chromusOrder * 0.25;

    const shift = shiftOf(district.id);
    out[district.id] = {
      crime: clampScore(crime + shift.crime + poiShift(district.id, "crime")),
      vattrak: clampScore(vattrak),
      malanthir: clampScore(malanthir),
      guard: clampScore(guard + shift.guard + poiShift(district.id, "guard")),
      refugees: clampScore(refugees + shift.refugees + poiShift(district.id, "refugees")),
      economy: clampScore(economy + shift.economy + poiShift(district.id, "economy")),
      unemployment: clampScore(unemployment + shift.unemployment + poiShift(district.id, "unemployment")),
      elysia: clampScore(elysia + shift.elysia + poiShift(district.id, "elysia")),
      chromus: clampScore(chromus + shift.chromus + poiShift(district.id, "chromus")),
    };
  }
  return out;
}
