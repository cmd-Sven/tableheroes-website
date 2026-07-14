import type { ResolvedItemStats } from "./item-resolve";
import { WAFFENMEISTER_CATALOG } from "@/src/lib/shop-catalog/archetypes/waffenmeister";

/** Englische Foundry-Namen → Katalog-ID */
const WEAPON_ALIASES: Record<string, string> = {
  mace: "wpn-mace",
  streitkolben: "wpn-mace",
  quarterstaff: "wpn-quarterstaff",
  quartierstab: "wpn-quarterstaff",
  staff: "wpn-quarterstaff",
  dagger: "wpn-dagger",
  dolch: "wpn-dagger",
  handaxe: "wpn-handaxe",
  handbeil: "wpn-handaxe",
  spear: "wpn-spear",
  speer: "wpn-spear",
  lance: "wpn-lance",
  lanze: "wpn-lance",
  longsword: "wpn-longsword",
  langschwert: "wpn-longsword",
  rapier: "wpn-rapier",
  rapierdegen: "wpn-rapier",
  greatsword: "wpn-greatsword",
  zweihänder: "wpn-greatsword",
  zweihander: "wpn-greatsword",
  broadsword: "wpn-broadsword",
  battleaxe: "wpn-battleaxe",
  streitaxt: "wpn-battleaxe",
  halberd: "wpn-halberd",
  hellebarde: "wpn-halberd",
  scimitar: "wpn-scimitar",
  krummsäbel: "wpn-scimitar",
  warhammer: "wpn-warhammer",
  maul: "wpn-maul",
};

function normalizeWeaponName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zäöüß0-9]/gi, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

export function lookupWeaponStatsByName(name: string): Partial<ResolvedItemStats> | null {
  const norm = normalizeWeaponName(name);
  if (!norm) return null;

  let catalogId: string | undefined;
  for (const [alias, id] of Object.entries(WEAPON_ALIASES)) {
    if (norm === normalizeWeaponName(alias) || norm.includes(normalizeWeaponName(alias))) {
      catalogId = id;
      break;
    }
  }

  if (!catalogId) {
    const direct = WAFFENMEISTER_CATALOG.find(
      (e) => normalizeWeaponName(e.name) === norm || norm.includes(normalizeWeaponName(e.name)),
    );
    if (direct) catalogId = direct.id;
  }

  if (!catalogId) return null;

  const entry = WAFFENMEISTER_CATALOG.find((e) => e.id === catalogId);
  if (!entry) return null;

  return {
    kind: "weapon",
    weightLb: entry.weightLb ?? 0,
    damage: entry.damage ?? null,
    damageType: entry.damageType ?? null,
    properties: entry.properties ?? [],
    rangeMeters: entry.rangeMeters ?? null,
  };
}

/** Einfache Waffen (D&D 5e) für Proficiency-Heuristik */
export const SIMPLE_WEAPON_NAME_FRAGMENTS = [
  "club",
  "knüppel",
  "dagger",
  "dolch",
  "greatclub",
  "großknüppel",
  "handaxe",
  "handbeil",
  "javelin",
  "wurfspeer",
  "light hammer",
  "leichter hammer",
  "mace",
  "streitkolben",
  "quarterstaff",
  "quartierstab",
  "staff",
  "spear",
  "speer",
  "crossbow",
  "armbrust",
  "dart",
  "wurfpfeil",
  "shortbow",
  "kurzbogen",
  "sling",
  "schleuder",
];

export function isSimpleWeaponName(name: string): boolean {
  const n = name.toLowerCase();
  return SIMPLE_WEAPON_NAME_FRAGMENTS.some((f) => n.includes(f));
}
