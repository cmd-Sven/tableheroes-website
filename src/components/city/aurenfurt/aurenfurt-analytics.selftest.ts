/**
 * Stadtbericht: Monat, Vergleich und Viertel-Rangliste kommen aus der Simulation.
 * Run: npx tsx src/components/city/aurenfurt/aurenfurt-analytics.selftest.ts
 */
import assert from "node:assert/strict";
import { buildCityAnalytics } from "./aurenfurt-analytics";

const month = buildCityAnalytics({ range: "month", anchorIso: "2026-06-15", scopeId: null });
assert.equal(month.periodLabel, "Juni 2026");
assert.equal(month.districts.length, 7);
assert.ok(month.series.length >= 28, `Monatsreihe zu kurz: ${month.series.length}`);
assert.ok(month.previous, "Vormonat fehlt");
assert.equal(month.insights.length >= 3, true);
assert.equal(month.clamped, false);
const richest = [...month.districts].sort((a, b) => b.average.economy - a.average.economy)[0];
assert.ok(richest && richest.average.economy > 0);

const early = buildCityAnalytics({ range: "month", anchorIso: "2023-09-30", scopeId: null });
assert.equal(early.clamped, true);
assert.ok(early.dayCount > 0 && early.dayCount < 30, `September 2023 sollte am Simulationsstart abschneiden, hat ${early.dayCount} Tage`);
assert.ok(early.series.every((point) => point.economy >= 0 && point.economy <= 100));

const year = buildCityAnalytics({ range: "year", anchorIso: "2025-08-01", scopeId: "unterstadt" });
assert.equal(year.scopeLabel, "Unterstadt");
assert.ok(year.series.length >= 8, `Jahresreihe zu kurz: ${year.series.length}`);
assert.equal(year.compareLabel, "gegen das Vorjahr");

const day = buildCityAnalytics({ range: "day", anchorIso: "2026-03-04", scopeId: "palast" });
assert.equal(day.dayCount, 1);
assert.ok(day.series.length >= 14, "Tageschart braucht das 14-Tage-Umfeld");
assert.equal(day.deltas.economy != null, true);

console.log("aurenfurt-analytics.selftest ok");
