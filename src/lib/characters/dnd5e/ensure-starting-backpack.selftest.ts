/**
 * Selftest: Start-Rucksack Planung (ohne DB).
 * Run: npx tsx src/lib/characters/dnd5e/ensure-starting-backpack.selftest.ts
 */
import { createEmptyEquipmentState } from "./equipment-types";
import { hasBackpackContainer } from "./equipment";
import {
  buildStartingBackpackItemInsert,
  equipCreatedBackpackItem,
  planEnsureStartingBackpack,
  STARTING_BACKPACK_CATALOG_ID,
  STARTING_BACKPACK_NAME,
} from "./ensure-starting-backpack";
import type { CharacterItem } from "@/src/types/inventory";
import { isBackpackItem } from "./item-resolve";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function fakeItem(partial: Partial<CharacterItem> & { name: string }): CharacterItem {
  return {
    id: partial.id ?? crypto.randomUUID(),
    character_id: partial.character_id ?? "char-1",
    name: partial.name,
    description: partial.description ?? null,
    category: partial.category ?? "Equipment",
    icon_type: partial.icon_type ?? "backpack",
    is_deleted: partial.is_deleted ?? false,
    target_fap: partial.target_fap ?? 0,
    current_fap: partial.current_fap ?? 0,
  };
}

function main() {
  // 1) Leeres Inventar → Item anlegen planen
  const empty = planEnsureStartingBackpack(createEmptyEquipmentState(), []);
  assert(empty.itemToCreate, "sollte Start-Item planen");
  assert(empty.itemToCreate.name === STARTING_BACKPACK_NAME, "Name Rucksack");
  assert(
    empty.itemToCreate.description.includes(STARTING_BACKPACK_CATALOG_ID),
    "Catalog-Tag erwartet",
  );
  assert(!empty.equipmentChanged, "noch kein Equipment-Change ohne Item-ID");

  // 2) Nach Create: ausrüsten
  const created = fakeItem({
    name: empty.itemToCreate.name,
    description: empty.itemToCreate.description,
  });
  assert(isBackpackItem(created), "Katalog-Item muss als Rucksack erkannt werden");
  const equipped = equipCreatedBackpackItem(createEmptyEquipmentState(), created);
  assert(hasBackpackContainer(equipped), "Behälter nach Equip");
  assert(
    equipped.containers[0]?.linkedItemId === created.id,
    "linkedItemId gesetzt",
  );

  // 3) Bereits Behälter → noop
  const noop = planEnsureStartingBackpack(equipped, [created]);
  assert(!noop.itemToCreate && !noop.equipmentChanged, "Idempotent bei vorhandenem Behälter");

  // 4) Item vorhanden, nicht ausgerüstet → equip
  const unequippedPlan = planEnsureStartingBackpack(createEmptyEquipmentState(), [
    created,
  ]);
  assert(!unequippedPlan.itemToCreate, "kein neues Item");
  assert(unequippedPlan.equipmentChanged, "sollte existierendes Gepäck ausrüsten");
  assert(hasBackpackContainer(unequippedPlan.equipment), "Behälter nach Plan");

  // 5) Insert-Builder konsistent
  const insert = buildStartingBackpackItemInsert();
  assert(insert.category === "Equipment", "category Equipment");
  assert(insert.icon_type === "backpack", "icon backpack");

  console.log("ensure-starting-backpack.selftest: OK");
}

main();
