/**
 * Smoke: cold map-open path + warm dashboard clicks must stay interactive.
 * Run: npx tsx src/components/city/aurenfurt/aurenfurt-perf-smoke.selftest.ts
 */
import { performance } from "node:perf_hooks";
import { buildCityAnalytics } from "./aurenfurt-analytics";
import { cityMetricsOn, districtMetricsOn, districtSeries, formatDay, utcToday } from "./aurenfurt-history";
import { marketOn } from "./aurenfurt-market";
import { buildPopulationSeries } from "./aurenfurt-population";
import { vattrakStockOn } from "./aurenfurt-vattrak-stock";

function timed(label: string, fn: () => unknown) {
  const t0 = performance.now();
  fn();
  const ms = performance.now() - t0;
  // eslint-disable-next-line no-console
  console.log(`${label}: ${ms.toFixed(0)}ms`);
  return ms;
}

const day = formatDay(utcToday());

const cold = timed("cold districtMetricsOn (map open)", () => districtMetricsOn("unterstadt", utcToday()));
const warmDistrict = timed("warm districtMetricsOn", () => districtMetricsOn("palast", utcToday()));
const warmCity = timed("warm cityMetricsOn", () => cityMetricsOn(utcToday()));
const warmStock = timed("warm vattrakStockOn", () => vattrakStockOn(day));
const warmPop = timed("warm buildPopulationSeries", () => buildPopulationSeries(day).length);
const market = timed("marketOn day", () => marketOn(day, null));
const analyticsMonth = timed("analytics month", () =>
  buildCityAnalytics({ range: "month", anchorIso: day, scopeId: null }),
);
const analyticsYear = timed("analytics year + scope", () =>
  buildCityAnalytics({ range: "year", anchorIso: day, scopeId: "unterstadt" }),
);
const seriesA = timed("districtSeries unterstadt", () => districtSeries("unterstadt").length);
const seriesB = timed("districtSeries palast", () => districtSeries("palast").length);

const fail =
  cold > 15_000 ||
  warmDistrict > 500 ||
  warmCity > 800 ||
  warmStock > 200 ||
  warmPop > 200 ||
  market > 500 ||
  analyticsMonth > 5_000 ||
  analyticsYear > 8_000 ||
  seriesA > 5_000 ||
  seriesB > 5_000;

if (fail) {
  // eslint-disable-next-line no-console
  console.error("PERF SMOKE FAILED — timings too high");
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log("PERF SMOKE OK");
