/**
 * Run: npx tsx src/components/city/aurenfurt/aurenfurt-pressure.selftest.ts
 */
import assert from "node:assert/strict";
import { foldCityPressure, reachDistricts, type CityActor, type CitySimEvent } from "./aurenfurt-pressure";
import { newNpcAbility } from "@/src/lib/npcs/city-simulation";

const DAY = 86_400_000;
const from = 0;
const to = 20 * DAY;

function actor(partial: Partial<CityActor>): CityActor {
  return {
    id: "npc-1",
    name: "Brann",
    alive: true,
    districtId: "unterstadt",
    factionId: "stadtwachen",
    role: "Hauptmann der Stadtwachen",
    tier: "authority_faction",
    axes: { loyalCriminal: -2, greedyAltruist: 0, piousSkeptic: 0, superstitionReason: 1 },
    abilities: [],
    cards: [],
    plays: [],
    ...partial,
  };
}

const calm = { crime: 10, guard: 70, vattrak: 40, malanthir: 5, economy: 50, unemployment: 20, refugees: 10 };
const rough = { ...calm, crime: 90, guard: 20 };

const ability = newNpcAbility({
  id: "razzia",
  title: "Razzia",
  roleGate: "Hauptmann",
  factionGate: "stadtwachen",
  conditions: [{ meter: "crime", op: "gt", value: 80 }],
  effects: [{ meter: "guard", delta: 8 }],
  durationDays: 3,
  cooldownDays: 10,
  relationshipTarget: "rival_faction",
  relationshipDelta: -8,
  counterFactionId: "rotes-auge",
  counterDelayDays: 2,
  counterDurationDays: 2,
  counterEffects: [{ meter: "crime", delta: 5 }],
});

const book = foldCityPressure({
  from,
  to,
  actors: [actor({ abilities: [ability] })],
  events: [],
  readMeters: () => rough,
});

assert.equal(book.delta("unterstadt", 0).guard, 8);
assert.equal(book.delta("unterstadt", 2 * DAY).guard, 8);
assert.equal(book.delta("unterstadt", 3 * DAY).guard, 0);
assert.equal(book.delta("unterstadt", 12 * DAY).guard, 0);
assert.equal(book.delta("unterstadt", 13 * DAY).guard, 8);
assert.equal(book.delta("unterstadt", 2 * DAY).crime, 5);
assert.equal(book.bias(0)[0]?.delta, -8);
assert.equal(book.notes(0).some((note) => note.kind === "ability"), true);

const dead = foldCityPressure({
  from,
  to,
  actors: [actor({ alive: false, abilities: [ability] })],
  events: [],
  readMeters: () => rough,
});
assert.equal(dead.delta("unterstadt", 0).guard, 0);

const quiet = foldCityPressure({
  from,
  to,
  actors: [actor({ abilities: [ability] })],
  events: [],
  readMeters: () => calm,
});
assert.equal(quiet.delta("unterstadt", 0).guard, 0);

const event: CitySimEvent = {
  id: "markt",
  title: "Marktstillstand",
  body: "Die Händler schließen.",
  scope: "district",
  districtId: "handwerkerviertel",
  sectorLabel: null,
  effects: [{ meter: "economy", delta: -6 }],
  durationDays: 10,
  startOn: 0,
  endWhen: { meter: "economy", op: "lt", value: 40 },
  active: true,
};
const ended = foldCityPressure({
  from,
  to,
  actors: [],
  events: [event],
  readMeters: (_district, day) => ({ ...calm, economy: day === 0 ? 50 : 30 }),
});
assert.equal(ended.delta("handwerkerviertel", 0).economy, -6);
assert.equal(ended.delta("handwerkerviertel", DAY).economy, 0);

assert.equal(reachDistricts("unterstadt", "city", [], "local").length, 7);
assert.ok(reachDistricts("unterstadt", "adjacent", ["palast"], "local").includes("suedtor"));
assert.deepEqual(reachDistricts("unterstadt", undefined, [], "apex_global").length, 7);

console.log("aurenfurt-pressure.selftest ok");
