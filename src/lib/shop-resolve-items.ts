import {
  catalogItemToCopper,
  goldFieldToCopper,
} from "@/src/lib/dnd-currency";
import {
  getCatalogForArchetype,
  type ShopCatalogItem,
} from "@/src/lib/shop-catalog";
import {
  isValidShopArchetypeKey,
  type ShopArchetypeKey,
} from "@/src/lib/shop-archetypes";

export type ResolvedShopItem = {
  id: string;
  name: string;
  description: string | null;
  /** Kanonischer Preis in Kupfer (D&D 5e) */
  base_price_cp: number;
  /** Gold-Äquivalent für Legacy/DB (Dezimal möglich) */
  base_price_gp: number;
  is_magical: boolean;
  is_legal: boolean;
  rarity: string;
  item_type: string;
  target_fap?: number;
  is_ration_package?: boolean;
  /** true wenn Eintrag aus dem Archetyp-Katalog stammt (virtuelle ID) */
  fromCatalog: boolean;
};

export const CATALOG_ITEM_ID_PREFIX = "catalog:";

export function buildCatalogItemId(
  archetypeKey: ShopArchetypeKey,
  catalogItemId: string,
): string {
  return `${CATALOG_ITEM_ID_PREFIX}${archetypeKey}:${catalogItemId}`;
}

export function parseCatalogItemId(
  itemId: string,
): { archetypeKey: ShopArchetypeKey; catalogId: string } | null {
  if (!itemId.startsWith(CATALOG_ITEM_ID_PREFIX)) return null;
  const rest = itemId.slice(CATALOG_ITEM_ID_PREFIX.length);
  const sep = rest.indexOf(":");
  if (sep <= 0) return null;
  const archetypeKey = rest.slice(0, sep);
  const catalogId = rest.slice(sep + 1);
  if (!isValidShopArchetypeKey(archetypeKey) || !catalogId) return null;
  return { archetypeKey, catalogId };
}

function catalogKindToItemType(kind: ShopCatalogItem["kind"]): string {
  switch (kind) {
    case "weapon":
      return "weapon";
    case "armor":
      return "armor";
    case "consumable":
      return "potion";
    case "magic":
      return "gear";
    default:
      return "gear";
  }
}

function catalogRarityToSlug(rarity?: string): string {
  const r = String(rarity ?? "common").toLowerCase();
  if (r.includes("legend")) return "legendary";
  if (r.includes("sehr") || r.includes("very")) return "very rare";
  if (r.includes("selten") || r === "rare") return "rare";
  if (r.includes("ungew") || r === "uncommon") return "uncommon";
  return "common";
}

function mapCatalogItem(
  archetypeKey: ShopArchetypeKey,
  item: ShopCatalogItem,
): ResolvedShopItem {
  const base_price_cp = catalogItemToCopper(item);

  return {
    id: buildCatalogItemId(archetypeKey, item.id),
    name: item.name,
    description: item.effect ?? item.categoryLabel ?? null,
    base_price_cp,
    base_price_gp: base_price_cp / 100,
    is_magical: item.kind === "magic" || Boolean(item.attunement),
    is_legal: true,
    rarity: catalogRarityToSlug(item.rarity),
    item_type: catalogKindToItemType(item.kind),
    target_fap: 0,
    is_ration_package: false,
    fromCatalog: true,
  };
}

type DbShopItemRow = {
  id: string;
  name: string;
  description?: string | null;
  base_price_gp?: number | null;
  is_magical?: boolean | null;
  is_legal?: boolean | null;
  rarity?: string | null;
  item_type?: string | null;
  target_fap?: number | null;
  is_ration_package?: boolean | null;
};

export function mapDbShopItem(row: DbShopItemRow): ResolvedShopItem {
  const base_price_cp = goldFieldToCopper(row.base_price_gp);
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    description: row.description != null ? String(row.description) : null,
    base_price_cp,
    base_price_gp: base_price_cp / 100,
    is_magical: Boolean(row.is_magical),
    is_legal: row.is_legal !== false,
    rarity: String(row.rarity ?? "common"),
    item_type: String(row.item_type ?? "gear"),
    target_fap: Math.max(0, Math.round(Number(row.target_fap ?? 0))),
    is_ration_package: Boolean(row.is_ration_package),
    fromCatalog: false,
  };
}

/** DB-Items haben Vorrang; leere Archetyp-Shops nutzen den Standardkatalog. */
export function resolveShopItems(
  shop: {
    shop_mode: string;
    archetype_key: string | null;
  },
  dbRows: DbShopItemRow[],
): ResolvedShopItem[] {
  const dbItems = (dbRows ?? []).map(mapDbShopItem);
  if (dbItems.length > 0) return dbItems;

  if (
    shop.shop_mode === "archetype" &&
    shop.archetype_key &&
    isValidShopArchetypeKey(shop.archetype_key)
  ) {
    return getCatalogForArchetype(shop.archetype_key).map((item) =>
      mapCatalogItem(shop.archetype_key as ShopArchetypeKey, item),
    );
  }

  return [];
}

export function findResolvedShopItem(
  items: ResolvedShopItem[],
  itemId: string,
): ResolvedShopItem | undefined {
  return items.find((item) => item.id === itemId);
}
