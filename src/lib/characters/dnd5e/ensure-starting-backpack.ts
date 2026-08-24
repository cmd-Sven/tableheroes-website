/**
 * Start-Rucksack: Item + ausgerüsteter Behälter für neue Charaktere
 * und Lazy-Ensure beim Öffnen des Inventars.
 */
import type { CharacterItem } from "@/src/types/inventory";
import {
  CONTAINER_CAPACITY_LB,
  type Dnd5eEquipmentContainer,
  type Dnd5eEquipmentState,
} from "./equipment-types";
import {
  equipItemAsLuggage,
  hasBackpackContainer,
  normalizeEquipmentState,
} from "./equipment";
import {
  buildItemDescription,
  CUSTOM_DND5E_TAG,
  type Dnd5eItemMeta,
} from "./item-meta";
import { buildCatalogTag, isBackpackItem, isLuggageItem } from "./item-resolve";

export const STARTING_BACKPACK_CATALOG_ID = "misc-backpack";
export const STARTING_BACKPACK_ARCHETYPE = "gemischtwaren" as const;
export const STARTING_BACKPACK_NAME = "Rucksack (Leder)";

/** Unverknüpfter Standard-Behälter (z. B. Loot-Auto-Pack). */
export function createDefaultBackpackContainer(
  label = "Rucksack",
): Dnd5eEquipmentContainer {
  return {
    id: crypto.randomUUID(),
    kind: "backpack",
    label,
    linkedItemId: null,
    maxCapacityLb: CONTAINER_CAPACITY_LB.backpack,
    itemIds: [],
  };
}

/** DB-Felder für den Katalog-Rucksack (`misc-backpack`). */
export function buildStartingBackpackItemInsert(): {
  name: string;
  description: string;
  category: "Equipment";
  icon_type: string;
} {
  const meta: Dnd5eItemMeta = {
    version: 1,
    kind: "equipment",
    weightLb: 5,
    quantity: 1,
    isMagical: false,
    attunement: false,
    inventoryCategory: "gepaeck",
    valueGp: 2,
    effect: "Entspricht ca. 2 GP Standardausrüstung",
    rarity: "Gewöhnlich",
  };

  const description = buildItemDescription({
    tags: [
      CUSTOM_DND5E_TAG,
      buildCatalogTag(STARTING_BACKPACK_ARCHETYPE, STARTING_BACKPACK_CATALOG_ID),
    ],
    meta,
    userText: meta.effect ?? null,
  });

  return {
    name: STARTING_BACKPACK_NAME,
    description: description ?? STARTING_BACKPACK_NAME,
    category: "Equipment",
    icon_type: "backpack",
  };
}

export function findUnequippedLuggageItem(
  equipment: Dnd5eEquipmentState,
  items: CharacterItem[],
): CharacterItem | null {
  const eq = normalizeEquipmentState(equipment);
  const linked = new Set(
    eq.containers.map((c) => c.linkedItemId).filter((id): id is string => Boolean(id)),
  );

  const backpacks = items.filter(
    (i) => !i.is_deleted && isBackpackItem(i) && !linked.has(i.id),
  );
  if (backpacks[0]) return backpacks[0];

  const luggage = items.filter(
    (i) => !i.is_deleted && isLuggageItem(i) && !linked.has(i.id),
  );
  return luggage[0] ?? null;
}

export type EnsureStartingBackpackResult = {
  equipment: Dnd5eEquipmentState;
  /** true wenn Equipment geändert wurde und persistiert werden muss */
  equipmentChanged: boolean;
  /** Insert-Payload wenn noch kein Gepäck-Item existiert */
  itemToCreate: ReturnType<typeof buildStartingBackpackItemInsert> | null;
  /** Vorhandenes Item, das als Behälter ausgerüstet werden soll */
  itemToEquip: CharacterItem | null;
};

/**
 * Plant Start-Rucksack: bestehender Behälter → noop;
 * sonst vorhandenes Gepäck ausrüsten; sonst neues Item anlegen + ausrüsten.
 */
export function planEnsureStartingBackpack(
  equipment: Dnd5eEquipmentState,
  items: CharacterItem[],
): EnsureStartingBackpackResult {
  const eq = normalizeEquipmentState(equipment);
  if (hasBackpackContainer(eq)) {
    return {
      equipment: eq,
      equipmentChanged: false,
      itemToCreate: null,
      itemToEquip: null,
    };
  }

  const existing = findUnequippedLuggageItem(eq, items);
  if (existing) {
    const result = equipItemAsLuggage(eq, existing);
    if (result.ok) {
      return {
        equipment: result.equipment,
        equipmentChanged: true,
        itemToCreate: null,
        itemToEquip: existing,
      };
    }
  }

  return {
    equipment: eq,
    equipmentChanged: false,
    itemToCreate: buildStartingBackpackItemInsert(),
    itemToEquip: null,
  };
}

/** Nach Insert: neues Item als Rucksack-Behälter ausrüsten. */
export function equipCreatedBackpackItem(
  equipment: Dnd5eEquipmentState,
  item: CharacterItem,
): Dnd5eEquipmentState {
  const result = equipItemAsLuggage(normalizeEquipmentState(equipment), item);
  if (result.ok) return result.equipment;
  // Fallback: unverknüpfter Behälter (sollte bei frischem Item nicht nötig sein)
  const container = createDefaultBackpackContainer(item.name);
  container.linkedItemId = item.id;
  return {
    ...normalizeEquipmentState(equipment),
    containers: [...normalizeEquipmentState(equipment).containers, container],
  };
}
