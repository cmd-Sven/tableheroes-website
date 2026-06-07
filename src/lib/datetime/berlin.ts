/** TableHeroes-Vereinszeiten: immer Europe/Berlin (Osnabrück / Online DE). */
export const APP_TIMEZONE = "Europe/Berlin";

export type BerlinDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

export function getBerlinParts(date: Date): BerlinDateParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** Kalenderdatum (YYYY-MM-DD) in Europe/Berlin — für Deduplizierung. */
export function getBerlinDateKey(iso: string | Date): string {
  const { year, month, day } = getBerlinParts(new Date(iso));
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Wandelt lokale Berlin-Zeit in UTC um (für DB timestamptz).
 * month: 1–12
 */
export function berlinLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let i = 0; i < 4; i++) {
    const berlin = getBerlinParts(new Date(utcMs));
    const targetMs = Date.UTC(year, month - 1, day, hour, minute, 0);
    const actualMs = Date.UTC(
      berlin.year,
      berlin.month - 1,
      berlin.day,
      berlin.hour,
      berlin.minute,
      0,
    );
    const diff = targetMs - actualMs;
    if (diff === 0) break;
    utcMs += diff;
  }

  return new Date(utcMs);
}

/** datetime-local / „YYYY-MM-DDTHH:mm“ — immer als Berlin interpretieren (Server & Client). */
export function parseBerlinDateTimeLocal(value: string): Date {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart || "00:00").split(":").map(Number);
  return berlinLocalToUtc(year, month, day, hour, minute);
}

export function formatSessionDateDe(iso: string | Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatSessionTimeDe(iso: string | Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatSessionDateTimeDe(iso: string | Date): {
  formattedDate: string;
  formattedTime: string;
} {
  return {
    formattedDate: formatSessionDateDe(iso),
    formattedTime: formatSessionTimeDe(iso),
  };
}

/** Wochentag 0=So … 6=Sa am Berlin-Kalendertag. */
export function getBerlinWeekday(year: number, month: number, day: number): number {
  const noon = berlinLocalToUtc(year, month, day, 12, 0);
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
  }).format(noon);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[name] ?? 0;
}

/** Nächstes Vorkommen eines Wochentags (0=So … 6=Sa) ab „jetzt“ in Berlin. */
export function nextBerlinScheduleOccurrence(
  scheduleDay: number,
  hour: number,
  minute: number,
  from: Date = new Date(),
): Date {
  const berlin = getBerlinParts(from);
  let y = berlin.year;
  let m = berlin.month;
  let d = berlin.day;

  for (let i = 0; i < 370; i++) {
    if (getBerlinWeekday(y, m, d) === scheduleDay) {
      const start = berlinLocalToUtc(y, m, d, hour, minute);
      if (start.getTime() > from.getTime()) {
        return start;
      }
    }
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    y = next.getUTCFullYear();
    m = next.getUTCMonth() + 1;
    d = next.getUTCDate();
  }

  throw new Error("nextBerlinScheduleOccurrence: kein Termin gefunden.");
}

export function addBerlinCalendarDays(from: Date, days: number): Date {
  const { year, month, day, hour, minute } = getBerlinParts(from);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return berlinLocalToUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    hour,
    minute,
  );
}
