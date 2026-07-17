import type { CharacterItem } from "@/src/types/inventory";
import {
  getCatalogForArchetype,
  type ShopCatalogItem,
} from "@/src/lib/shop-catalog";
import {
  parseCatalogItemId,
  type ResolvedShopItem,
} from "@/src/lib/shop-resolve-items";
import type { ShopArchetypeKey } from "@/src/lib/shop-archetypes";
import { isValidShopArchetypeKey } from "@/src/lib/shop-archetypes";
import { metaToResolvedStats, parseDnd5eMetaFromDescription, parseFoundryItemTag } from "./item-meta";
import { lookupWeaponStatsByName } from "./weapon-catalog-lookup";

const CATALOG_TAG_RE = /\[catalog:([a-z_]+):([a-z0-9_-]+)\]/i;

export type ResolvedItemStats = {
  catalogId: string | null;
  archetypeKey: ShopArchetypeKey | null;
  kind: ShopCatalogItem["kind"] | "unknown";
  weightLb: number;
  damage: string | null;
  damageType: string | null;
  properties: string[];
  acFormula: string | null;
  /** Additiver RK-Bonus (Magie, Schild, …) */
  acBonus: number | null;
  /** Magischer Angriffs-/Schadensbonus (+1-Waffe etc.) */
  magicalBonus: number | null;
  isShield: boolean;
  attunement: boolean;
  isMagical: boolean;
  effect: string | null;
  strRequirement: number | null;
  rangeMeters: string | null;
};

const ARCHETYPE_KEYS: ShopArchetypeKey[] = [
  "bogenmacher",
  "gemischtwaren",
  "alchemist",
  "waffenmeister",
  "rustungsschmied",
];

function findCatalogEntry(
  archetypeKey: ShopArchetypeKey,
  catalogId: string,
): ShopCatalogItem | null {
  const list = getCatalogForArchetype(archetypeKey);
  return list.find((e) => e.id === catalogId) ?? null;
}

function findCatalogEntryGlobal(catalogId: string): {
  entry: ShopCatalogItem;
  archetypeKey: ShopArchetypeKey;
} | null {
  for (const key of ARCHETYPE_KEYS) {
    const entry = findCatalogEntry(key, catalogId);
    if (entry) return { entry, archetypeKey: key };
  }
  return null;
}

function catalogToStats(
  entry: ShopCatalogItem,
  archetypeKey: ShopArchetypeKey,
): ResolvedItemStats {
  return {
    catalogId: entry.id,
    archetypeKey,
    kind: entry.kind,
    weightLb: entry.weightLb ?? 0,
    damage: entry.damage ?? null,
    damageType: entry.damageType ?? null,
    properties: entry.properties ?? [],
    acFormula: entry.acFormula ?? null,
    acBonus: null,
    magicalBonus: null,
    isShield: Boolean(entry.isShield),
    attunement: Boolean(entry.attunement),
    isMagical: entry.kind === "magic" || Boolean(entry.attunement),
    effect: entry.effect ?? null,
    strRequirement: entry.strRequirement ?? null,
    rangeMeters: entry.rangeMeters ?? null,
  };
}

function inferFromName(name: string): Partial<ResolvedItemStats> {
  const n = name.toLowerCase();
  const stats: Partial<ResolvedItemStats> = {
    kind: "unknown",
    weightLb: 0,
    properties: [],
    attunement: false,
    isMagical: false,
    isShield: false,
  };

  if (n.includes("rucksack") || n.includes("backpack")) {
    const found = findCatalogEntryGlobal("misc-backpack");
    if (found) return catalogToStats(found.entry, found.archetypeKey);
    return { ...stats, kind: "equipment", weightLb: 5 };
  }
  if (
    n.includes("tasche der halt") ||
    n.includes("bag of holding") ||
    n.includes("bodenlose") ||
    n.includes("portable hole")
  ) {
    return { ...stats, kind: "magic", weightLb: 15, attunement: false, isMagical: true };
  }
  if (n.includes("schild") || n.includes("shield")) {
    return { ...stats, kind: "armor", isShield: true, weightLb: 6, acFormula: "+2", acBonus: 2 };
  }
  if (n.includes("trank") || n.includes("potion")) {
    return { ...stats, kind: "consumable", weightLb: 0.5 };
  }

  return stats;
}

export function parseCatalogTagFromDescription(
  description: string | null | undefined,
): { archetypeKey: ShopArchetypeKey; catalogId: string } | null {
  if (!description) return null;
  const m = description.match(CATALOG_TAG_RE);
  if (!m) return null;
  const archetypeKey = m[1] as ShopArchetypeKey;
  const catalogId = m[2];
  if (!isValidShopArchetypeKey(archetypeKey) || !catalogId) return null;
  return { archetypeKey, catalogId };
}

export function buildCatalogTag(
  archetypeKey: ShopArchetypeKey,
  catalogId: string,
): string {
  return `[catalog:${archetypeKey}:${catalogId}]`;
}

export function resolveCharacterItemStats(item: CharacterItem): ResolvedItemStats {
  const base: ResolvedItemStats = {
    catalogId: null,
    archetypeKey: null,
    kind: "unknown",
    weightLb: 0,
    damage: null,
    damageType: null,
    properties: [],
    acFormula: null,
    acBonus: null,
    magicalBonus: null,
    isShield: false,
    attunement: false,
    isMagical: false,
    effect: null,
    strRequirement: null,
    rangeMeters: null,
  };

  const meta = parseDnd5eMetaFromDescription(item.description);
  if (meta) {
    const fromMeta: ResolvedItemStats = { ...base, ...metaToResolvedStats(meta) };
    const weaponLookup = lookupWeaponStatsByName(item.name);
    // Katalog/Name überschreibt Foundry-Kampfwerte (magische Boni bleiben)
    if (
      weaponLookup?.damage &&
      (fromMeta.kind === "weapon" ||
        item.category === "Weapon" ||
        fromMeta.kind === "unknown" ||
        fromMeta.kind === "equipment")
    ) {
      return {
        ...fromMeta,
        kind: "weapon",
        damage: weaponLookup.damage ?? fromMeta.damage,
        damageType: weaponLookup.damageType ?? fromMeta.damageType,
        properties:
          weaponLookup.properties && weaponLookup.properties.length > 0
            ? weaponLookup.properties
            : fromMeta.properties,
        rangeMeters: weaponLookup.rangeMeters ?? fromMeta.rangeMeters,
        magicalBonus: fromMeta.magicalBonus,
        weightLb:
          fromMeta.weightLb > 0
            ? fromMeta.weightLb
            : (weaponLookup.weightLb ?? 0),
      };
    }
    return fromMeta;
  }

  const tag = parseCatalogTagFromDescription(item.description);
  if (tag) {
    const entry = findCatalogEntry(tag.archetypeKey, tag.catalogId);
    if (entry) return catalogToStats(entry, tag.archetypeKey);
  }

  const desc = `${item.description ?? ""} ${item.name}`.toLowerCase();
  if (desc.includes("magisch") || desc.includes("einstimmung")) {
    base.isMagical = true;
    if (desc.includes("einstimmung")) base.attunement = true;
  }

  const inferred = inferFromName(item.name);
  const merged = { ...base, ...inferred };

  if (
    (merged.kind === "unknown" || merged.kind === "magic" || !merged.damage) &&
    (item.category === "Weapon" || merged.kind === "weapon" || merged.kind === "magic")
  ) {
    const weaponLookup = lookupWeaponStatsByName(item.name);
    if (weaponLookup) {
      return {
        ...merged,
        ...weaponLookup,
        kind: "weapon",
      };
    }
  }

  return merged;
}

export function catalogTagForResolvedShopItem(item: ResolvedShopItem): string | null {
  const parsed = parseCatalogItemId(item.id);
  if (!parsed) return null;
  return buildCatalogTag(parsed.archetypeKey, parsed.catalogId);
}

export function isBackpackItem(item: CharacterItem): boolean {
  const meta = parseDnd5eMetaFromDescription(item.description);
  if (meta?.inventoryCategory === "gepaeck") return true;
  const stats = resolveCharacterItemStats(item);
  if (stats.catalogId === "misc-backpack") return true;
  const n = item.name.toLowerCase();
  return (
    n.includes("rucksack") ||
    n.includes("backpack") ||
    n.includes("gepaeck") ||
    n.includes("gepäck")
  );
}

/** Bekannte Items mit festem RK-Bonus (Fallback ohne Re-Import). */
export function inferAcBonusFromName(name: string): number {
  const n = name.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (
    /ring of protection|ring der beschutzung|ring des schutzes|schutzring/.test(n)
  ) {
    return 1;
  }
  if (
    /cloak of protection|umhang der beschutzung|umhang des schutzes|schutzumhang/.test(n)
  ) {
    return 1;
  }
  if (/ioun stone.*protection|stein der beschutzung/.test(n)) {
    return 1;
  }
  return 0;
}

/** Additiver Bonus aus Meta, Formel „+N“ oder bekannte Item-Namen. */
export function resolveItemAcBonus(
  stats: ResolvedItemStats,
  itemName: string,
): number {
  if (stats.acBonus != null && Number.isFinite(stats.acBonus) && stats.acBonus !== 0) {
    return Math.round(stats.acBonus);
  }
  if (stats.isShield) {
    const fromFormula = parseAdditiveAcFormula(stats.acFormula);
    return fromFormula ?? 2;
  }
  const fromFormula = parseAdditiveAcFormula(stats.acFormula);
  if (fromFormula != null) return fromFormula;
  return inferAcBonusFromName(itemName);
}

/** Parst reine Bonus-Formeln wie „+1“ / „+2“. */
export function parseAdditiveAcFormula(formula: string | null | undefined): number | null {
  if (!formula) return null;
  const m = formula.trim().match(/^\+(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function nameHintsBagOfHolding(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("tasche der halt") ||
    n.includes("bag of holding") ||
    n.includes("bodenlose") ||
    n.includes("portable hole") ||
    n.includes("handy haversack") ||
    n.includes("handlicher rucksack")
  );
}

export function isBagOfHoldingItem(item: CharacterItem): boolean {
  return nameHintsBagOfHolding(item.name);
}

export function isBeltWearableItem(item: CharacterItem): boolean {
  const meta = parseDnd5eMetaFromDescription(item.description);
  if (meta?.inventoryCategory === "guertel") return true;
  const n = item.name.toLowerCase();
  return n.includes("gürtel") || n.includes("guertel") || n.includes("belt");
}

export function inferContainerKind(item: CharacterItem): "backpack" | "bag_of_holding" | null {
  if (isBagOfHoldingItem(item)) return "bag_of_holding";
  if (isBackpackItem(item)) return "backpack";
  return null;
}
