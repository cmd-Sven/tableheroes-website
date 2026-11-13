/** Tageszähler ohne Abhängigkeit von Historie oder Wetter. */

export function parseDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function formatDay(utc: number) {
  const date = new Date(utc);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

/** Kalendertag des Rechners, unabhängig von der festgehaltenen Stadtuhr. */
export function wallTodayIso(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

let cityPresentMs: number | null = null;

/** Hält die Simulation auf dem Stadttag. `null` gibt die Wanduhr frei. */
export function setCityPresentMs(ms: number | null) {
  cityPresentMs = ms != null && Number.isFinite(ms) ? ms : null;
}

export function cityPresentIsHeld() {
  return cityPresentMs != null;
}

export function utcToday(now = new Date()) {
  if (cityPresentMs != null) return cityPresentMs;
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addIsoDays(iso: string, delta: number) {
  return formatDay(parseDay(iso) + delta * 86_400_000);
}
