/**
 * Elysia und Chromus als Präsenz 0–100, dieselbe Spanne wie Kriminalität und Wirtschaft.
 * Kinder nur so, wie die Lore sie an den Gottheiten nennt. Keine weiteren Götter.
 * Gruppennamen aus dem Datenbestand: Bund der Silbernen Rose, Konklave der Ewigen Ordnung.
 */

import type { CityDistrictId } from "./aurenfurt-districts";

/** Kinder der Elysia laut Lore-Eintrag. */
export const ELYSIA_CHILDREN = ["Amoria", "Fedrix", "Weilin"] as const;

/** Kinder des Chromus laut Lore-Eintrag. */
export const CHROMUS_CHILDREN = ["Chrona", "Fundrah", "Imperus"] as const;

const ELYSIA_NAMES = ["Elysia", ...ELYSIA_CHILDREN];
const CHROMUS_NAMES = ["Chromus", ...CHROMUS_CHILDREN];

export type FaithLine = "elysia" | "chromus";

/**
 * Drei Zustände: Linie der Elysia, Linie des Chromus, oder keiner von beiden.
 * Ein Kind zählt zur Linie, ersetzt die Obergottheit aber nicht in der Anzeige.
 */
export function faithLineOf(deity: string | null | undefined): FaithLine | null {
  const name = deity?.trim().toLowerCase();
  if (!name) return null;
  if (ELYSIA_NAMES.some((entry) => entry.toLowerCase() === name)) return "elysia";
  if (CHROMUS_NAMES.some((entry) => entry.toLowerCase() === name)) return "chromus";
  return null;
}

/** Ältere Präsenz. Elysia liegt in der ganzen Stadt über Chromus, dicht an Hof und Tempel. */
export const ELYSIA_ROLE: Record<CityDistrictId, number> = {
  palast: 70,
  tempelbezirk: 54,
  adelsviertel: 34,
  akademieviertel: 24,
  suedtor: 20,
  handwerkerviertel: 18,
  unterstadt: 14,
};

/** Chromus ist seit etwa einem Jahrhundert im Einzug: örtlich im Tempelbezirk, sonst dünn. */
export const CHROMUS_ROLE: Record<CityDistrictId, number> = {
  palast: 12,
  tempelbezirk: 22,
  adelsviertel: 8,
  akademieviertel: 10,
  suedtor: 7,
  handwerkerviertel: 6,
  unterstadt: 5,
};

type FaithScores = { elysia: number; chromus: number };

/** Kultorte, deren Zugehörigkeit Lore und Karte schon festlegen. */
const NAMED_SITES: Record<string, FaithScores> = {
  silberkapelle: { elysia: 90, chromus: 6 },
  "rose-hof": { elysia: 88, chromus: 10 },
  ostbrunnen: { elysia: 74, chromus: 12 },
  "konklave-saal": { elysia: 12, chromus: 88 },
  tempel: { elysia: 24, chromus: 76 },
  "98fd35d1-f789-4c91-afef-0215ed4b21e7": { elysia: 84, chromus: 14 },
};

function namedByTitle(name: string): FaithScores | null {
  const title = name.trim().toLowerCase();
  if (!title) return null;
  if (title.includes("silbernen rose") || title.includes("silberne rose")) return { elysia: 88, chromus: 8 };
  if (title.includes("ewigen ordnung") || title.includes("konklave")) return { elysia: 14, chromus: 84 };
  if (title.includes("goldene tempelkuppel")) return { elysia: 24, chromus: 76 };
  if (title.includes("festungspalast")) return { elysia: 84, chromus: 14 };
  if (title === "ostbrunnen") return { elysia: 74, chromus: 12 };
  return null;
}

export function faithPresenceForBuilding(building: {
  id: string;
  name?: string | null;
  districtId: CityDistrictId;
  guildId?: string | null;
  category?: string | null;
}): FaithScores {
  const named = NAMED_SITES[building.id] ?? namedByTitle(building.name ?? "");
  if (named) return named;
  if (building.guildId === "bund-silberne-rose") return { elysia: 82, chromus: 10 };
  if (building.guildId === "konklave-ewige-ordnung") return { elysia: 16, chromus: 80 };
  if (building.districtId === "palast" || building.category === "Palast") return { elysia: 68, chromus: 14 };
  if (building.category === "Tempel") return { elysia: 46, chromus: 16 };
  return {
    elysia: Math.round(ELYSIA_ROLE[building.districtId] * 0.55),
    chromus: Math.round(CHROMUS_ROLE[building.districtId] * 0.45),
  };
}
