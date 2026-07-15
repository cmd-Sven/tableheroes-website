import { catalogItemToCopper } from "@/src/lib/dnd-currency";
import { getCatalogForArchetype } from "@/src/lib/shop-catalog";
import type { ShopArchetypeKey } from "@/src/lib/shop-archetypes";
import { SHOP_ARCHETYPES } from "@/src/lib/shop-archetypes";
import type { DamageTypeDe, ShopCatalogItem, ShopItemKind } from "@/src/lib/shop-catalog/types";
import type { InventoryDisplayCategory } from "./item-meta";

/** Stabile Referenz-ID für KI & Loot-Pipeline: `archetype:catalogId` */
export type LootReferenceId = `${ShopArchetypeKey}:${string}`;

/** Harte D&D-5e-Fakten aus dem Shop-Katalog (kanonische Konstanten). */
export type LootReferenceItem = {
  refId: LootReferenceId;
  archetypeKey: ShopArchetypeKey;
  catalogId: string;
  name: string;
  inventoryCategory: InventoryDisplayCategory;
  kind: ShopItemKind;
  weightLb: number;
  priceGp: number;
  isMagical: boolean;
  attunement: boolean;
  damage?: string;
  damageType?: DamageTypeDe;
  properties?: string[];
  rangeMeters?: string;
  acFormula?: string;
  strRequirement?: number;
  isShield?: boolean;
  stealthDisadvantage?: boolean;
  effect?: string;
};

const ARCHETYPES_WITH_CATALOG = SHOP_ARCHETYPES.map((a) => a.key).filter(
  (key) => getCatalogForArchetype(key).length > 0,
);

function catalogKindToInventoryCategory(kind: ShopItemKind): InventoryDisplayCategory {
  switch (kind) {
    case "weapon":
      return "weapons";
    case "armor":
      return "armor";
    case "consumable":
      return "potions";
    case "tool":
      return "tools";
    case "supply":
      return "ingredients";
    default:
      return "gear";
  }
}

function catalogEntryToReference(
  archetypeKey: ShopArchetypeKey,
  entry: ShopCatalogItem,
): LootReferenceItem {
  const refId = `${archetypeKey}:${entry.id}` as LootReferenceId;
  const priceGp = Math.max(0, Math.round(catalogItemToCopper(entry) / 100));
  const isMagical = entry.kind === "magic" || Boolean(entry.attunement);

  return {
    refId,
    archetypeKey,
    catalogId: entry.id,
    name: entry.name,
    inventoryCategory: catalogKindToInventoryCategory(entry.kind),
    kind: entry.kind,
    weightLb: entry.weightLb ?? 0,
    priceGp,
    isMagical,
    attunement: Boolean(entry.attunement),
    damage: entry.damage,
    damageType: entry.damageType,
    properties: entry.properties ? [...entry.properties] : undefined,
    rangeMeters: entry.rangeMeters,
    acFormula: entry.acFormula ?? (entry.isShield ? "+2" : undefined),
    strRequirement: entry.strRequirement,
    isShield: entry.isShield,
    stealthDisadvantage: entry.stealthDisadvantage,
    effect: entry.effect,
  };
}

function normalizeMatchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\+\s*\d+.*$/i, "")
    .replace(/[^a-zäöüß0-9]/gi, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .trim();
}

function buildReferenceMaps(): {
  items: LootReferenceItem[];
  byRefId: Map<string, LootReferenceItem>;
  byName: Map<string, LootReferenceItem>;
} {
  const items: LootReferenceItem[] = [];
  const byRefId = new Map<string, LootReferenceItem>();
  const byName = new Map<string, LootReferenceItem>();

  for (const archetypeKey of ARCHETYPES_WITH_CATALOG) {
    for (const entry of getCatalogForArchetype(archetypeKey)) {
      const ref = catalogEntryToReference(archetypeKey, entry);
      items.push(ref);
      byRefId.set(ref.refId, ref);
      const norm = normalizeMatchName(ref.name);
      if (norm && !byName.has(norm)) {
        byName.set(norm, ref);
      }
    }
  }

  return { items, byRefId, byName };
}

const REF_MAPS = buildReferenceMaps();

/** Alle kanonischen Loot-Referenz-Items (Shop-Katalog = Datenbank der harten Fakten). */
export const LOOT_REFERENCE_ITEMS: LootReferenceItem[] = REF_MAPS.items;

export function parseLootReferenceId(value: string | null | undefined): LootReferenceId | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const sep = raw.indexOf(":");
  if (sep <= 0) return null;
  const archetypeKey = raw.slice(0, sep) as ShopArchetypeKey;
  const catalogId = raw.slice(sep + 1);
  if (!catalogId) return null;
  const full = `${archetypeKey}:${catalogId}`;
  return REF_MAPS.byRefId.has(full) ? (full as LootReferenceId) : null;
}

export function findLootReferenceByRefId(
  refId: string | null | undefined,
): LootReferenceItem | null {
  const parsed = parseLootReferenceId(refId);
  if (!parsed) return null;
  return REF_MAPS.byRefId.get(parsed) ?? null;
}

export function findLootReferenceByName(name: string): LootReferenceItem | null {
  const norm = normalizeMatchName(name);
  if (!norm) return null;
  const direct = REF_MAPS.byName.get(norm);
  if (direct) return direct;

  for (const [key, ref] of REF_MAPS.byName) {
    if (norm.includes(key) || key.includes(norm)) return ref;
  }
  return null;
}

/** Kompakte Zeile für KI-Prompt (Token-sparend). */
export function lootReferenceToPromptLine(ref: LootReferenceItem): string {
  const parts = [
    ref.refId,
    ref.name,
    ref.inventoryCategory,
    ref.kind,
    `${ref.priceGp}gp`,
    `${ref.weightLb}lb`,
  ];
  if (ref.damage) parts.push(`dmg=${ref.damage}`);
  if (ref.damageType) parts.push(`type=${ref.damageType}`);
  if (ref.properties?.length) parts.push(`prop=${ref.properties.join(",")}`);
  if (ref.rangeMeters) parts.push(`range=${ref.rangeMeters}`);
  if (ref.acFormula) parts.push(`ac=${ref.acFormula}`);
  if (ref.strRequirement) parts.push(`str=${ref.strRequirement}`);
  if (ref.isShield) parts.push("shield");
  if (ref.effect) parts.push(`fx=${ref.effect.slice(0, 40)}`);
  if (ref.isMagical) parts.push("magical");
  if (ref.attunement) parts.push("attune");
  return parts.join("|");
}

/** Konstanten-Block für Loot-Gun KI (alle Shop-Katalog-Einträge). */
export function buildLootReferenceConstantsForAi(): string {
  return LOOT_REFERENCE_ITEMS.map(lootReferenceToPromptLine).join("\n");
}
