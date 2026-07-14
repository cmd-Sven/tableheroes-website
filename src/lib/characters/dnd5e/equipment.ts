import type { CharacterItem } from "@/src/types/inventory";
import type { Dnd5eDerivedSheet, Dnd5eSheetData } from "./types";
import {
  type Dnd5eEquipmentContainer,
  type Dnd5eEquipmentSlot,
  type Dnd5eEquipmentState,
  CONTAINER_CAPACITY_LB,
  MAX_ATTUNEMENT,
  MAX_BELT_SLOTS,
  createEmptyEquipmentState,
} from "./equipment-types";
import { abilityModifier, formatSigned, proficiencyBonus } from "./formulas";
import { parseFoundryItemTag } from "./item-meta";
import { isSimpleWeaponName } from "./weapon-catalog-lookup";
import { resolveCharacterItemStats } from "./item-resolve";

export { createEmptyEquipmentState } from "./equipment-types";

export function normalizeEquipmentState(
  raw: Partial<Dnd5eEquipmentState> | null | undefined,
): Dnd5eEquipmentState {
  const base = createEmptyEquipmentState();
  if (!raw) return base;

  const belt = [...(raw.belt ?? base.belt)];
  while (belt.length < MAX_BELT_SLOTS) belt.push(null);
  belt.length = MAX_BELT_SLOTS;

  return {
    containers: (raw.containers ?? []).map((c) => ({
      id: String(c.id),
      kind: c.kind ?? "backpack",
      label: String(c.label ?? "Gepäck"),
      linkedItemId: c.linkedItemId ?? null,
      itemIds: [...(c.itemIds ?? [])],
    })),
    belt,
    slots: { ...(raw.slots ?? {}) },
    attunedItemIds: [...(raw.attunedItemIds ?? [])].slice(0, MAX_ATTUNEMENT),
  };
}

/** Alle Item-IDs, die irgendwo platziert sind */
export function collectPlacedItemIds(equipment: Dnd5eEquipmentState): Set<string> {
  const ids = new Set<string>();
  for (const c of equipment.containers) {
    for (const id of c.itemIds) ids.add(id);
    if (c.linkedItemId) ids.add(c.linkedItemId);
  }
  for (const id of equipment.belt) {
    if (id) ids.add(id);
  }
  for (const id of Object.values(equipment.slots)) {
    if (id) ids.add(id);
  }
  return ids;
}

export function hasBackpackContainer(equipment: Dnd5eEquipmentState): boolean {
  return equipment.containers.some((c) => c.kind === "backpack" || c.kind === "bag_of_holding");
}

export function carryingCapacityLb(strScore: number): number {
  return Math.max(0, Math.round(strScore)) * 15;
}

export function itemWeightLb(item: CharacterItem): number {
  return resolveCharacterItemStats(item).weightLb ?? 0;
}

export function computeEquipmentWeight(
  items: CharacterItem[],
  equipment: Dnd5eEquipmentState,
): number {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const placed = collectPlacedItemIds(equipment);
  let total = 0;
  for (const id of placed) {
    const item = itemMap.get(id);
    if (item) total += itemWeightLb(item);
  }
  return Math.round(total * 10) / 10;
}

export function getUnassignedItems(
  items: CharacterItem[],
  equipment: Dnd5eEquipmentState,
): CharacterItem[] {
  const placed = collectPlacedItemIds(equipment);
  return items.filter((i) => !i.is_deleted && !placed.has(i.id));
}

export function removeItemFromEquipment(
  equipment: Dnd5eEquipmentState,
  itemId: string,
): Dnd5eEquipmentState {
  const next = normalizeEquipmentState(equipment);
  next.containers = next.containers.map((c) => ({
    ...c,
    itemIds: c.itemIds.filter((id) => id !== itemId),
    linkedItemId: c.linkedItemId === itemId ? null : c.linkedItemId,
  }));
  next.belt = next.belt.map((id) => (id === itemId ? null : id));
  for (const key of Object.keys(next.slots) as Dnd5eEquipmentSlot[]) {
    if (next.slots[key] === itemId) next.slots[key] = null;
  }
  next.attunedItemIds = next.attunedItemIds.filter((id) => id !== itemId);
  return next;
}

export function placeItemInSlot(
  equipment: Dnd5eEquipmentState,
  slot: Dnd5eEquipmentSlot,
  itemId: string | null,
): Dnd5eEquipmentState {
  let next = normalizeEquipmentState(equipment);
  if (itemId) next = removeItemFromEquipment(next, itemId);
  next.slots = { ...next.slots, [slot]: itemId };
  return next;
}

export function placeItemOnBelt(
  equipment: Dnd5eEquipmentState,
  index: number,
  itemId: string | null,
): Dnd5eEquipmentState {
  let next = normalizeEquipmentState(equipment);
  if (itemId) next = removeItemFromEquipment(next, itemId);
  const belt = [...next.belt];
  belt[index] = itemId;
  next.belt = belt;
  return next;
}

export function placeItemInContainer(
  equipment: Dnd5eEquipmentState,
  containerId: string,
  itemId: string | null,
): Dnd5eEquipmentState {
  let next = normalizeEquipmentState(equipment);
  if (itemId) next = removeItemFromEquipment(next, itemId);
  next.containers = next.containers.map((c) => {
    if (c.id !== containerId) return c;
    const itemIds = itemId ? [...c.itemIds, itemId] : c.itemIds;
    return { ...c, itemIds };
  });
  return next;
}

export function toggleAttunement(
  equipment: Dnd5eEquipmentState,
  itemId: string,
): Dnd5eEquipmentState {
  const next = normalizeEquipmentState(equipment);
  const idx = next.attunedItemIds.indexOf(itemId);
  if (idx >= 0) {
    next.attunedItemIds = next.attunedItemIds.filter((id) => id !== itemId);
    return next;
  }
  if (next.attunedItemIds.length >= MAX_ATTUNEMENT) return next;
  next.attunedItemIds = [...next.attunedItemIds, itemId];
  return next;
}

export function containerWeightLb(
  container: Dnd5eEquipmentContainer,
  items: CharacterItem[],
): number {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  let w = 0;
  if (container.linkedItemId) {
    const linked = itemMap.get(container.linkedItemId);
    if (linked) w += itemWeightLb(linked);
  }
  for (const id of container.itemIds) {
    const item = itemMap.get(id);
    if (item) w += itemWeightLb(item);
  }
  return Math.round(w * 10) / 10;
}

export type WeaponAttackPreview = {
  itemId: string;
  name: string;
  attackBonus: number;
  damage: string;
  notes: string;
};

function weaponUsesDex(properties: string[]): boolean {
  const joined = properties.join(" ").toLowerCase();
  if (joined.includes("geschick") || joined.includes("finesse")) return true;
  if (joined.includes("fernkampf") || joined.includes("ranged")) return true;
  return false;
}

function findCharacterItemByRef(
  items: CharacterItem[],
  ref: string | null | undefined,
): CharacterItem | undefined {
  if (!ref) return undefined;
  const byId = items.find((i) => i.id === ref);
  if (byId) return byId;
  return items.find((i) => parseFoundryItemTag(i.description) === ref);
}

function hasWeaponProficiency(
  sheet: Dnd5eSheetData,
  item: CharacterItem,
  stats: ReturnType<typeof resolveCharacterItemStats>,
): boolean {
  const weapons = sheet.proficiencies?.weapons ?? [];
  if (weapons.length === 0) return true;

  const n = item.name.toLowerCase();
  const joined = weapons.join(" ").toLowerCase();

  if (
    weapons.some(
      (w) =>
        n.includes(w.toLowerCase()) ||
        w.toLowerCase().includes(n) ||
        (w.length >= 3 && n.includes(w.toLowerCase().slice(0, 4))),
    )
  ) {
    return true;
  }

  const simpleGroup =
    joined.includes("simple") ||
    joined.includes("einfach") ||
    joined.includes("simp");
  const martialGroup =
    joined.includes("martial") || joined.includes("krieg") || joined.includes("krieger");

  if (simpleGroup && isSimpleWeaponName(item.name)) return true;
  if (martialGroup && stats.kind === "weapon" && !isSimpleWeaponName(item.name)) return true;

  return false;
}

function parseAcFormula(
  formula: string,
  dexMod: number,
): { ac: number; note: string } | null {
  const trimmed = formula.trim();
  const maxDexMatch = trimmed.match(/(\d+)\s*\+\s*GES\s*\(\s*max\s*(\d+)\s*\)/i);
  if (maxDexMatch) {
    const base = parseInt(maxDexMatch[1], 10);
    const cap = parseInt(maxDexMatch[2], 10);
    const effectiveDex = Math.min(dexMod, cap);
    return {
      ac: base + effectiveDex,
      note: `Rüstung ${base} + GES (max ${cap})`,
    };
  }
  const plusDex = trimmed.match(/^(\d+)\s*\+\s*GES$/i);
  if (plusDex) {
    const base = parseInt(plusDex[1], 10);
    return { ac: base + dexMod, note: `Rüstung ${base} + GES` };
  }
  if (/^\d+$/.test(trimmed)) {
    const base = parseInt(trimmed, 10);
    return { ac: base, note: `Rüstung RK ${base}` };
  }
  return null;
}

export function computeEquippedWeaponAttacks(
  sheet: Dnd5eSheetData,
  derived: Dnd5eDerivedSheet,
  items: CharacterItem[],
  equipment: Dnd5eEquipmentState,
  level: number,
): WeaponAttackPreview[] {
  const pb = proficiencyBonus(level);
  const strMod = derived.abilities.str.modifier;
  const dexMod = derived.abilities.dex.modifier;
  const previews: WeaponAttackPreview[] = [];

  for (const slot of ["mainHand", "offHand"] as const) {
    const itemId = equipment.slots?.[slot];
    if (!itemId) continue;
    const item = findCharacterItemByRef(items, itemId);
    if (!item) continue;
    const stats = resolveCharacterItemStats(item);
    if (stats.kind !== "weapon" && item.category !== "Weapon") continue;

    const sheetAttack =
      sheet.attacks.find(
        (a) =>
          a.name.toLowerCase() === item.name.toLowerCase() ||
          a.id === item.id ||
          a.id === parseFoundryItemTag(item.description),
      ) ?? null;

    const useDex = weaponUsesDex(stats.properties);
    const abMod = useDex ? dexMod : strMod;
    const prof = hasWeaponProficiency(sheet, item, stats) ? pb : 0;
    let attackBonus =
      sheetAttack?.attackBonusOverride != null
        ? sheetAttack.attackBonusOverride
        : abMod + prof;

    const damageDice = stats.damage ?? sheetAttack?.damage?.split(/\s+/)[0] ?? null;
    const damageType = stats.damageType ?? "";
    const dmgParts = [damageDice, damageType].filter(Boolean);
    const damage =
      dmgParts.length > 0
        ? `${dmgParts.join(" ")} ${formatSigned(abMod)}`
        : sheetAttack?.damage
          ? `${sheetAttack.damage} ${formatSigned(abMod)}`
          : `— ${formatSigned(abMod)}`;

    const notes = [
      stats.properties.length ? stats.properties.join(", ") : null,
      sheetAttack?.notes ?? null,
      stats.rangeMeters ? `Reichweite ${stats.rangeMeters} m` : null,
      stats.isShield ? "Schild (+2 RK)" : null,
      !hasWeaponProficiency(sheet, item, stats) ? "Keine Waffenübung" : null,
    ]
      .filter(Boolean)
      .join(" · ");

    previews.push({
      itemId: item.id,
      name: item.name,
      attackBonus,
      damage,
      notes,
    });
  }

  return previews;
}

export function computeArmorClassPreview(
  sheet: Dnd5eSheetData,
  derived: Dnd5eDerivedSheet,
  items: CharacterItem[],
  equipment: Dnd5eEquipmentState,
): { ac: number; breakdown: string } {
  const chestId = equipment.slots?.chest;
  const offId = equipment.slots?.offHand;
  const dexMod = derived.abilities.dex.modifier;

  let ac = 10 + dexMod;
  const parts: string[] = ["Basis 10 + GES"];

  if (chestId) {
    const armor = findCharacterItemByRef(items, chestId);
    if (armor) {
      const stats = resolveCharacterItemStats(armor);
      if (stats.acFormula) {
        const parsed = parseAcFormula(stats.acFormula, dexMod);
        if (parsed) {
          ac = parsed.ac;
          parts.length = 0;
          parts.push(parsed.note);
        }
      }
    }
  }

  if (offId) {
    const off = findCharacterItemByRef(items, offId);
    if (off) {
      const stats = resolveCharacterItemStats(off);
      if (stats.isShield) {
        ac += 2;
        parts.push("Schild +2");
      }
    }
  }

  if (sheet.combat.acOverride != null) {
    return { ac: derived.ac, breakdown: "Manueller RK-Override" };
  }

  return { ac, breakdown: parts.join(" · ") };
}
