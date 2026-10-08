/**
 * Run: npx tsx src/components/city/aurenfurt/aurenfurt-chronicle.selftest.ts
 */
import assert from "node:assert/strict";
import { chronicleInWindow, chronicleShift } from "./aurenfurt-chronicle";
import { parseDay } from "./aurenfurt-time";

function on(iso: string, district: "unterstadt" | "suedtor" | "palast" | "tempelbezirk" | "akademieviertel" = "unterstadt") {
  return chronicleShift(district, parseDay(iso));
}

const frostStart = on("2026-01-10");
assert.equal(frostStart.vattrak, -20);
assert.equal(frostStart.economy, -8);
assert.equal(frostStart.tension, 5);

const frostLate = on("2026-01-24");
assert.equal(frostLate.vattrak, -30);
assert.equal(frostLate.economy, -12);
assert.equal(frostLate.tension, 15);

assert.equal(on("2026-02-07").vattrak, 0);

const raidOpen = on("2026-02-15");
assert.equal(raidOpen.crime, 10);
assert.ok(raidOpen.guard > 8);
assert.equal(raidOpen.malanthir, 3);
assert.equal(on("2026-02-15", "palast").crime, 0);

const raidEnd = on("2026-03-07");
assert.ok(raidEnd.crime < -18, `crime ${raidEnd.crime}`);
assert.equal(raidEnd.malanthir, 9);

const waveStart = on("2026-03-10", "suedtor");
assert.ok(waveStart.malanthir < 2, `malanthir ${waveStart.malanthir}`);
const waveEnd = on("2026-04-13", "suedtor");
assert.ok(waveEnd.malanthir > 23, `malanthir ${waveEnd.malanthir}`);
const waveCrime = on("2026-04-13");
assert.ok(waveCrime.crime > 18, `crime ${waveCrime.crime}`);

const refugeesEarly = on("2026-06-20", "suedtor");
assert.ok(refugeesEarly.refugees < 2);
const refugeesHold = on("2026-07-11", "suedtor");
assert.equal(refugeesHold.refugees, 30);
assert.ok(on("2026-07-20", "suedtor").refugees === 30);

const accident = on("2026-08-01", "akademieviertel");
assert.equal(accident.malanthir, 20);
assert.equal(accident.vattrak, -10);
assert.equal(accident.economy, -8);
assert.equal(on("2026-08-01", "palast").malanthir, 6);

const shock = on("2026-09-22", "palast");
assert.equal(shock.crime, 3);
assert.equal(shock.tension, 25);
assert.ok(shock.guard > 20);

const boom = on("2026-10-05", "palast");
assert.ok(boom.economy > 0 && boom.economy < 3, `economy ${boom.economy}`);
assert.ok(boom.unemployment < 0);
const boomEnd = on("2026-10-25", "palast");
assert.ok(boomEnd.economy > 17, `economy ${boomEnd.economy}`);

const echo = on("2025-02-02", "tempelbezirk");
assert.equal(echo.crime, -12);
assert.equal(echo.vattrak, 10);
assert.equal(echo.tension, -10);
assert.equal(on("2025-02-02", "unterstadt").vattrak, 0);

const marks = chronicleInWindow([parseDay("2026-01-12"), parseDay("2026-01-20")], null);
assert.equal(marks.some((mark) => mark.title === "Die große Frostwelle"), true);
assert.equal(chronicleInWindow([parseDay("2026-01-12")], "adelsviertel").length > 0, true);

console.log("aurenfurt-chronicle selftest ok");
