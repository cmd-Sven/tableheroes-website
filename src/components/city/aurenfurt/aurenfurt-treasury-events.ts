/**
 * Historische Kassen-Ereignisse für den Dashboard-Verlauf (Derived only).
 * 25 Punkte, die zu Aurenfurts Kriegs-/Handelsgeschichte passen.
 */

import type { CityDistrictId } from "./aurenfurt-districts";
import { parseDay } from "./aurenfurt-time";

const DAY_MS = 86_400_000;

export type TreasuryEvent = {
  id: string;
  title: string;
  kind: "income" | "expense";
  /** ISO Starttag */
  start: string;
  /** Letzter Wirkstag inkl.; null = nur Startdag (mit lump) bzw. durationDays */
  end?: string | null;
  durationDays?: number;
  /** Tägliche GP während des Fensters */
  dailyGp: number;
  /** Einmalbetrag am Starttag */
  lumpGp?: number;
  /** null/undefined = stadtweit */
  districtId?: CityDistrictId | null;
};

/** 25 Einnahmen-/Ausgaben-Impulse entlang Mobilmachung, Elfenweg, Pakt, Überfall, Peak, Nachkrieg. */
export const AURENFURT_TREASURY_EVENTS: readonly TreasuryEvent[] = [
  {
    id: "tx-elfenroute-boom",
    title: "Neue Handelsroute mit den Elfen floriert",
    kind: "income",
    start: "2024-04-12",
    end: "2024-06-30",
    dailyGp: 100,
    districtId: "suedtor",
  },
  {
    id: "tx-suedtor-ausbesserung",
    title: "Ausbesserung des Südtors",
    kind: "expense",
    start: "2024-05-08",
    durationDays: 18,
    dailyGp: 220,
    lumpGp: 1800,
    districtId: "suedtor",
  },
  {
    id: "tx-mobil-ausruestung",
    title: "Mobilmachungs-Ausrüstung der Stadtwache",
    kind: "expense",
    start: "2024-05-02",
    durationDays: 40,
    dailyGp: 160,
    lumpGp: 3200,
  },
  {
    id: "tx-wachtuben-umbau",
    title: "Umbau der Wachstuben",
    kind: "expense",
    start: "2024-06-15",
    durationDays: 28,
    dailyGp: 95,
    lumpGp: 2400,
    districtId: "palast",
  },
  {
    id: "tx-mauer-suedost",
    title: "Wichtige Reparatur an der Südostmauer",
    kind: "expense",
    start: "2024-07-20",
    durationDays: 35,
    dailyGp: 140,
    lumpGp: 4500,
    districtId: "handwerkerviertel",
  },
  {
    id: "tx-strassen-unterstadt",
    title: "Straßenreparaturen in der Unterstadt",
    kind: "expense",
    start: "2024-08-10",
    durationDays: 21,
    dailyGp: 75,
    lumpGp: 1100,
    districtId: "unterstadt",
  },
  {
    id: "tx-brunnen-modern",
    title: "Modernisierung der Brunnenanlagen",
    kind: "expense",
    start: "2024-09-01",
    durationDays: 24,
    dailyGp: 60,
    lumpGp: 2800,
    districtId: "tempelbezirk",
  },
  {
    id: "tx-zunftmesse",
    title: "Große Zunftmesse im Handwerkerviertel",
    kind: "income",
    start: "2024-09-18",
    durationDays: 12,
    dailyGp: 180,
    lumpGp: 900,
    districtId: "handwerkerviertel",
  },
  {
    id: "tx-adelssteuer",
    title: "Sondersteuer der Adelshäuser",
    kind: "income",
    start: "2024-10-22",
    durationDays: 14,
    dailyGp: 120,
    lumpGp: 3500,
    districtId: "adelsviertel",
  },
  {
    id: "tx-pakt-zoll",
    title: "Zolleinnahmen aus dem Elfen-Zwergen-Pakt",
    kind: "income",
    start: "2024-11-22",
    end: "2025-02-28",
    dailyGp: 85,
  },
  {
    id: "tx-zwergendeal",
    title: "Der große Zwergendeal",
    kind: "income",
    start: "2024-11-28",
    durationDays: 1,
    dailyGp: 0,
    lumpGp: 10000,
  },
  {
    id: "tx-zwerg-lager",
    title: "Aufnahme zwerischer Flüchtlinge — Lagerkosten",
    kind: "expense",
    start: "2024-11-28",
    durationDays: 45,
    dailyGp: 70,
    districtId: "unterstadt",
  },
  {
    id: "tx-akademie-dach",
    title: "Dachsanierung der Akademie",
    kind: "expense",
    start: "2025-01-12",
    durationDays: 30,
    dailyGp: 110,
    lumpGp: 3600,
    districtId: "akademieviertel",
  },
  {
    id: "tx-ueberfall-hilfe",
    title: "Nothilfe nach dem Überfall aufs Elfenland",
    kind: "expense",
    start: "2025-03-05",
    durationDays: 50,
    dailyGp: 130,
    lumpGp: 5000,
    districtId: "suedtor",
  },
  {
    id: "tx-fluechtlingslager",
    title: "Erweiterung der Flüchtlingslager",
    kind: "expense",
    start: "2025-03-20",
    durationDays: 40,
    dailyGp: 90,
    districtId: "unterstadt",
  },
  {
    id: "tx-garde-ausbildung",
    title: "Sonderetat Garde-Ausbildung",
    kind: "expense",
    start: "2025-04-15",
    durationDays: 35,
    dailyGp: 125,
    lumpGp: 2200,
  },
  {
    id: "tx-brand-schaeden",
    title: "Folgekosten des vereitelten Brandanschlags",
    kind: "expense",
    start: "2025-05-14",
    durationDays: 25,
    dailyGp: 95,
    lumpGp: 2700,
    districtId: "handwerkerviertel",
  },
  {
    id: "tx-goldkelchen",
    title: "Spende der Goldkelchen an die Stadtkasse",
    kind: "income",
    start: "2025-06-08",
    durationDays: 7,
    dailyGp: 150,
    lumpGp: 2000,
    districtId: "adelsviertel",
  },
  {
    id: "tx-peak-nachschub",
    title: "Frontnachschub zum Kriegspeak",
    kind: "expense",
    start: "2025-08-04",
    durationDays: 55,
    dailyGp: 200,
    lumpGp: 8000,
  },
  {
    id: "tx-kriegsbeute",
    title: "Anteil an Kriegsbeute für den Hof",
    kind: "income",
    start: "2025-09-20",
    durationDays: 10,
    dailyGp: 250,
    lumpGp: 4200,
    districtId: "palast",
  },
  {
    id: "tx-konfession-schlichtung",
    title: "Schlichtungshof im Konfessionsstreit",
    kind: "expense",
    start: "2025-10-05",
    durationDays: 30,
    dailyGp: 65,
    lumpGp: 1500,
    districtId: "tempelbezirk",
  },
  {
    id: "tx-karawanen-rueckkehr",
    title: "Karawanen kehren auf den Südweg zurück",
    kind: "income",
    start: "2026-01-20",
    end: "2026-04-15",
    dailyGp: 95,
    districtId: "suedtor",
  },
  {
    id: "tx-pflaster-adel",
    title: "Pflasterung der Promenade im Adelsviertel",
    kind: "expense",
    start: "2026-03-01",
    durationDays: 22,
    dailyGp: 100,
    lumpGp: 3100,
    districtId: "adelsviertel",
  },
  {
    id: "tx-nachkrieg-zwerge",
    title: "Wiederaufbauhilfe des Zwergenkönigs",
    kind: "income",
    start: "2026-05-10",
    durationDays: 1,
    dailyGp: 0,
    lumpGp: 7500,
  },
  {
    id: "tx-wache-modern",
    title: "Modernisierung der Torwachen-Ausrüstung",
    kind: "expense",
    start: "2026-07-01",
    durationDays: 28,
    dailyGp: 115,
    lumpGp: 2600,
    districtId: "suedtor",
  },
] as const;

function eventWindow(event: TreasuryEvent): { from: number; to: number } {
  const from = parseDay(event.start);
  if (event.end) return { from, to: parseDay(event.end) };
  const days = Math.max(1, event.durationDays ?? 1);
  return { from, to: from + (days - 1) * DAY_MS };
}

export type TreasuryDayDelta = {
  income: number;
  expenses: number;
  titles: string[];
};

/** Kassen-Impulse eines Tages (optional auf ein Viertel gefiltert). */
export function treasuryDeltaOn(dayIso: string, scopeId: CityDistrictId | null = null): TreasuryDayDelta {
  const dayMs = parseDay(dayIso);
  if (!Number.isFinite(dayMs)) return { income: 0, expenses: 0, titles: [] };

  let income = 0;
  let expenses = 0;
  const titles: string[] = [];

  for (const event of AURENFURT_TREASURY_EVENTS) {
    if (scopeId && event.districtId && event.districtId !== scopeId) continue;
    if (scopeId && !event.districtId) {
      // Stadtweite Events anteilig (~1/7) im Viertel zeigen, damit Charts nicht leer bleiben.
    }
    const { from, to } = eventWindow(event);
    if (dayMs < from || dayMs > to) continue;

    const share =
      scopeId && !event.districtId ? 1 / 7 : 1;
    let add = event.dailyGp * share;
    if (dayMs === from && event.lumpGp) add += event.lumpGp * share;

    if (add === 0) continue;
    if (event.kind === "income") income += add;
    else expenses += add;
    titles.push(event.title);
  }

  return {
    income: Math.round(income * 10) / 10,
    expenses: Math.round(expenses * 10) / 10,
    titles,
  };
}
