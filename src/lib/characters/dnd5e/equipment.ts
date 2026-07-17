import type { CharacterItem } from "@/src/types/inventory";
import type { Dnd5eDerivedSheet, Dnd5eSheetData } from "./types";
import {
  type Dnd5eContainerKind,
  type Dnd5eEquipmentContainer,
  type Dnd5eEquipmentLoadout,
  type Dnd5eEquipmentSlot,
  type Dnd5eEquipmentState,
  type Dnd5eGeneralEquipmentSlot,
  type Dnd5eWeaponPreset,
  CONTAINER_CAPACITY_LB,
  MAX_ATTUNEMENT,
  MAX_BELT_SLOTS,
  MAX_WEAPON_PRESETS,
  createEmptyEquipmentState,
} from "./equipment-types";
import { abilityModifier, formatSigned, proficiencyBonus } from "./formulas";
import { parseFoundryItemTag } from "./item-meta";
import { parseDnd5eMetaFromDescription } from "./item-meta";
import { isSimpleWeaponName } from "./weapon-catalog-lookup";
import {
  parseAdditiveAcFormula,
  resolveCharacterItemStats,
  resolveItemAcBonus,
} from "./item-resolve";

export { createEmptyEquipmentState } from "./equipment-types";

export function getContainerMaxCapacityLb(
  kindOrContainer:
    | Dnd5eContainerKind
    | Pick<Dnd5eEquipmentContainer, "kind" | "maxCapacityLb">,
): number {
  const kind = typeof kindOrContainer === "string" ? kindOrContainer : kindOrContainer.kind;
  const custom =
    typeof kindOrContainer === "object" && kindOrContainer.maxCapacityLb != null
      ? Number(kindOrContainer.maxCapacityLb)
      : null;
  if (custom != null && custom > 0) return custom;
  return CONTAINER_CAPACITY_LB[kind];
}

export function normalizeEquipmentState(
  raw: Partial<Dnd5eEquipmentState> | null | undefined,
): Dnd5eEquipmentState {
  const base = createEmptyEquipmentState();
  if (!raw) return base;

  const belt = [...(raw.belt ?? base.belt)];
  while (belt.length < MAX_BELT_SLOTS) belt.push(null);
  belt.length = MAX_BELT_SLOTS;

  const slots: Partial<Record<Dnd5eEquipmentSlot, string | null>> = {
    ...(raw.slots ?? {}),
  };
  const legacy = raw.slots as Record<string, string | null | undefined> | undefined;
  // Legacy: back1 → shoulders; back/back2 (Rücken-Slot) entfällt — Items werden verwaisen & verstaut
  if (legacy?.back1 && !slots.shoulders) slots.shoulders = legacy.back1;
  delete (slots as Record<string, unknown>).back1;
  delete (slots as Record<string, unknown>).back2;
  delete (slots as Record<string, unknown>).back;

  return {
    containers: (raw.containers ?? []).map((c) => ({
      id: String(c.id),
      kind: c.kind ?? "backpack",
      label: String(c.label ?? "Gepäck"),
      linkedItemId: c.linkedItemId ?? null,
      maxCapacityLb:
        c.maxCapacityLb != null && Number(c.maxCapacityLb) > 0
          ? Number(c.maxCapacityLb)
          : null,
      itemIds: [...(c.itemIds ?? [])],
    })),
    belt,
    slots,
    generalSlots: { ...(raw.generalSlots ?? {}) },
    attunedItemIds: [...(raw.attunedItemIds ?? [])].slice(0, MAX_ATTUNEMENT),
    weaponPresets: [...(raw.weaponPresets ?? [])].slice(0, MAX_WEAPON_PRESETS).map((p) => ({
      id: String(p.id),
      name: String(p.name ?? "Waffen"),
      mainHand: p.mainHand ?? null,
      offHand: p.offHand ?? null,
    })),
    loadouts: [...(raw.loadouts ?? [])].map((l) => ({
      id: String(l.id),
      name: String(l.name ?? "Ausrüstung"),
      belt: [...(l.belt ?? [])].slice(0, MAX_BELT_SLOTS),
      slots: { ...(l.slots ?? {}) },
      generalSlots: { ...(l.generalSlots ?? {}) },
      attunedItemIds: [...(l.attunedItemIds ?? [])].slice(0, MAX_ATTUNEMENT),
    })),
    customCategories: [...(raw.customCategories ?? [])].map((cat) => ({
      id: String(cat.id),
      label: String(cat.label ?? "Kategorie"),
      icon: cat.icon ?? undefined,
    })),
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
  for (const id of Object.values(equipment.generalSlots ?? {})) {
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
  const stats = resolveCharacterItemStats(item);
  const meta = parseDnd5eMetaFromDescription(item.description);
  const qty = Math.max(1, Math.round(Number(meta?.quantity) || 1));
  return Math.round((stats.weightLb ?? 0) * qty * 10) / 10;
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
  // linkedItemId bewusst nicht anfassen: es definiert den Behälter selbst,
  // nicht die Lagerposition des Items (sonst verschwinden Rucksäcke beim Umpacken).
  next.containers = next.containers.map((c) => ({
    ...c,
    itemIds: c.itemIds.filter((id) => id !== itemId),
  }));
  next.belt = next.belt.map((id) => (id === itemId ? null : id));
  for (const key of Object.keys(next.slots) as Dnd5eEquipmentSlot[]) {
    if (next.slots[key] === itemId) next.slots[key] = null;
  }
  for (const key of Object.keys(next.generalSlots ?? {}) as Dnd5eGeneralEquipmentSlot[]) {
    if (next.generalSlots?.[key] === itemId) next.generalSlots[key] = null;
  }
  next.attunedItemIds = next.attunedItemIds.filter((id) => id !== itemId);
  return next;
}

/** Behälter, der an dieses Item gekoppelt ist (Rucksack als Container). */
export function findContainerByLinkedItemId(
  equipment: Dnd5eEquipmentState,
  itemId: string,
): Dnd5eEquipmentContainer | undefined {
  return equipment.containers.find((c) => c.linkedItemId === itemId);
}

export function isContainerContentEmpty(container: Dnd5eEquipmentContainer): boolean {
  return container.itemIds.length === 0;
}

/**
 * Darf dieses Gepäck-Item als neuer/aktiver Behälter ausgerüstet werden?
 * Nur leeres Gepäck — bereits gekoppelte Behälter mit Inhalt sind gesperrt.
 */
export function canEquipItemAsContainer(
  equipment: Dnd5eEquipmentState,
  itemId: string,
): { ok: boolean; reason?: "already_equipped" | "not_empty" } {
  const existing = findContainerByLinkedItemId(equipment, itemId);
  if (!existing) return { ok: true };
  if (!isContainerContentEmpty(existing)) return { ok: false, reason: "not_empty" };
  return { ok: false, reason: "already_equipped" };
}

function isContainerReachableFrom(
  equipment: Dnd5eEquipmentState,
  fromContainerId: string,
  targetContainerId: string,
  seen: Set<string> = new Set(),
): boolean {
  if (fromContainerId === targetContainerId) return true;
  if (seen.has(fromContainerId)) return false;
  seen.add(fromContainerId);
  const from = equipment.containers.find((c) => c.id === fromContainerId);
  if (!from) return false;
  for (const id of from.itemIds) {
    const nested = findContainerByLinkedItemId(equipment, id);
    if (nested && isContainerReachableFrom(equipment, nested.id, targetContainerId, seen)) {
      return true;
    }
  }
  return false;
}

/** True wenn itemId in targetContainer gelegt würde → Self-Nest (Rucksack in sich selbst). */
export function wouldSelfContain(
  equipment: Dnd5eEquipmentState,
  targetContainerId: string,
  itemId: string,
): boolean {
  const target = equipment.containers.find((c) => c.id === targetContainerId);
  if (!target) return false;
  if (target.linkedItemId === itemId) return true;

  const source = findContainerByLinkedItemId(equipment, itemId);
  if (!source) return false;
  if (source.id === targetContainerId) return true;
  return isContainerReachableFrom(equipment, source.id, targetContainerId);
}

export function isTwoHandedWeapon(properties: string[]): boolean {
  const joined = properties.join(" ").toLowerCase();
  return joined.includes("zweihändig") || joined.includes("two-handed") || joined.includes("twohanded");
}

export function placeItemInSlot(
  equipment: Dnd5eEquipmentState,
  slot: Dnd5eEquipmentSlot,
  itemId: string | null,
  items?: CharacterItem[],
): Dnd5eEquipmentState {
  let next = normalizeEquipmentState(equipment);
  if (itemId) next = removeItemFromEquipment(next, itemId);

  if (itemId && items && (slot === "mainHand" || slot === "offHand")) {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      const stats = resolveCharacterItemStats(item);
      if (isTwoHandedWeapon(stats.properties)) {
        next.slots = { ...next.slots, mainHand: itemId, offHand: null };
        return next;
      }
      if (slot === "offHand" && next.slots.mainHand) {
        const mainItem = items.find((i) => i.id === next.slots.mainHand);
        if (mainItem) {
          const mainStats = resolveCharacterItemStats(mainItem);
          if (isTwoHandedWeapon(mainStats.properties)) {
            next.slots = { ...next.slots, mainHand: null, offHand: itemId };
            return next;
          }
        }
      }
      if (slot === "mainHand" && next.slots.offHand) {
        const offItem = items.find((i) => i.id === next.slots.offHand);
        if (offItem) {
          const offStats = resolveCharacterItemStats(offItem);
          if (isTwoHandedWeapon(offStats.properties)) {
            next.slots = { ...next.slots, offHand: null, mainHand: itemId };
            return next;
          }
        }
      }
    }
  }

  next.slots = { ...next.slots, [slot]: itemId };
  return next;
}

export function placeItemInGeneralSlot(
  equipment: Dnd5eEquipmentState,
  slot: Dnd5eGeneralEquipmentSlot,
  itemId: string | null,
): Dnd5eEquipmentState {
  let next = normalizeEquipmentState(equipment);
  if (itemId) next = removeItemFromEquipment(next, itemId);
  next.generalSlots = { ...next.generalSlots, [slot]: itemId };
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

export function canPlaceItemInContainer(
  container: Dnd5eEquipmentContainer,
  items: CharacterItem[],
  itemId: string,
): { ok: boolean; reason?: "capacity" | "already" | "self_nest" | "missing" } {
  if (container.itemIds.includes(itemId)) {
    return { ok: false, reason: "already" };
  }
  if (container.linkedItemId === itemId) {
    return { ok: false, reason: "self_nest" };
  }
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const newItem = itemMap.get(itemId);
  if (!newItem) return { ok: false, reason: "missing" };
  const cap = getContainerMaxCapacityLb(container);
  const current = containerWeightLb(container, items);
  const added = itemWeightLb(newItem);
  if (current + added > cap) {
    return { ok: false, reason: "capacity" };
  }
  return { ok: true };
}

export function placeItemInContainer(
  equipment: Dnd5eEquipmentState,
  containerId: string,
  itemId: string | null,
  items?: CharacterItem[],
  options?: { prepend?: boolean; force?: boolean },
): Dnd5eEquipmentState {
  let next = normalizeEquipmentState(equipment);
  if (itemId) {
    if (wouldSelfContain(next, containerId, itemId)) {
      return next;
    }
    if (items && !options?.force) {
      const container = next.containers.find((c) => c.id === containerId);
      if (container) {
        const check = canPlaceItemInContainer(container, items, itemId);
        if (!check.ok) return next;
      }
    } else if (items && options?.force) {
      const container = next.containers.find((c) => c.id === containerId);
      if (container?.linkedItemId === itemId) return next;
    }
  }
  if (itemId) next = removeItemFromEquipment(next, itemId);
  next.containers = next.containers.map((c) => {
    if (c.id !== containerId) return c;
    if (!itemId) return c;
    const filtered = c.itemIds.filter((id) => id !== itemId);
    const itemIds = options?.prepend ? [itemId, ...filtered] : [...filtered, itemId];
    return { ...c, itemIds };
  });
  return next;
}

/**
 * Verwaiste Items (weder Behälter noch Slot/Gürtel) in den Ziel-Rucksack legen.
 * Überspringt Items, die als Behälter selbst gelinkt sind, und stoppt bei voller Kapazität.
 */
export function stowUnassignedIntoContainer(
  equipment: Dnd5eEquipmentState,
  items: CharacterItem[],
  preferContainerId?: string | null,
): Dnd5eEquipmentState {
  const unassigned = getUnassignedItems(items, equipment);
  if (unassigned.length === 0) return equipment;

  const orderedIds = orderedContainerIds(equipment, preferContainerId);
  if (orderedIds.length === 0) return equipment;

  let next = normalizeEquipmentState(equipment);
  for (const item of unassigned) {
    let placed = false;
    for (const targetId of orderedIds) {
      const container = next.containers.find((c) => c.id === targetId);
      if (!container) continue;
      if (container.linkedItemId === item.id) continue;
      if (wouldSelfContain(next, targetId, item.id)) continue;
      const check = canPlaceItemInContainer(container, items, item.id);
      if (!check.ok) {
        if (check.reason === "capacity") continue;
        continue;
      }
      next = placeItemInContainer(next, targetId, item.id, items, { prepend: true });
      placed = true;
      break;
    }
    if (!placed) {
      // Letzter Versuch: in bevorzugten/ersten Behälter erzwingen (sichtbar > still verschwunden)
      for (const targetId of orderedIds) {
        if (wouldSelfContain(next, targetId, item.id)) continue;
        next = placeItemInContainer(next, targetId, item.id, items, {
          prepend: true,
          force: true,
        });
        if (next.containers.some((c) => c.id === targetId && c.itemIds.includes(item.id))) {
          break;
        }
      }
    }
  }
  return next;
}

function orderedContainerIds(
  equipment: Dnd5eEquipmentState,
  preferContainerId?: string | null,
): string[] {
  const ids = equipment.containers.map((c) => c.id);
  if (!preferContainerId || !ids.includes(preferContainerId)) return ids;
  return [preferContainerId, ...ids.filter((id) => id !== preferContainerId)];
}

/** Item in offenen/ersten Behälter legen — Kapazität darf überschritten werden, Self-Nest nie. */
export function placeItemIntoBestContainer(
  equipment: Dnd5eEquipmentState,
  items: CharacterItem[],
  itemId: string,
  preferContainerId?: string | null,
): Dnd5eEquipmentState {
  const orderedIds = orderedContainerIds(equipment, preferContainerId);
  if (orderedIds.length === 0) return equipment;

  let next = normalizeEquipmentState(equipment);
  for (const targetId of orderedIds) {
    if (wouldSelfContain(next, targetId, itemId)) continue;
    const container = next.containers.find((c) => c.id === targetId);
    if (!container) continue;
    const check = canPlaceItemInContainer(container, items, itemId);
    if (check.ok) {
      return placeItemInContainer(next, targetId, itemId, items, { prepend: true });
    }
  }
  for (const targetId of orderedIds) {
    if (wouldSelfContain(next, targetId, itemId)) continue;
    next = placeItemInContainer(next, targetId, itemId, items, { prepend: true, force: true });
    if (next.containers.some((c) => c.id === targetId && c.itemIds.includes(itemId))) {
      return next;
    }
  }
  return next;
}

/** Slot leeren und Gegenstand in den offenen/ersten Behälter zurücklegen. */
export function unequipToContainer(
  equipment: Dnd5eEquipmentState,
  items: CharacterItem[],
  opts: {
    slot?: Dnd5eEquipmentSlot;
    generalSlot?: Dnd5eGeneralEquipmentSlot;
    preferContainerId?: string | null;
  },
): Dnd5eEquipmentState {
  let itemId: string | null = null;
  if (opts.slot) itemId = equipment.slots?.[opts.slot] ?? null;
  if (opts.generalSlot) itemId = equipment.generalSlots?.[opts.generalSlot] ?? null;
  if (!itemId) return equipment;

  let next = normalizeEquipmentState(equipment);
  if (opts.slot) {
    next = placeItemInSlot(next, opts.slot, null, items);
  } else if (opts.generalSlot) {
    next = placeItemInGeneralSlot(next, opts.generalSlot, null);
  }

  return placeItemIntoBestContainer(next, items, itemId, opts.preferContainerId);
}

/** Gürtelplatz leeren und Gegenstand zurück in Gepäck legen. */
export function unequipBeltToContainer(
  equipment: Dnd5eEquipmentState,
  items: CharacterItem[],
  beltIndex: number,
  preferContainerId?: string | null,
): Dnd5eEquipmentState {
  const itemId = equipment.belt[beltIndex] ?? null;
  if (!itemId) return equipment;
  let next = placeItemOnBelt(equipment, beltIndex, null);
  return placeItemIntoBestContainer(next, items, itemId, preferContainerId);
}

/** Schwerster Gegenstand in einem Behälter (lb pro Einheit) */
export function findHeaviestItemInContainer(
  container: Dnd5eEquipmentContainer,
  items: CharacterItem[],
): { item: CharacterItem; weightLb: number } | null {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  let heaviest: { item: CharacterItem; weightLb: number } | null = null;
  const ids = [...container.itemIds];
  if (container.linkedItemId) ids.push(container.linkedItemId);
  for (const id of ids) {
    const item = itemMap.get(id);
    if (!item) continue;
    const w = itemWeightLb(item);
    if (!heaviest || w > heaviest.weightLb) {
      heaviest = { item, weightLb: w };
    }
  }
  return heaviest;
}

/** Behälter löschen und Inhalt auf andere Behälter verteilen */
export function deleteContainerAndRedistribute(
  equipment: Dnd5eEquipmentState,
  containerId: string,
  items: CharacterItem[],
): Dnd5eEquipmentState {
  const target = equipment.containers.find((c) => c.id === containerId);
  if (!target) return equipment;

  const idsToMove = [...target.itemIds];
  let next = normalizeEquipmentState(equipment);
  next.containers = next.containers.filter((c) => c.id !== containerId);

  const remaining = next.containers;
  for (const itemId of idsToMove) {
    let placed = false;
    for (const c of remaining) {
      const check = canPlaceItemInContainer(c, items, itemId);
      if (check.ok) {
        next = placeItemInContainer(next, c.id, itemId, items);
        placed = true;
        break;
      }
    }
    if (!placed) {
      next = removeItemFromEquipment(next, itemId);
    }
  }

  if (target.linkedItemId) {
    let placed = false;
    for (const c of remaining) {
      const check = canPlaceItemInContainer(c, items, target.linkedItemId);
      if (check.ok) {
        next = placeItemInContainer(next, c.id, target.linkedItemId, items);
        placed = true;
        break;
      }
    }
    if (!placed) {
      next = removeItemFromEquipment(next, target.linkedItemId);
    }
  }

  return next;
}

/** Items in einem Container, ohne ausgerüstete (Slots/Gürtel) */
export function getContainerInventoryItems(
  container: Dnd5eEquipmentContainer,
  items: CharacterItem[],
  equipment: Dnd5eEquipmentState,
): CharacterItem[] {
  const equippedIds = new Set<string>();
  for (const id of Object.values(equipment.slots)) {
    if (id) equippedIds.add(id);
  }
  for (const id of Object.values(equipment.generalSlots ?? {})) {
    if (id) equippedIds.add(id);
  }
  for (const id of equipment.belt) {
    if (id) equippedIds.add(id);
  }
  const itemMap = new Map(items.map((i) => [i.id, i]));
  return container.itemIds
    .filter((id) => !equippedIds.has(id) && id !== container.linkedItemId)
    .map((id) => itemMap.get(id))
    .filter((i): i is CharacterItem => Boolean(i));
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

function isWeaponLikeItem(item: CharacterItem, stats: ReturnType<typeof resolveCharacterItemStats>): boolean {
  if (stats.kind === "weapon" || item.category === "Weapon") return true;
  if (stats.damage && /^\d+[dDwW]\d+/i.test(stats.damage.trim())) return true;
  if (stats.isShield) return false;
  return false;
}

function parseDamageDiceFromAttackString(damage: string | null | undefined): string | null {
  if (!damage) return null;
  const trimmed = damage.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return null;
  const diceMatch = trimmed.match(/\d+[dDwW]\d+(?:\s*[+-]\s*\d+)?/i);
  if (diceMatch) return diceMatch[0].replace(/\s+/g, "");
  const first = trimmed.split(/\s+/)[0];
  if (first && /^\d+[dDwW]\d+/i.test(first)) return first;
  return null;
}

function weaponUsesDex(properties: string[], itemName: string): boolean {
  const joined = properties.join(" ").toLowerCase();
  if (
    joined.includes("geschick") ||
    joined.includes("finesse") ||
    joined.includes("fernkampf") ||
    joined.includes("ranged") ||
    joined.includes("reichweite") ||
    joined.includes("geschosse") ||
    joined.includes("munition") ||
    joined.includes("wurfwaffe")
  ) {
    return true;
  }
  const n = itemName.toLowerCase();
  if (
    /bogen|bow|armbrust|crossbow|schleuder|sling|dart|wurfpfeil|wurfnetz/.test(n)
  ) {
    return true;
  }
  return false;
}

function inferMagicalBonusFromName(name: string): number {
  const m = name.match(/\+(\d+)\b/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function resolveWeaponMagicalBonus(
  stats: ReturnType<typeof resolveCharacterItemStats>,
  item: CharacterItem,
): number {
  if (stats.magicalBonus != null && Number.isFinite(stats.magicalBonus)) {
    return Math.round(stats.magicalBonus);
  }
  return inferMagicalBonusFromName(item.name);
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
    joined.includes("martial") ||
    joined.includes("krieg") ||
    joined.includes("krieger") ||
    joined.includes("kriegswaffen");

  const weaponLike = isWeaponLikeItem(item, stats);
  if (simpleGroup && weaponLike && isSimpleWeaponName(item.name)) return true;
  if (martialGroup && weaponLike && !isSimpleWeaponName(item.name)) return true;

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
  const strMod =
    derived.abilities?.str?.modifier ??
    abilityModifier(sheet.abilities?.str?.score ?? 10);
  const dexMod =
    derived.abilities?.dex?.modifier ??
    abilityModifier(sheet.abilities?.dex?.score ?? 10);
  const previews: WeaponAttackPreview[] = [];

  for (const slot of ["mainHand", "offHand"] as const) {
    const itemId = equipment.slots?.[slot];
    if (!itemId) continue;
    const item = findCharacterItemByRef(items, itemId);
    if (!item) continue;
    const stats = resolveCharacterItemStats(item);
    if (!isWeaponLikeItem(item, stats)) continue;
    if (stats.isShield) continue;

    const sheetAttack =
      sheet.attacks.find(
        (a) =>
          a.name.toLowerCase() === item.name.toLowerCase() ||
          a.id === item.id ||
          a.id === parseFoundryItemTag(item.description),
      ) ?? null;

    const useDex = weaponUsesDex(stats.properties, item.name);
    const propsJoined = stats.properties.join(" ").toLowerCase();
    const finesse =
      propsJoined.includes("finesse") || propsJoined.includes("geschick");
    const abMod = finesse
      ? Math.max(strMod, dexMod)
      : useDex
        ? dexMod
        : strMod;
    const prof = hasWeaponProficiency(sheet, item, stats) ? pb : 0;
    const magicalBonus = resolveWeaponMagicalBonus(stats, item);

    let attackBonus = abMod + prof + magicalBonus;
    if (
      sheetAttack?.attackBonusOverride != null &&
      Number.isFinite(sheetAttack.attackBonusOverride)
    ) {
      attackBonus = Math.round(sheetAttack.attackBonusOverride);
    }

    const damageDice =
      stats.damage ??
      parseDamageDiceFromAttackString(sheetAttack?.damage) ??
      null;
    const damageType = stats.damageType ?? "";
    const dmgMod = abMod + magicalBonus;
    const dmgParts = [damageDice, damageType].filter(Boolean);
    const damage =
      dmgParts.length > 0
        ? `${dmgParts.join(" ")} ${formatSigned(dmgMod)}`
        : `— ${formatSigned(dmgMod)}`;

    const notes = [
      stats.properties.length ? stats.properties.join(", ") : null,
      sheetAttack?.notes ?? null,
      stats.rangeMeters ? `Reichweite ${stats.rangeMeters} m` : null,
      magicalBonus > 0 ? `Magisch +${magicalBonus}` : null,
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

export function computeEquippedArmorClass(
  dexMod: number,
  items: CharacterItem[],
  equipment: Dnd5eEquipmentState,
): { ac: number; breakdown: string } {
  const chestId = equipment.slots?.chest;

  let ac = 10 + dexMod;
  const parts: string[] = ["Basis 10 + GES"];
  let chestItemId: string | null = null;

  if (chestId) {
    const armor = findCharacterItemByRef(items, chestId);
    if (armor) {
      chestItemId = armor.id;
      const stats = resolveCharacterItemStats(armor);
      if (stats.acFormula && !parseAdditiveAcFormula(stats.acFormula)) {
        const parsed = parseAcFormula(stats.acFormula, dexMod);
        if (parsed) {
          ac = parsed.ac;
          parts.length = 0;
          parts.push(parsed.note);
        }
      }
    }
  }

  const equippedRefs = [
    ...Object.values(equipment.slots ?? {}),
    ...Object.values(equipment.generalSlots ?? {}),
  ].filter((id): id is string => Boolean(id));

  const countedIds = new Set<string>();

  for (const ref of equippedRefs) {
    const item = findCharacterItemByRef(items, ref);
    if (!item || countedIds.has(item.id)) continue;
    countedIds.add(item.id);

    const stats = resolveCharacterItemStats(item);
    const bonus = resolveItemAcBonus(stats, item.name);
    if (bonus <= 0) continue;

    const isChestBaseArmor =
      item.id === chestItemId &&
      Boolean(stats.acFormula && !parseAdditiveAcFormula(stats.acFormula));
    if (isChestBaseArmor && (stats.acBonus == null || stats.acBonus === 0)) {
      continue;
    }

    ac += bonus;
    parts.push(`${item.name} +${bonus}`);
  }

  return { ac, breakdown: parts.join(" · ") };
}

export function computeArmorClassPreview(
  sheet: Dnd5eSheetData,
  derived: Dnd5eDerivedSheet,
  items: CharacterItem[],
  equipment: Dnd5eEquipmentState,
): { ac: number; breakdown: string } {
  if (sheet.combat.acOverride != null) {
    return { ac: derived.ac, breakdown: "Manueller RK-Override" };
  }
  return computeEquippedArmorClass(
    derived.abilities.dex.modifier,
    items,
    equipment,
  );
}

/**
 * Schreibt combat.ac aus der aktuell angelegten Ausrüstung
 * (außer bei manuellem acOverride).
 */
export function withSyncedArmorClass(
  sheet: Dnd5eSheetData,
  items: CharacterItem[],
  equipment?: Dnd5eEquipmentState | null,
  level = 1,
): Dnd5eSheetData {
  const eq = normalizeEquipmentState(equipment ?? sheet.equipment);
  const nextBase = { ...sheet, equipment: eq };
  if (nextBase.combat.acOverride != null) {
    return nextBase;
  }
  // Lazy import vermeiden — Dex-Mod direkt aus Scores
  const dexScore = nextBase.abilities.dex?.score ?? 10;
  const dexMod = Math.floor((Math.max(1, dexScore) - 10) / 2);
  const { ac } = computeEquippedArmorClass(dexMod, items, eq);
  if (nextBase.combat.ac === ac) return nextBase;
  return {
    ...nextBase,
    combat: { ...nextBase.combat, ac },
  };
}

export function saveWeaponPreset(
  equipment: Dnd5eEquipmentState,
  presetId: string | null,
  name: string,
): Dnd5eEquipmentState {
  const next = normalizeEquipmentState(equipment);
  const preset: Dnd5eWeaponPreset = {
    id: presetId ?? crypto.randomUUID(),
    name: name.trim() || "Waffen",
    mainHand: next.slots.mainHand ?? null,
    offHand: next.slots.offHand ?? null,
  };

  const existing = next.weaponPresets ?? [];
  const idx = existing.findIndex((p) => p.id === preset.id);
  if (idx >= 0) {
    const updated = [...existing];
    updated[idx] = preset;
    next.weaponPresets = updated;
    return next;
  }

  if (existing.length >= MAX_WEAPON_PRESETS) {
    next.weaponPresets = [...existing.slice(1), preset];
  } else {
    next.weaponPresets = [...existing, preset];
  }
  return next;
}

export function applyWeaponPreset(
  equipment: Dnd5eEquipmentState,
  presetId: string,
  items: CharacterItem[],
): Dnd5eEquipmentState {
  let next = normalizeEquipmentState(equipment);
  const preset = next.weaponPresets?.find((p) => p.id === presetId);
  if (!preset) return next;

  if (preset.mainHand) next = removeItemFromEquipment(next, preset.mainHand);
  if (preset.offHand) next = removeItemFromEquipment(next, preset.offHand);

  if (preset.mainHand) {
    next = placeItemInSlot(next, "mainHand", preset.mainHand, items);
  } else {
    next.slots = { ...next.slots, mainHand: null };
  }

  if (preset.offHand && next.slots.mainHand) {
    const mainItem = items.find((i) => i.id === next.slots.mainHand);
    const mainStats = mainItem ? resolveCharacterItemStats(mainItem) : null;
    if (!mainStats || !isTwoHandedWeapon(mainStats.properties)) {
      next = placeItemInSlot(next, "offHand", preset.offHand, items);
    }
  } else if (!preset.offHand) {
    next.slots = { ...next.slots, offHand: null };
  }

  return next;
}

export function deleteWeaponPreset(
  equipment: Dnd5eEquipmentState,
  presetId: string,
): Dnd5eEquipmentState {
  const next = normalizeEquipmentState(equipment);
  next.weaponPresets = (next.weaponPresets ?? []).filter((p) => p.id !== presetId);
  return next;
}

export function saveEquipmentLoadout(
  equipment: Dnd5eEquipmentState,
  loadoutId: string | null,
  name: string,
): Dnd5eEquipmentState {
  const next = normalizeEquipmentState(equipment);
  const loadout: Dnd5eEquipmentLoadout = {
    id: loadoutId ?? crypto.randomUUID(),
    name: name.trim() || "Ausrüstung",
    belt: [...next.belt],
    slots: { ...next.slots },
    generalSlots: { ...(next.generalSlots ?? {}) },
    attunedItemIds: [...next.attunedItemIds],
  };

  const existing = next.loadouts ?? [];
  const idx = existing.findIndex((l) => l.id === loadout.id);
  if (idx >= 0) {
    const updated = [...existing];
    updated[idx] = loadout;
    next.loadouts = updated;
  } else {
    next.loadouts = [...existing, loadout];
  }
  return next;
}

export function applyEquipmentLoadout(
  equipment: Dnd5eEquipmentState,
  loadoutId: string,
  items: CharacterItem[],
): Dnd5eEquipmentState {
  const next = normalizeEquipmentState(equipment);
  const loadout = next.loadouts?.find((l) => l.id === loadoutId);
  if (!loadout) return next;

  const preservedPresets = next.weaponPresets;
  const preservedLoadouts = next.loadouts;
  const preservedContainers = next.containers;
  const preservedCategories = next.customCategories;

  let result = createEmptyEquipmentState();
  result.containers = preservedContainers;
  result.customCategories = preservedCategories;
  result.weaponPresets = preservedPresets;
  result.loadouts = preservedLoadouts;
  result.belt = [...loadout.belt];
  while (result.belt.length < MAX_BELT_SLOTS) result.belt.push(null);
  result.belt.length = MAX_BELT_SLOTS;
  result.slots = { ...loadout.slots };
  result.generalSlots = { ...(loadout.generalSlots ?? {}) };
  result.attunedItemIds = [...loadout.attunedItemIds];

  for (const slot of ["mainHand", "offHand"] as const) {
    const id = result.slots[slot];
    if (!id) continue;
    const item = items.find((i) => i.id === id);
    if (!item) continue;
    const stats = resolveCharacterItemStats(item);
    if (isTwoHandedWeapon(stats.properties) && slot === "mainHand") {
      result.slots.offHand = null;
    }
  }

  return normalizeEquipmentState(result);
}

export function deleteEquipmentLoadout(
  equipment: Dnd5eEquipmentState,
  loadoutId: string,
): Dnd5eEquipmentState {
  const next = normalizeEquipmentState(equipment);
  next.loadouts = (next.loadouts ?? []).filter((l) => l.id !== loadoutId);
  return next;
}
