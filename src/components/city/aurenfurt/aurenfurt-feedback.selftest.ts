/**
 * Rückwirkung der Viertelzähler: ein Tag liest nur den Vortag.
 * Run: npx tsx src/components/city/aurenfurt/aurenfurt-feedback.selftest.ts
 */
import assert from "node:assert/strict";
import { applyDistrictFeedback, undergroundRoom } from "./aurenfurt-city-sim";

const base = {
  crime: 48,
  vattrak: 55,
  malanthir: 30,
  guard: 50,
  refugees: 20,
  economy: 60,
  unemployment: 25,
};

const calmPrior = { ...base, economy: 88, crime: 18, malanthir: 12, vattrak: 80, guard: 70 };
const roughPrior = { ...base, economy: 22, crime: 78, malanthir: 64, vattrak: 16, guard: 24 };

const calm = applyDistrictFeedback(base, calmPrior);
const rough = applyDistrictFeedback(base, roughPrior);
const untouched = applyDistrictFeedback(base, null);

assert.equal(untouched.crime, base.crime);
assert.ok(calm.crime < base.crime, `Wohlstand soll Kriminalität dämpfen, ist ${calm.crime}`);
assert.ok(rough.crime > base.crime, `Not und Malanthir sollen Kriminalität heben, ist ${rough.crime}`);
assert.ok(rough.economy < base.economy, `Hohe Kriminalität soll Händler vertreiben, Wirtschaft ${rough.economy}`);
assert.ok(calm.economy >= rough.economy);
assert.ok(rough.guard > calm.guard, `Mehr Kriminalität soll mehr Garde rufen, ${rough.guard} gegen ${calm.guard}`);
assert.ok(rough.malanthir > calm.malanthir, `Unruhe soll Habgier nähren, Vattrak sie dämpfen`);
assert.ok(rough.unemployment > calm.unemployment);
assert.ok(rough.vattrak <= base.vattrak, "Malanthir soll Vattrak anzehren");

assert.ok(undergroundRoom(96, 90) < undergroundRoom(30, 20), "Dichte Garde und Vattrak engen Zellen ein");
assert.ok(undergroundRoom(100, 100) >= 0.5, "Zellen bleiben hörbar");

let state = { ...roughPrior };
for (let day = 0; day < 500; day += 1) {
  const aimed = applyDistrictFeedback(base, state);
  state = {
    crime: state.crime + 0.35 * (aimed.crime - state.crime),
    vattrak: state.vattrak + 0.18 * (aimed.vattrak - state.vattrak),
    malanthir: state.malanthir + 0.06 * (aimed.malanthir - state.malanthir),
    guard: state.guard + 0.22 * (aimed.guard - state.guard),
    refugees: aimed.refugees,
    economy: state.economy + 0.08 * (aimed.economy - state.economy),
    unemployment: state.unemployment + 0.05 * (aimed.unemployment - state.unemployment),
  };
}
for (const value of [state.crime, state.economy, state.guard, state.malanthir, state.vattrak, state.unemployment]) {
  assert.ok(value >= 0 && value <= 100, `Wert läuft aus dem Rahmen: ${value}`);
}
const settled = applyDistrictFeedback(base, state);
assert.ok(Math.abs(settled.crime - state.crime) < 1, "Kriminalität soll sich einpendeln");
assert.ok(Math.abs(settled.economy - state.economy) < 1, "Wirtschaft soll sich einpendeln");

console.log("aurenfurt-feedback.selftest ok");
