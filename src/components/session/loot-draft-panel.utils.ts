/**
 * loot-draft-panel.utils — Draft item helpers for the loot draft panel.
 */
import type { LootSuggestionItem } from "@/src/lib/actions/ai-loot-actions";
import type { CampaignShopLootPickRow, LootItemRow } from "@/src/lib/actions/loot-actions";
import {
  inferLootInventoryCategory,
  itemTypeToDisplayCategory,
} from "@/src/lib/characters/dnd5e/loot-to-inventory";
import { enrichLootMechanics } from "@/src/lib/characters/dnd5e/loot-mechanics";

export type DraftItem = LootItemRow;

export function suggestionToDraftItems(items: LootSuggestionItem[]): DraftItem[] {
  return items.map((it) => ({
    id: crypto.randomUUID(),
    name: it.name,
    desc: it.desc,
    mundaneName: it.mundaneName,
    mundaneDesc: it.mundaneDesc,
    rarity: it.rarity,
    price: it.price,
    isMagical: it.isMagical,
    inventoryCategory:
      it.inventoryCategory ??
      inferLootInventoryCategory(it.name, it.desc, it.isMagical, it.kind),
    kind: it.kind,
    weightLb: it.weightLb,
    referenceId: it.referenceId,
    attunement: it.attunement,
    damage: it.damage,
    damageType: it.damageType,
    properties: it.properties,
    rangeMeters: it.rangeMeters,
    acFormula: it.acFormula,
    strRequirement: it.strRequirement,
    isShield: it.isShield,
    effect: it.effect,
  }));
}

export function shopRowToDraftItem(row: CampaignShopLootPickRow): DraftItem {
  const isMagical = row.is_magical;
  const base: DraftItem = {
    id: crypto.randomUUID(),
    name: row.name.trim() || "Gegenstand",
    desc: (row.description ?? "").trim(),
    rarity: row.rarity.trim().toLowerCase() || "common",
    price: Math.max(0, Math.round(row.base_price_gp)),
    isMagical,
    inventoryCategory: itemTypeToDisplayCategory(row.item_type),
    kind: row.item_type,
    mundaneName: isMagical ? undefined : undefined,
    mundaneDesc: isMagical ? undefined : undefined,
  };
  return enrichLootMechanics(base);
}
