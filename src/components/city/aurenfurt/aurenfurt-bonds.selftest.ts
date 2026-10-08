/**
 * Beziehungsdruck auf ein Viertel: Befehl, Bund, Bruch.
 * Run: npx tsx src/components/city/aurenfurt/aurenfurt-bonds.selftest.ts
 */
import assert from "node:assert/strict";
import { bondChannel, bondShiftForDistrict, bondSimReading, type CityBond } from "./aurenfurt-bonds";

const command: CityBond = {
  sourceDistrictId: "suedtor",
  targetDistrictId: "palast",
  sourceRole: "Untertan",
  targetRole: "Vorgesetzter",
  intensity: 10,
  sameFaction: true,
};

const fracture: CityBond = {
  sourceDistrictId: "unterstadt",
  targetDistrictId: "adelsviertel",
  sourceRole: "Freund",
  targetRole: "Rivale",
  intensity: -80,
  sameFaction: false,
};

assert.equal(bondChannel("Untertan", "Vorgesetzter", 10), "command");
assert.equal(bondChannel("Freund", "Rivale", -40), "fracture");
assert.equal(bondChannel("Freund", "Kamerad", 60), "bond");

const weak = bondShiftForDistrict([command], "suedtor");
assert.ok(weak.guard > 0 && weak.guard < 1.5, `Schwache Befehlskette hebt die Garde nur leicht: ${weak.guard}`);
assert.equal(bondShiftForDistrict([command], "palast").guard, 0);

const breakShift = bondShiftForDistrict([fracture], "unterstadt");
assert.ok(breakShift.crime > 4, `Bruch hebt Kriminalität: ${breakShift.crime}`);
assert.ok(breakShift.malanthir > 2, `Bruch hebt Malanthir: ${breakShift.malanthir}`);

assert.match(bondSimReading("Untertan", "Vorgesetzter", 10, true, true) ?? "", /kaum/);
assert.match(bondSimReading("Freund", "Rivale", -80, true, true) ?? "", /Bruch/);
assert.equal(bondSimReading("Freund", "Kamerad", 20, false, true), null);
assert.match(bondSimReading("Freund", "Kamerad", 20, true, false) ?? "", /Lore/);

console.log("aurenfurt-bonds.selftest ok");
