import type { CharacterItem } from "@/src/types/inventory";
import { getItemQuantity, getStackKey } from "./inventory-categories";

export type InventoryStack = {
  stackKey: string;
  /** Primäres Item für Anzeige */
  representative: CharacterItem;
  /** Alle Item-IDs in diesem Stapel */
  itemIds: string[];
  /** Alle Items */
  items: CharacterItem[];
  quantity: number;
};

export function groupItemsIntoStacks(items: CharacterItem[]): InventoryStack[] {
  const map = new Map<string, InventoryStack>();

  for (const item of items) {
    const key = getStackKey(item);
    const qty = getItemQuantity(item);
    const existing = map.get(key);
    if (existing) {
      existing.itemIds.push(item.id);
      existing.items.push(item);
      existing.quantity += qty;
    } else {
      map.set(key, {
        stackKey: key,
        representative: item,
        itemIds: [item.id],
        items: [item],
        quantity: qty,
      });
    }
  }

  return [...map.values()].sort((a, b) =>
    a.representative.name.localeCompare(b.representative.name, "de"),
  );
}

export const INVENTORY_SLOTS_PER_PAGE = 25;
export const INVENTORY_GRID_COLS = 5;
export const INVENTORY_GRID_ROWS = 5;

export function paginateStacks(stacks: InventoryStack[], page: number): {
  pageStacks: InventoryStack[];
  totalPages: number;
  page: number;
} {
  const totalPages = Math.max(1, Math.ceil(stacks.length / INVENTORY_SLOTS_PER_PAGE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * INVENTORY_SLOTS_PER_PAGE;
  const pageStacks = stacks.slice(start, start + INVENTORY_SLOTS_PER_PAGE);
  return { pageStacks, totalPages, page: safePage };
}
