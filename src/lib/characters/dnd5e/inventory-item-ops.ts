import type { CharacterItem, InventoryCategory } from "@/src/types/inventory";
import {
  buildItemDescription,
  CUSTOM_DND5E_TAG,
  metaToInventoryCategory,
  parseDnd5eMetaFromDescription,
  type Dnd5eItemMeta,
  type InventoryDisplayCategory,
} from "./item-meta";
import { parseFoundryItemTag } from "./item-meta";
import {
  createCharacterItem,
  updateCharacterItem,
} from "@/src/lib/actions/character-inventory-actions";

function cloneMeta(item: CharacterItem): Dnd5eItemMeta | null {
  return parseDnd5eMetaFromDescription(item.description);
}

function buildDescriptionFromItem(
  item: CharacterItem,
  meta: Dnd5eItemMeta,
  userText?: string,
): string | null {
  const tags: string[] = [];
  if (parseFoundryItemTag(item.description)) {
    tags.push(`[foundry:${parseFoundryItemTag(item.description)}]`);
  } else {
    tags.push(CUSTOM_DND5E_TAG);
  }
  const catalogMatch = item.description?.match(/\[catalog:[^\]]+\]/i);
  if (catalogMatch) tags.push(catalogMatch[0]);
  return buildItemDescription({
    tags,
    meta,
    userText: userText ?? undefined,
  });
}

export async function setItemQuantity(
  item: CharacterItem,
  quantity: number,
): Promise<CharacterItem> {
  const meta = cloneMeta(item) ?? {
    version: 1 as const,
    kind: "equipment" as const,
    weightLb: 0,
    quantity: 1,
  };
  meta.quantity = Math.max(1, Math.round(quantity));
  const description = buildDescriptionFromItem(item, meta);
  return updateCharacterItem({
    itemId: item.id,
    name: item.name,
    description,
    category: item.category,
    iconType: item.icon_type,
  });
}

export async function setItemInventoryCategory(
  item: CharacterItem,
  category: InventoryDisplayCategory | string,
): Promise<CharacterItem> {
  const meta = cloneMeta(item) ?? {
    version: 1 as const,
    kind: "equipment" as const,
    weightLb: 0,
    quantity: 1,
  };
  meta.inventoryCategory = category;
  const description = buildDescriptionFromItem(item, meta);
  return updateCharacterItem({
    itemId: item.id,
    name: item.name,
    description,
    category: item.category,
    iconType: item.icon_type,
  });
}

export async function duplicateCharacterItem(
  item: CharacterItem,
  quantity = 1,
): Promise<CharacterItem> {
  const meta = cloneMeta(item);
  const description =
    meta != null
      ? buildDescriptionFromItem(item, { ...meta, quantity: Math.max(1, quantity) })
      : item.description;

  const category: InventoryCategory = meta
    ? metaToInventoryCategory(meta)
    : item.category;

  return createCharacterItem({
    characterId: item.character_id,
    name: item.name,
    description,
    category,
    iconType: item.icon_type,
  });
}

export async function splitStack(
  item: CharacterItem,
  splitAmount: number,
): Promise<{ source: CharacterItem; split: CharacterItem }> {
  const currentQty = Math.max(1, parseDnd5eMetaFromDescription(item.description)?.quantity ?? 1);
  const amount = Math.min(Math.max(1, splitAmount), currentQty - 1);
  const source = await setItemQuantity(item, currentQty - amount);
  const split = await duplicateCharacterItem(item, amount);
  return { source, split };
}

export async function consumeFromStack(
  item: CharacterItem,
  consumeAmount: number,
): Promise<CharacterItem | null> {
  const currentQty = Math.max(1, parseDnd5eMetaFromDescription(item.description)?.quantity ?? 1);
  const amount = Math.min(Math.max(1, consumeAmount), currentQty);
  if (amount >= currentQty) {
    const { deleteCharacterItem } = await import("@/src/lib/actions/character-inventory-actions");
    await deleteCharacterItem(item.id);
    return null;
  }
  return setItemQuantity(item, currentQty - amount);
}
