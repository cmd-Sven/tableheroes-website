import type { CityDistrictId } from "./aurenfurt-districts";
import type { WeatherKind } from "./aurenfurt-weather";
import {
  BUCKETS,
  CIVIC_PULL,
  DEMAND_PER,
  MAL_BASE,
  MOUNTAIN_BASE,
  P1_CAP,
  P2_CAP,
  P3,
  type MagicBucket,
  type Saturation,
  type SimBuilding,
} from "./aurenfurt-city-sim-types";

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

export function demandTotals(buildings: SimBuilding[]) {
  const totals = Object.fromEntries(BUCKETS.map((bucket) => [bucket, 0])) as Record<MagicBucket, number>;
  for (const building of buildings) {
    totals[magicBucket(building)] += DEMAND_PER[magicBucket(building)];
  }
  return totals;
}

export function allocate(supply: number, demand: Record<MagicBucket, number>): Saturation {
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

export function districtVattrak(districtId: CityDistrictId, sat: Saturation) {
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

export function malanthirTarget(districtId: CityDistrictId, sat: Saturation, smuggleDelta: number) {
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

export function mountainSupply(kind: WeatherKind, winter: number, hunger: number) {
  const shortage = Math.min(0.72, winter * 0.42 + hunger * 0.16);
  return MOUNTAIN_BASE * (1 - shortage) * weatherSupplyFactor(kind);
}

export function smuggleFactor(winter: number, hunger: number, unrest: number, tolls: number) {
  return 1 + tolls * 0.4 + hunger * 0.3 + unrest * 0.22 + winter * 0.12;
}

/** Unter 20 kaum, danach immer schärfer. */
export function malanthirCrimePush(malanthir: number) {
  if (malanthir <= 20) return malanthir * 0.1;
  if (malanthir <= 40) return 2 + (malanthir - 20) / 3;
  return 2 + 20 / 3 + (malanthir - 40) / 2.1;
}
