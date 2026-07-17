/**
 * SRD/PHB armor, weapon & tool proficiency catalog + per-class grants.
 * Source of truth for sheet.proficiencies (armor / weapons / tools).
 * Languages come from campaign lore (characters.languages), not this catalog.
 */
import type { Dnd5eSheetData } from "../types";
import { resolveClassId } from "./class-ids";
import type { ClassId } from "./types";

export type ProficiencyCategory = "armor" | "weapons" | "tools";

export type ProficiencyDefinition = {
  id: string;
  category: ProficiencyCategory;
  nameEn: string;
  nameDe: string;
  /** Foundry dnd5e trait keys (e.g. lgt, sim, thief) */
  foundryKeys?: string[];
  /** Extra match strings (DE/EN free text, aliases) */
  aliases?: string[];
};

export type ClassProficiencyGrant = {
  armor: string[];
  weapons: string[];
  tools: string[];
};

function normalizeMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

export const PROFICIENCY_CATALOG: ProficiencyDefinition[] = [
  // Armor
  {
    id: "armor-light",
    category: "armor",
    nameEn: "Light armor",
    nameDe: "Leichte Rüstung",
    foundryKeys: ["lgt"],
    aliases: ["light", "leichte rustung", "leichte ruestung"],
  },
  {
    id: "armor-medium",
    category: "armor",
    nameEn: "Medium armor",
    nameDe: "Mittlere Rüstung",
    foundryKeys: ["med"],
    aliases: ["medium", "mittlere rustung", "mittlere ruestung"],
  },
  {
    id: "armor-heavy",
    category: "armor",
    nameEn: "Heavy armor",
    nameDe: "Schwere Rüstung",
    foundryKeys: ["hvy"],
    aliases: ["heavy", "schwere rustung", "schwere ruestung"],
  },
  {
    id: "armor-shields",
    category: "armor",
    nameEn: "Shields",
    nameDe: "Schilde",
    foundryKeys: ["shl"],
    aliases: ["shield", "schild"],
  },
  // Weapon groups
  {
    id: "weapon-simple",
    category: "weapons",
    nameEn: "Simple weapons",
    nameDe: "Einfache Waffen",
    foundryKeys: ["sim"],
    aliases: ["simple", "einfache waffen", "simple weapons"],
  },
  {
    id: "weapon-martial",
    category: "weapons",
    nameEn: "Martial weapons",
    nameDe: "Kriegswaffen",
    foundryKeys: ["mar"],
    aliases: ["martial", "kriegswaffen", "martial weapons"],
  },
  // Specific weapons (class lists / race grants)
  {
    id: "weapon-club",
    category: "weapons",
    nameEn: "Clubs",
    nameDe: "Keulen",
    foundryKeys: ["club"],
    aliases: ["club", "keule"],
  },
  {
    id: "weapon-dagger",
    category: "weapons",
    nameEn: "Daggers",
    nameDe: "Dolche",
    foundryKeys: ["dagger"],
    aliases: ["dagger", "dolch"],
  },
  {
    id: "weapon-dart",
    category: "weapons",
    nameEn: "Darts",
    nameDe: "Wurfpfeile",
    foundryKeys: ["dart"],
    aliases: ["dart", "wurfpfeil"],
  },
  {
    id: "weapon-javelin",
    category: "weapons",
    nameEn: "Javelins",
    nameDe: "Wurfspeere",
    foundryKeys: ["javelin"],
    aliases: ["javelin", "wurfspeer"],
  },
  {
    id: "weapon-mace",
    category: "weapons",
    nameEn: "Maces",
    nameDe: "Streitkolben",
    foundryKeys: ["mace"],
    aliases: ["mace", "streitkolben"],
  },
  {
    id: "weapon-quarterstaff",
    category: "weapons",
    nameEn: "Quarterstaffs",
    nameDe: "Kampfstäbe",
    foundryKeys: ["quarterstaff"],
    aliases: ["quarterstaff", "kampfstab", "kampfstaebe", "stab"],
  },
  {
    id: "weapon-sickle",
    category: "weapons",
    nameEn: "Sickles",
    nameDe: "Sicheln",
    foundryKeys: ["sickle"],
    aliases: ["sickle", "sichel"],
  },
  {
    id: "weapon-spear",
    category: "weapons",
    nameEn: "Spears",
    nameDe: "Speere",
    foundryKeys: ["spear"],
    aliases: ["spear", "speer"],
  },
  {
    id: "weapon-sling",
    category: "weapons",
    nameEn: "Slings",
    nameDe: "Schleudern",
    foundryKeys: ["sling"],
    aliases: ["sling", "schleuder"],
  },
  {
    id: "weapon-light-crossbow",
    category: "weapons",
    nameEn: "Light crossbows",
    nameDe: "Leichte Armbrüste",
    foundryKeys: ["lightcrossbow", "lightCrossbow"],
    aliases: ["light crossbow", "leichte armbrust", "leichte armbrueste"],
  },
  {
    id: "weapon-hand-crossbow",
    category: "weapons",
    nameEn: "Hand crossbows",
    nameDe: "Handarmbrüste",
    foundryKeys: ["handcrossbow", "handCrossbow"],
    aliases: ["hand crossbow", "handarmbrust", "handarmbrueste"],
  },
  {
    id: "weapon-longsword",
    category: "weapons",
    nameEn: "Longswords",
    nameDe: "Langschwerter",
    foundryKeys: ["longsword"],
    aliases: ["longsword", "langschwert"],
  },
  {
    id: "weapon-rapier",
    category: "weapons",
    nameEn: "Rapiers",
    nameDe: "Degen",
    foundryKeys: ["rapier"],
    aliases: ["rapier", "degen"],
  },
  {
    id: "weapon-shortsword",
    category: "weapons",
    nameEn: "Shortswords",
    nameDe: "Kurzschwerter",
    foundryKeys: ["shortsword"],
    aliases: ["shortsword", "kurzschwert"],
  },
  {
    id: "weapon-scimitar",
    category: "weapons",
    nameEn: "Scimitars",
    nameDe: "Krummsäbel",
    foundryKeys: ["scimitar"],
    aliases: ["scimitar", "krummsabel", "krummsaebele", "säbel", "saebel"],
  },
  {
    id: "weapon-battleaxe",
    category: "weapons",
    nameEn: "Battleaxes",
    nameDe: "Streitäxte",
    foundryKeys: ["battleaxe"],
    aliases: ["battleaxe", "streitaxt", "streitaexte"],
  },
  {
    id: "weapon-handaxe",
    category: "weapons",
    nameEn: "Handaxes",
    nameDe: "Handäxte",
    foundryKeys: ["handaxe"],
    aliases: ["handaxe", "handaxt", "handaexte"],
  },
  {
    id: "weapon-light-hammer",
    category: "weapons",
    nameEn: "Light hammers",
    nameDe: "Leichte Hämmer",
    foundryKeys: ["lighthammer", "lightHammer"],
    aliases: ["light hammer", "leichter hammer", "leichte hammer"],
  },
  {
    id: "weapon-warhammer",
    category: "weapons",
    nameEn: "Warhammers",
    nameDe: "Kriegshämmer",
    foundryKeys: ["warhammer"],
    aliases: ["warhammer", "kriegshammer", "kriegshaemmer"],
  },
  // Tools
  {
    id: "tool-thieves",
    category: "tools",
    nameEn: "Thieves' tools",
    nameDe: "Diebeswerkzeug",
    foundryKeys: ["thief", "thieves"],
    aliases: ["thieves tools", "thieves' tools", "diebeswerkzeug"],
  },
  {
    id: "tool-herbalism",
    category: "tools",
    nameEn: "Herbalism kit",
    nameDe: "Kräuterkunde-Ausrüstung",
    foundryKeys: ["herb"],
    aliases: ["herbalism", "herbalism kit", "krauterkunde", "kraeuterkunde"],
  },
  {
    id: "tool-smith",
    category: "tools",
    nameEn: "Smith's tools",
    nameDe: "Schmiedewerkzeug",
    foundryKeys: ["smith"],
    aliases: ["smiths tools", "smith's tools", "schmiedewerkzeug"],
  },
  {
    id: "tool-brewer",
    category: "tools",
    nameEn: "Brewer's supplies",
    nameDe: "Brauerausrüstung",
    foundryKeys: ["brew"],
    aliases: ["brewers supplies", "brewer's supplies", "brauerausrustung", "brauerausruestung"],
  },
  {
    id: "tool-mason",
    category: "tools",
    nameEn: "Mason's tools",
    nameDe: "Maurerwerkzeug",
    foundryKeys: ["mason"],
    aliases: ["masons tools", "mason's tools", "maurerwerkzeug"],
  },
  {
    id: "tool-navigator",
    category: "tools",
    nameEn: "Navigator's tools",
    nameDe: "Navigatorenwerkzeug",
    foundryKeys: ["navg"],
    aliases: ["navigators tools", "navigator's tools", "navigatorenwerkzeug"],
  },
  {
    id: "tool-vehicles-land",
    category: "tools",
    nameEn: "Vehicles (land)",
    nameDe: "Fahrzeuge (Land)",
    foundryKeys: ["vehicleLand", "land"],
    aliases: ["vehicles land", "land vehicles", "fahrzeuge land"],
  },
  {
    id: "tool-vehicles-water",
    category: "tools",
    nameEn: "Vehicles (water)",
    nameDe: "Fahrzeuge (Wasser)",
    foundryKeys: ["vehicleWater", "water"],
    aliases: ["vehicles water", "water vehicles", "fahrzeuge wasser"],
  },
];

const BY_ID = new Map(PROFICIENCY_CATALOG.map((p) => [p.id, p]));

/** PHB class starting armor / weapon / tool proficiencies (fixed grants only). */
export const CLASS_PROFICIENCIES: Record<ClassId, ClassProficiencyGrant> = {
  barbarian: {
    armor: ["armor-light", "armor-medium", "armor-shields"],
    weapons: ["weapon-simple", "weapon-martial"],
    tools: [],
  },
  bard: {
    armor: ["armor-light"],
    weapons: [
      "weapon-simple",
      "weapon-hand-crossbow",
      "weapon-longsword",
      "weapon-rapier",
      "weapon-shortsword",
    ],
    tools: [],
  },
  cleric: {
    armor: ["armor-light", "armor-medium", "armor-shields"],
    weapons: ["weapon-simple"],
    tools: [],
  },
  druid: {
    armor: ["armor-light", "armor-medium", "armor-shields"],
    weapons: [
      "weapon-club",
      "weapon-dagger",
      "weapon-dart",
      "weapon-javelin",
      "weapon-mace",
      "weapon-quarterstaff",
      "weapon-scimitar",
      "weapon-sickle",
      "weapon-sling",
      "weapon-spear",
    ],
    tools: ["tool-herbalism"],
  },
  fighter: {
    armor: ["armor-light", "armor-medium", "armor-heavy", "armor-shields"],
    weapons: ["weapon-simple", "weapon-martial"],
    tools: [],
  },
  monk: {
    armor: [],
    weapons: ["weapon-simple", "weapon-shortsword"],
    tools: [],
  },
  paladin: {
    armor: ["armor-light", "armor-medium", "armor-heavy", "armor-shields"],
    weapons: ["weapon-simple", "weapon-martial"],
    tools: [],
  },
  ranger: {
    armor: ["armor-light", "armor-medium", "armor-shields"],
    weapons: ["weapon-simple", "weapon-martial"],
    tools: [],
  },
  rogue: {
    armor: ["armor-light"],
    weapons: [
      "weapon-simple",
      "weapon-hand-crossbow",
      "weapon-longsword",
      "weapon-rapier",
      "weapon-shortsword",
    ],
    tools: ["tool-thieves"],
  },
  sorcerer: {
    armor: [],
    weapons: [
      "weapon-dagger",
      "weapon-dart",
      "weapon-sling",
      "weapon-quarterstaff",
      "weapon-light-crossbow",
    ],
    tools: [],
  },
  warlock: {
    armor: ["armor-light"],
    weapons: ["weapon-simple"],
    tools: [],
  },
  wizard: {
    armor: [],
    weapons: [
      "weapon-dagger",
      "weapon-dart",
      "weapon-sling",
      "weapon-quarterstaff",
      "weapon-light-crossbow",
    ],
    tools: [],
  },
};

export function getProficiencyById(id: string): ProficiencyDefinition | null {
  return BY_ID.get(id) ?? null;
}

export function getProficienciesByCategory(
  category: ProficiencyCategory,
): ProficiencyDefinition[] {
  return PROFICIENCY_CATALOG.filter((p) => p.category === category);
}

export function proficiencyLabel(
  def: ProficiencyDefinition,
  locale: "de" | "en" = "de",
): string {
  return locale === "en" ? def.nameEn : def.nameDe;
}

export function matchProficiencyEntry(
  raw: string,
  category?: ProficiencyCategory,
): ProficiencyDefinition | null {
  const bare = normalizeMatch(raw);
  if (!bare) return null;
  const pool = category
    ? PROFICIENCY_CATALOG.filter((p) => p.category === category)
    : PROFICIENCY_CATALOG;

  for (const p of pool) {
    const keys = [
      p.id,
      p.nameEn,
      p.nameDe,
      ...(p.foundryKeys ?? []),
      ...(p.aliases ?? []),
    ].map(normalizeMatch);
    if (keys.some((k) => k === bare)) return p;
  }

  // Fuzzy: longer catalog key contained in input or vice versa
  const scored = pool
    .map((p) => {
      const keys = [
        p.id,
        p.nameEn,
        p.nameDe,
        ...(p.foundryKeys ?? []),
        ...(p.aliases ?? []),
      ]
        .map(normalizeMatch)
        .filter(Boolean);
      const hit = keys.some(
        (k) => k.length >= 3 && (bare.includes(k) || k.includes(bare)),
      );
      return hit
        ? { p, len: Math.max(...keys.map((k) => k.length)) }
        : null;
    })
    .filter(Boolean) as Array<{ p: ProficiencyDefinition; len: number }>;
  scored.sort((a, b) => b.len - a.len);
  return scored[0]?.p ?? null;
}

export function resolveProficiencyLabel(
  raw: string,
  locale: "de" | "en" = "de",
  category?: ProficiencyCategory,
): string {
  const matched = matchProficiencyEntry(raw, category);
  return matched ? proficiencyLabel(matched, locale) : raw.trim();
}

/** Normalize a list: Foundry keys / free text → catalog labels; keep unmatched. */
export function normalizeProficiencyList(
  items: string[],
  category: ProficiencyCategory,
  locale: "de" | "en" = "de",
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) continue;
    const matched = matchProficiencyEntry(trimmed, category);
    const label = matched ? proficiencyLabel(matched, locale) : trimmed;
    const key = normalizeMatch(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function mergeLabels(existing: string[], add: string[]): string[] {
  const seen = new Set(existing.map(normalizeMatch).filter(Boolean));
  const out = [...existing];
  for (const label of add) {
    const key = normalizeMatch(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

export function getClassProficiencyLabels(
  className: string | null | undefined,
  locale: "de" | "en" = "de",
): { armor: string[]; weapons: string[]; tools: string[] } | null {
  const classId = resolveClassId(className);
  if (!classId) return null;
  const grant = CLASS_PROFICIENCIES[classId];
  if (!grant) return null;
  const mapIds = (ids: string[]) =>
    ids
      .map((id) => getProficiencyById(id))
      .filter(Boolean)
      .map((d) => proficiencyLabel(d!, locale));
  return {
    armor: mapIds(grant.armor),
    weapons: mapIds(grant.weapons),
    tools: mapIds(grant.tools),
  };
}

/**
 * Merge class catalog grants into sheet.proficiencies and normalize existing
 * Foundry/free-text entries against the catalog. Does not touch languages.
 */
export function applyClassProficienciesFromCatalog(
  sheet: Dnd5eSheetData,
  className: string | null | undefined,
  locale: "de" | "en" = "de",
  options?: { replaceClassGrants?: boolean },
): Dnd5eSheetData {
  const classLabels = getClassProficiencyLabels(className, locale);
  const armor = normalizeProficiencyList(sheet.proficiencies.armor, "armor", locale);
  const weapons = normalizeProficiencyList(
    sheet.proficiencies.weapons,
    "weapons",
    locale,
  );
  const tools = normalizeProficiencyList(sheet.proficiencies.tools, "tools", locale);

  if (!classLabels) {
    return {
      ...sheet,
      proficiencies: {
        ...sheet.proficiencies,
        armor,
        weapons,
        tools,
      },
    };
  }

  if (options?.replaceClassGrants) {
    // Keep unmatched custom extras, replace catalog-matched rows with class grants
    const keepCustom = (list: string[], category: ProficiencyCategory) =>
      list.filter((item) => !matchProficiencyEntry(item, category));
    return {
      ...sheet,
      proficiencies: {
        ...sheet.proficiencies,
        armor: mergeLabels(keepCustom(armor, "armor"), classLabels.armor),
        weapons: mergeLabels(keepCustom(weapons, "weapons"), classLabels.weapons),
        tools: mergeLabels(keepCustom(tools, "tools"), classLabels.tools),
      },
    };
  }

  return {
    ...sheet,
    proficiencies: {
      ...sheet.proficiencies,
      armor: mergeLabels(armor, classLabels.armor),
      weapons: mergeLabels(weapons, classLabels.weapons),
      tools: mergeLabels(tools, classLabels.tools),
    },
  };
}

/** Only normalize existing entries (Foundry keys → labels), no class merge. */
export function reconcileProficienciesWithCatalog(
  sheet: Dnd5eSheetData,
  locale: "de" | "en" = "de",
): { sheet: Dnd5eSheetData; changed: number } {
  const armor = normalizeProficiencyList(sheet.proficiencies.armor, "armor", locale);
  const weapons = normalizeProficiencyList(
    sheet.proficiencies.weapons,
    "weapons",
    locale,
  );
  const tools = normalizeProficiencyList(sheet.proficiencies.tools, "tools", locale);

  const before = [
    ...sheet.proficiencies.armor,
    ...sheet.proficiencies.weapons,
    ...sheet.proficiencies.tools,
  ].join("|");
  const after = [...armor, ...weapons, ...tools].join("|");
  const changed = before === after ? 0 : 1;

  return {
    sheet: {
      ...sheet,
      proficiencies: {
        ...sheet.proficiencies,
        armor,
        weapons,
        tools,
      },
    },
    changed,
  };
}

export function listHasProficiency(
  list: string[],
  def: ProficiencyDefinition,
): boolean {
  const keys = new Set(
    [def.id, def.nameEn, def.nameDe, ...(def.foundryKeys ?? []), ...(def.aliases ?? [])].map(
      normalizeMatch,
    ),
  );
  return list.some((item) => keys.has(normalizeMatch(item)));
}

export function toggleProficiencyInList(
  list: string[],
  def: ProficiencyDefinition,
  locale: "de" | "en" = "de",
  checked?: boolean,
): string[] {
  const has = listHasProficiency(list, def);
  const want = checked ?? !has;
  if (want && has) {
    // Ensure canonical label
    const without = list.filter((item) => !listHasProficiency([item], def));
    return [...without, proficiencyLabel(def, locale)];
  }
  if (want) return [...list, proficiencyLabel(def, locale)];
  return list.filter((item) => !listHasProficiency([item], def));
}

export function customProficiencyEntries(
  list: string[],
  category: ProficiencyCategory,
): string[] {
  return list.filter((item) => !matchProficiencyEntry(item, category));
}
