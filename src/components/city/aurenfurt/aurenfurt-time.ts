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

export function utcToday(now = new Date()) {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}
