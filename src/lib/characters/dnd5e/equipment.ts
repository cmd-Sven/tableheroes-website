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
import { resolveCharacterItemStats } from "./item-resolve";

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
  if (legacy?.back1 && !slots.shoulders) slots.shoulders = legacy.back1;
  if (legacy?.back2 && !slots.back) slots.back = legacy.back2;
  delete (slots as Record<string, unknown>).back1;
  delete (slots as Record<string, unknown>).back2;

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
  next.containers = next.containers.map((c) => ({
    ...c,
    itemIds: c.itemIds.filter((id) => id !== itemId),
    linkedItemId: c.linkedItemId === itemId ? null : c.linkedItemId,
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
): { ok: boolean; reason?: "capacity" | "already" } {
  if (container.itemIds.includes(itemId)) {
    return { ok: false, reason: "already" };
  }
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const newItem = itemMap.get(itemId);
  if (!newItem) return { ok: false };
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
  options?: { prepend?: boolean },
): Dnd5eEquipmentState {
  let next = normalizeEquipmentState(equipment);
  if (itemId && items) {
    const container = next.containers.find((c) => c.id === containerId);
    if (container) {
      const check = canPlaceItemInContainer(container, items, itemId);
      if (!check.ok) return next;
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
  if (stats.damage && /^\d+d\d+/i.test(stats.damage)) return true;
  if (stats.isShield) return false;
  return false;
}

function parseDamageDiceFromAttackString(damage: string | null | undefined): string | null {
  if (!damage) return null;
  const trimmed = damage.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return null;
  const diceMatch = trimmed.match(/\d+d\d+(?:\s*\+\s*\d+)?/i);
  if (diceMatch) return diceMatch[0].replace(/\s+/g, "");
  const first = trimmed.split(/\s+/)[0];
  if (first && /^\d+d\d+/i.test(first)) return first;
  return null;
}

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
  const strMod = derived.abilities.str.modifier;
  const dexMod = derived.abilities.dex.modifier;
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

    const useDex = weaponUsesDex(stats.properties);
    const abMod = useDex ? dexMod : strMod;
    const prof = hasWeaponProficiency(sheet, item, stats) ? pb : 0;
    const attackBonus = abMod + prof;

    const damageDice =
      stats.damage ??
      parseDamageDiceFromAttackString(sheetAttack?.damage) ??
      null;
    const damageType = stats.damageType ?? "";
    const dmgParts = [damageDice, damageType].filter(Boolean);
    const damage =
      dmgParts.length > 0
        ? `${dmgParts.join(" ")} ${formatSigned(abMod)}`
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
