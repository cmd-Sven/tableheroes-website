import type { ClassId, RaceId } from "./types";

const CLASS_ALIASES: Array<{ id: ClassId; patterns: RegExp[] }> = [
  { id: "barbarian", patterns: [/barbar/i, /barbarian/i] },
  { id: "bard", patterns: [/barde/i, /\bbard\b/i] },
  { id: "cleric", patterns: [/kleriker/i, /cleric/i, /priester/i] },
  { id: "druid", patterns: [/druide/i, /druid/i] },
  { id: "fighter", patterns: [/kämpfer/i, /kaempfer/i, /fighter/i, /krieger/i] },
  { id: "monk", patterns: [/mönch/i, /moench/i, /\bmonk\b/i] },
  { id: "paladin", patterns: [/paladin/i] },
  { id: "ranger", patterns: [/waldläufer/i, /waldlaeufer/i, /ranger/i] },
  { id: "rogue", patterns: [/schurke/i, /rogue/i, /dieb/i] },
  { id: "sorcerer", patterns: [/zauberer/i, /sorcerer/i] },
  { id: "warlock", patterns: [/hexer/i, /warlock/i, /hexenmeister/i] },
  { id: "wizard", patterns: [/magier/i, /wizard/i] },
];

const RACE_ALIASES: Array<{ id: RaceId; patterns: RegExp[] }> = [
  { id: "dragonborn", patterns: [/drachenblüt/i, /drachenbluet/i, /dragonborn/i] },
  { id: "dwarf", patterns: [/zwerg/i, /dwarf/i] },
  { id: "elf", patterns: [/\belf\b/i, /\belve?\b/i] },
  { id: "gnome", patterns: [/gnom/i, /gnome/i] },
  { id: "half-elf", patterns: [/halbelf/i, /half-?elf/i] },
  { id: "half-orc", patterns: [/halbor[kc]/i, /half-?orc/i] },
  { id: "halfling", patterns: [/halbling/i, /halfling/i] },
  { id: "human", patterns: [/mensch/i, /human/i] },
  { id: "tiefling", patterns: [/tiefling/i, /teufelsbrut/i] },
];

export const CLASS_IDS: ClassId[] = [
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard",
];

export function resolveClassId(className: string | null | undefined): ClassId | null {
  const raw = (className ?? "").trim();
  if (!raw) return null;
  // "Wizard (Evocation)" / "Magier (Hervorrufung)"
  const base = raw.split(/[(/–—-]/)[0]?.trim() ?? raw;
  for (const entry of CLASS_ALIASES) {
    if (entry.patterns.some((p) => p.test(base))) return entry.id;
  }
  return null;
}

export function resolveRaceId(raceName: string | null | undefined): RaceId {
  const raw = (raceName ?? "").trim();
  if (!raw) return "unknown";
  const base = raw.split(/[(/–—-]/)[0]?.trim() ?? raw;
  for (const entry of RACE_ALIASES) {
    if (entry.patterns.some((p) => p.test(base))) return entry.id;
  }
  return "unknown";
}

/** Normalisiert Subklassen-IDs/Namen für robustes Matching („Open Hand“ ↔ open-hand). */
export function normalizeSubclassKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function resolveSubclassHint(
  className: string | null | undefined,
  subclass: string | null | undefined,
): string | null {
  const fromMeta = subclass?.trim();
  if (fromMeta) return fromMeta.toLowerCase();
  const m = (className ?? "").match(/\(([^)]+)\)/);
  return m?.[1]?.trim().toLowerCase() ?? null;
}

export function matchSubclassOption<T extends { id: string; nameEn: string; nameDe: string }>(
  hint: string | null | undefined,
  options: T[],
): T | null {
  if (!hint?.trim() || options.length === 0) return null;
  const key = normalizeSubclassKey(hint);
  return (
    options.find(
      (o) =>
        normalizeSubclassKey(o.id) === key ||
        normalizeSubclassKey(o.nameEn) === key ||
        normalizeSubclassKey(o.nameDe) === key,
    ) ?? null
  );
}
