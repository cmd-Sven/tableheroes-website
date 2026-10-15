/**
 * Ein Tag der Stadtsimulation: Elysia bleibt dichter als Chromus,
 * das Konklave ist örtlich stark, Kaiser und Gruppen liegen auf ihrer Linie.
 * Run: npx tsx src/components/city/aurenfurt/aurenfurt-faith.selftest.ts
 */
import assert from "node:assert/strict";
import { CITY_BUILDINGS } from "./aurenfurt-districts";
import { faithPresenceForBuilding } from "./aurenfurt-faith";
import { citySectorFaith } from "./aurenfurt-faith-sectors";
import { cityMetricsOn, districtMetricsOn, parseDay } from "./aurenfurt-history";
import { allAurenfurtNpcs } from "./aurenfurt-npcs";
import { sectorsOccupiedByBuilding } from "./aurenfurt-sector-reach";

const today = parseDay("2026-10-12");
const early = parseDay("2023-10-15");

const palast = districtMetricsOn("palast", today);
const tempel = districtMetricsOn("tempelbezirk", today);
assert.ok(palast.elysia > palast.chromus, `Palast Elysia ${palast.elysia} Chromus ${palast.chromus}`);
assert.ok(tempel.elysia > tempel.chromus, `Tempel Elysia ${tempel.elysia} Chromus ${tempel.chromus}`);

const city = cityMetricsOn(today);
assert.ok(city.elysia > city.chromus, `Stadt Elysia ${city.elysia} Chromus ${city.chromus}`);

for (const id of ["suedtor", "adelsviertel", "tempelbezirk", "akademieviertel", "unterstadt", "handwerkerviertel", "palast"] as const) {
  const sim = districtMetricsOn(id, today);
  assert.ok(sim.elysia > sim.chromus, `${id} Elysia ${sim.elysia} Chromus ${sim.chromus}`);
  assert.ok(sim.elysia >= 0 && sim.elysia <= 100 && sim.chromus >= 0 && sim.chromus <= 100);
}

const earlyTempel = districtMetricsOn("tempelbezirk", early);
assert.ok(
  earlyTempel.chromus < tempel.chromus,
  `Chromus soll im Tempelbezirk wachsen, ${earlyTempel.chromus} gegen ${tempel.chromus}`,
);
assert.ok(earlyTempel.elysia > earlyTempel.chromus);

const rose = faithPresenceForBuilding(CITY_BUILDINGS.find((building) => building.id === "rose-hof")!);
const chapel = faithPresenceForBuilding(CITY_BUILDINGS.find((building) => building.id === "silberkapelle")!);
const conclave = faithPresenceForBuilding(CITY_BUILDINGS.find((building) => building.id === "konklave-saal")!);
const dome = faithPresenceForBuilding(CITY_BUILDINGS.find((building) => building.id === "tempel")!);
const palace = faithPresenceForBuilding({
  id: "98fd35d1-f789-4c91-afef-0215ed4b21e7",
  name: "Festungspalast",
  districtId: "palast",
  category: "Palast",
});
assert.ok(rose.elysia >= 80 && rose.elysia > rose.chromus);
assert.ok(chapel.elysia >= 80 && chapel.elysia > chapel.chromus);
assert.ok(conclave.chromus >= 75 && conclave.chromus > conclave.elysia);
assert.ok(dome.chromus > dome.elysia);
assert.ok(palace.elysia > palace.chromus && palace.elysia >= 70);

const npcs = allAurenfurtNpcs();
const kaiser = npcs.find((npc) => npc.id === "npc-kaiser-artheus");
assert.equal(kaiser?.cityDeity, "Elysia");
const roseNpcs = npcs.filter((npc) => npc.factionId === "bund-silberne-rose");
const conclaveNpcs = npcs.filter((npc) => npc.factionId === "konklave-ewige-ordnung");
assert.ok(roseNpcs.length > 0 && roseNpcs.every((npc) => npc.cityDeity === "Elysia"));
assert.ok(conclaveNpcs.length > 0 && conclaveNpcs.every((npc) => npc.cityDeity === "Chromus"));

const cells = citySectorFaith(today).filter((cell) => cell.sector.districtId === "tempelbezirk");
assert.ok(cells.length > 1, "Tempelbezirk braucht Sektoren");
const elysiaMean = cells.reduce((sum, cell) => sum + cell.elysia, 0) / cells.length;
const chromusMean = cells.reduce((sum, cell) => sum + cell.chromus, 0) / cells.length;
assert.ok(Math.abs(elysiaMean - tempel.elysia) < 4, `Elysia-Mittel ${elysiaMean} gegen Viertel ${tempel.elysia}`);
assert.ok(Math.abs(chromusMean - tempel.chromus) < 4, `Chromus-Mittel ${chromusMean} gegen Viertel ${tempel.chromus}`);

const hall = CITY_BUILDINGS.find((building) => building.id === "konklave-saal")!;
const occupied = new Set(sectorsOccupiedByBuilding(hall, cells.map((cell) => cell.sector)).map((sector) => sector.id));
const hallCells = cells.filter((cell) => occupied.has(cell.sector.id));
assert.ok(hallCells.length > 0);
const hallChromus = hallCells.reduce((sum, cell) => sum + cell.chromus, 0) / hallCells.length;
assert.ok(hallChromus > tempel.chromus, `Konklave-Sektor ${hallChromus} gegen Viertel ${tempel.chromus}`);

const counts = { elysia: 0, chromus: 0, none: 0 };
for (const npc of npcs) {
  if (npc.cityDeity === "Elysia" || npc.cityDeity === "Amoria" || npc.cityDeity === "Fedrix" || npc.cityDeity === "Weilin") counts.elysia += 1;
  else if (npc.cityDeity === "Chromus" || npc.cityDeity === "Chrona" || npc.cityDeity === "Fundrah" || npc.cityDeity === "Imperus") counts.chromus += 1;
  else counts.none += 1;
}
console.log("aurenfurt-faith.selftest ok", {
  palast,
  tempel,
  city: { elysia: city.elysia, chromus: city.chromus },
  earlyTempel: { elysia: earlyTempel.elysia, chromus: earlyTempel.chromus },
  counts,
  rose: roseNpcs.length,
  conclave: conclaveNpcs.length,
  hallChromus,
});
