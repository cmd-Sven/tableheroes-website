/**
 * Kassadras rechnet wie unsere Welt: 365 Tage, zwölf Monate, 24 Stunden.
 * Die drei gespeicherten Stadtjahre von Aurenfurt bleiben in ihrer Reihenfolge.
 * 2026 ist das Weltjahr 5609, also Jahr 563 der Wiedergeburt.
 */

export const KASSADRAS_MONTHS = [
  { name: "Zephyrel", short: "Zeph" },
  { name: "Nerathen", short: "Nera" },
  { name: "Terravyn", short: "Terr" },
  { name: "Aquelis", short: "Aque" },
  { name: "Elysar", short: "Elys" },
  { name: "Pyrion", short: "Pyri" },
  { name: "Ferrothan", short: "Ferr" },
  { name: "Faturin", short: "Fatu" },
  { name: "Lunareth", short: "Luna" },
  { name: "Chromar", short: "Chro" },
  { name: "Lendarion", short: "Lend" },
  { name: "Vatrion", short: "Vatr" },
] as const;

const GREGORIAN_ANCHOR_YEAR = 2026;
const WORLD_YEAR_AT_ANCHOR = 5609;
const REBIRTH_START = 5046;

export function worldYearFromGregorian(year: number) {
  return year - GREGORIAN_ANCHOR_YEAR + WORLD_YEAR_AT_ANCHOR;
}

export function eraYearFromWorld(worldYear: number) {
  return worldYear - REBIRTH_START;
}

export function formatKassadrasDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const monthName = KASSADRAS_MONTHS[month - 1]?.name;
  if (!year || !monthName || !day) return iso;
  const worldYear = worldYearFromGregorian(year);
  return `${day}. ${monthName} ${eraYearFromWorld(worldYear)} (${worldYear})`;
}

export function formatKassadrasDayShort(iso: string) {
  const [, month, day] = iso.split("-").map(Number);
  const short = KASSADRAS_MONTHS[month - 1]?.short;
  if (!short || !day) return iso;
  return `${day}. ${short}`;
}

export function formatKassadrasMonthYear(gregorianYear: number, monthIndex: number) {
  const monthName = KASSADRAS_MONTHS[monthIndex]?.name;
  if (!monthName) return String(gregorianYear);
  const worldYear = worldYearFromGregorian(gregorianYear);
  return `${monthName} ${eraYearFromWorld(worldYear)} (${worldYear})`;
}

export function formatKassadrasShortMonth(gregorianYear: number, monthIndex: number) {
  const short = KASSADRAS_MONTHS[monthIndex]?.short ?? "";
  const era = eraYearFromWorld(worldYearFromGregorian(gregorianYear));
  return `${short} ${String(era).slice(-2)}`;
}
