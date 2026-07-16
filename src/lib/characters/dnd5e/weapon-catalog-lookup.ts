import type { ResolvedItemStats } from "./item-resolve";
import { WAFFENMEISTER_CATALOG } from "@/src/lib/shop-catalog/archetypes/waffenmeister";
import { BOGENMACHER_CATALOG } from "@/src/lib/shop-catalog/archetypes/bogenmacher";
import type { ShopCatalogItem } from "@/src/lib/shop-catalog/types";

const WEAPON_CATALOGS: ShopCatalogItem[] = [
  ...WAFFENMEISTER_CATALOG,
  ...BOGENMACHER_CATALOG.filter((e) => e.kind === "weapon"),
];

/** Alias (DE/EN) → Katalog-ID */
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
  kriegshammer: "wpn-warhammer",
  maul: "wpn-maul",
  longbow: "bow-long",
  langbogen: "bow-long",
  shortbow: "bow-short",
  kurzbogen: "bow-short",
  lightcrossbow: "xbow-light",
  leichtearmbrust: "xbow-light",
  heavycrossbow: "xbow-heavy",
  schwerearmbrust: "xbow-heavy",
  handcrossbow: "xbow-hand",
  handarmbrust: "xbow-hand",
};

/** PHB-Fallback für Waffen ohne Shop-Eintrag (D&D 5e SRD) */
const SRD_WEAPON_FALLBACK: Record<
  string,
  Pick<ResolvedItemStats, "damage" | "damageType" | "properties" | "weightLb" | "rangeMeters">
> = {
  shortsword: {
    damage: "1W6",
    damageType: "Stich",
    properties: ["Finesse", "Leicht"],
    weightLb: 2,
    rangeMeters: null,
  },
  kurzschwert: {
    damage: "1W6",
    damageType: "Stich",
    properties: ["Finesse", "Leicht"],
    weightLb: 2,
    rangeMeters: null,
  },
  greataxe: {
    damage: "1W12",
    damageType: "Hieb",
    properties: ["Schwer", "Zweihändig"],
    weightLb: 7,
    rangeMeters: null,
  },
  grossaxt: {
    damage: "1W12",
    damageType: "Hieb",
    properties: ["Schwer", "Zweihändig"],
    weightLb: 7,
    rangeMeters: null,
  },
  club: {
    damage: "1W4",
    damageType: "Wucht",
    properties: ["Leicht"],
    weightLb: 2,
    rangeMeters: null,
  },
  knueppel: {
    damage: "1W4",
    damageType: "Wucht",
    properties: ["Leicht"],
    weightLb: 2,
    rangeMeters: null,
  },
  javelin: {
    damage: "1W6",
    damageType: "Stich",
    properties: ["Wurfwaffe", "Reichweite"],
    weightLb: 2,
    rangeMeters: "9/36",
  },
  wurfspeer: {
    damage: "1W6",
    damageType: "Stich",
    properties: ["Wurfwaffe", "Reichweite"],
    weightLb: 2,
    rangeMeters: "9/36",
  },
  morningstar: {
    damage: "1W8",
    damageType: "Stich",
    properties: [],
    weightLb: 4,
    rangeMeters: null,
  },
  morgenstern: {
    damage: "1W8",
    damageType: "Stich",
    properties: [],
    weightLb: 4,
    rangeMeters: null,
  },
  whip: {
    damage: "1W4",
    damageType: "Hieb",
    properties: ["Finesse", "Reichweite"],
    weightLb: 3,
    rangeMeters: null,
  },
  peitsche: {
    damage: "1W4",
    damageType: "Hieb",
    properties: ["Finesse", "Reichweite"],
    weightLb: 3,
    rangeMeters: null,
  },
  trident: {
    damage: "1W6",
    damageType: "Stich",
    properties: ["Wurfwaffe", "Vielseitig"],
    weightLb: 4,
    rangeMeters: "6/18",
  },
  dreizack: {
    damage: "1W6",
    damageType: "Stich",
    properties: ["Wurfwaffe", "Vielseitig"],
    weightLb: 4,
    rangeMeters: "6/18",
  },
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

function entryToStats(entry: ShopCatalogItem): Partial<ResolvedItemStats> {
  return {
    kind: "weapon",
    weightLb: entry.weightLb ?? 0,
    damage: entry.damage ?? null,
    damageType: entry.damageType ?? null,
    properties: entry.properties ?? [],
    rangeMeters: entry.rangeMeters ?? null,
  };
}

export function lookupWeaponStatsByName(name: string): Partial<ResolvedItemStats> | null {
  const norm = normalizeWeaponName(name);
  if (!norm) return null;

  // Magische Suffixe (+1 etc.) für Namensmatch entfernen
  const bare = norm.replace(/\+\d+$/, "");

  let catalogId: string | undefined;
  // Längere Aliase zuerst, damit "longsword" vor "sword" greift
  const aliases = Object.entries(WEAPON_ALIASES).sort(
    (a, b) => normalizeWeaponName(b[0]).length - normalizeWeaponName(a[0]).length,
  );
  for (const [alias, id] of aliases) {
    const a = normalizeWeaponName(alias);
    if (bare === a || bare.includes(a)) {
      catalogId = id;
      break;
    }
  }

  if (catalogId) {
    const entry = WEAPON_CATALOGS.find((e) => e.id === catalogId);
    if (entry) return entryToStats(entry);
  }

  const direct = WEAPON_CATALOGS.find((e) => {
    const n = normalizeWeaponName(e.name);
    return bare === n || bare.includes(n) || n.includes(bare);
  });
  if (direct) return entryToStats(direct);

  for (const [key, stats] of Object.entries(SRD_WEAPON_FALLBACK)) {
    const k = normalizeWeaponName(key);
    if (bare === k || bare.includes(k)) {
      return { kind: "weapon", ...stats };
    }
  }

  return null;
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
