/**
 * Kriegs-History-Events (Greifenberg / Xarvathar) für Meter-Impacts.
 * Einsatz: in AURENFURT_HISTORY einhängen; Populations-Serie liest dieselben Daten.
 * Kein Import aus aurenfurt-history (Zyklus vermeiden) — Shape entspricht HistoryEvent.
 */

import type { CityDistrictId } from "./aurenfurt-districts";
import type { WarPhase } from "./aurenfurt-population-types";
import { parseDay } from "./aurenfurt-time";

type MetricKey =
  | "crime"
  | "vattrak"
  | "malanthir"
  | "guard"
  | "refugees"
  | "economy"
  | "unemployment"
  | "elysia"
  | "chromus";

type WarHistoryEvent = {
  id: string;
  title: string;
  summary: string;
  start: string;
  end: string | null;
  impact: Partial<Record<CityDistrictId, Partial<Record<MetricKey, number>> & { cells?: { name: string; delta: number }[] }>>;
};

export const WAR_MOBILIZATION_ISO = "2024-05-02";
export const WAR_PEAK_ISO = "2025-08-04";

export const WAR_MOBILIZATION_MS = parseDay(WAR_MOBILIZATION_ISO);
export const WAR_PEAK_MS = parseDay(WAR_PEAK_ISO);

/** Anteil der Stadtgarde, der bei Mobilmachung an die Front geht. */
export const MOBILIZATION_GUARD_DRAFT = 0.65;
/** Weiterer Abzug aus der dann noch vorhandenen Garde am Peak. */
export const PEAK_GUARD_DRAFT = 0.35;
/** Anteil der jemals Abgezogenen, die über die Jahre zurückkehren. */
export const RETURN_FRACTION = 0.12;
/** Davon wieder dienstfähig als Garde. */
export const RETURN_FIT_FRACTION = 0.25;

export function warPhaseOn(dayMs: number): WarPhase {
  if (dayMs < WAR_MOBILIZATION_MS) return "prewar_light";
  if (dayMs < WAR_PEAK_MS) return "mobilization";
  // ~120 Tage Peak-Druck, danach aftermath
  if (dayMs < WAR_PEAK_MS + 120 * 86_400_000) return "peak";
  return "aftermath";
}

export function warPhaseLabel(phase: WarPhase): string {
  if (phase === "prewar_light") return "Vorabend";
  if (phase === "mobilization") return "Mobilmachung";
  if (phase === "peak") return "Invasion (Peak)";
  return "Nachwirkungen";
}

/** Kurzer Lore-Hinweis für Dashboard (Greifenberg / Xarvathar). */
export function warPhaseLore(phase: WarPhase): string {
  if (phase === "prewar_light") {
    return "Grenzgerüchte um Greifenberg. Noch keine große Aushebung — Vattrak und Garde bleiben weitgehend in der Stadt.";
  }
  if (phase === "mobilization") {
    return "Hilferuf Greifenberg (ab 02.05.2024): Aurenfurt schickt Garde und Vattrak an die Front gegen Xarvathars Druck.";
  }
  if (phase === "peak") {
    return "Invasion bei Greifenberg (ab 04.08.2025): Xarvathar stößt massiv vor. Weitere Truppen, Versorgungskrise, Flüchtlinge nach Aurenfurt.";
  }
  return "Der Peakdruck lässt nach. Heimkehrer und knappe Lager bestimmen noch lange den Alltag.";
}

/**
 * Meter-Impacts: Mobilmachung Greifenberg (Hilferuf 02.05.2024).
 * Garde sinkt, Wirtschaft/Vattrak leiden, Flüchtlinge und Spannung steigen.
 */
export const WAR_MOBILIZATION_EVENT: WarHistoryEvent = {
  id: "greifenberg-mobilmachung",
  title: "Hilferuf Greifenberg — Mobilmachung",
  summary:
    "Greifenberg ruft um Hilfe. Aurenfurt rekrutiert, teilt Vorräte und Vattrak mit der Grenzstadt und schickt die Garde an die Front.",
  start: WAR_MOBILIZATION_ISO,
  end: null,
  impact: {
    palast: { guard: -22, economy: -8, vattrak: -10, unemployment: 4 },
    adelsviertel: { guard: -14, economy: -6, vattrak: -6, unemployment: 3 },
    tempelbezirk: { guard: -12, economy: -5, vattrak: -14, unemployment: 4, refugees: 4 },
    akademieviertel: { guard: -10, economy: -6, vattrak: -12, unemployment: 5 },
    handwerkerviertel: { guard: -10, economy: -12, vattrak: -8, unemployment: 10, crime: 4 },
    suedtor: { guard: -18, economy: -10, refugees: 14, unemployment: 8, crime: 6, vattrak: -6 },
    unterstadt: {
      guard: -8,
      economy: -10,
      refugees: 18,
      unemployment: 14,
      crime: 10,
      malanthir: 8,
      vattrak: -4,
    },
  },
};

/**
 * Peak-Invasion Greifenberg (04.08.2025): weiterer Abzug, Preisschock, Flüchtlinge.
 */
export const WAR_PEAK_EVENT: WarHistoryEvent = {
  id: "greifenberg-invasion-peak",
  title: "Invasion bei Greifenberg",
  summary:
    "Xarvathar stößt massiv gegen Greifenberg vor. Erneuter Hilferuf, weitere Truppen, Versorgungskrise und Flüchtlingswellen nach Aurenfurt.",
  start: WAR_PEAK_ISO,
  end: "2026-01-15",
  impact: {
    palast: { guard: -10, economy: -6, vattrak: -8, unemployment: 3 },
    adelsviertel: { guard: -8, economy: -5, vattrak: -5, unemployment: 3 },
    tempelbezirk: { guard: -8, economy: -4, vattrak: -10, refugees: 8, unemployment: 5 },
    akademieviertel: { guard: -6, economy: -5, vattrak: -8, unemployment: 4 },
    handwerkerviertel: { guard: -6, economy: -10, unemployment: 8, crime: 5, vattrak: -6 },
    suedtor: { guard: -12, economy: -12, refugees: 20, unemployment: 12, crime: 8, vattrak: -5 },
    unterstadt: {
      guard: -5,
      economy: -12,
      refugees: 24,
      unemployment: 16,
      crime: 12,
      malanthir: 12,
      vattrak: -3,
    },
  },
};

export const WAR_HISTORY_EVENTS: WarHistoryEvent[] = [WAR_MOBILIZATION_EVENT, WAR_PEAK_EVENT];
