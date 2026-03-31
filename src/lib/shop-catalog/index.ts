import type { ShopArchetypeKey } from "@/src/lib/shop-archetypes";
import { ALCHEMIST_CATALOG } from "./archetypes/alchemist";
import { BOGENMACHER_CATALOG } from "./archetypes/bogenmacher";
import { GEMISCHTWAREN_CATALOG } from "./archetypes/gemischtwaren";
import { RUSTUNGSSCHMIED_CATALOG } from "./archetypes/rustungsschmied";
import { WAFFENMEISTER_CATALOG } from "./archetypes/waffenmeister";
import type { ShopCatalogItem } from "./types";

export type { ShopCatalogItem, ShopItemKind, DamageTypeDe } from "./types";
export { formatItemDetails, formatItemPrice } from "./format";

const CATALOG_BY_ARCHETYPE: Record<ShopArchetypeKey, ShopCatalogItem[]> = {
  bogenmacher: BOGENMACHER_CATALOG,
  kraeuterkundler: [],
  gemischtwaren: GEMISCHTWAREN_CATALOG,
  schankwirt: [],
  baecker: [],
  fleischer: [],
  alchemist: ALCHEMIST_CATALOG,
  magierbedarf: [],
  waffenmeister: WAFFENMEISTER_CATALOG,
  rustungsschmied: RUSTUNGSSCHMIED_CATALOG,
  abenteurbedarf: [],
};

export function getCatalogForArchetype(
  key: ShopArchetypeKey,
): ShopCatalogItem[] {
  return CATALOG_BY_ARCHETYPE[key] ?? [];
}

export function getCatalogEntryCount(key: ShopArchetypeKey): number {
  return getCatalogForArchetype(key).length;
}

export function hasCatalogContent(key: ShopArchetypeKey): boolean {
  return getCatalogEntryCount(key) > 0;
}
