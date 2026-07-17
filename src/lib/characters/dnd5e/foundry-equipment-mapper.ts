import { randomUUID } from "crypto";
import type { Dnd5eAttackEntry } from "./types";
import type {
  Dnd5eEquipmentContainer,
  Dnd5eEquipmentLoadout,
  Dnd5eEquipmentSlot,
  Dnd5eEquipmentState,
} from "./equipment-types";
import { createEmptyEquipmentState, MAX_ATTUNEMENT, MAX_BELT_SLOTS } from "./equipment-types";
import type { Dnd5eItemMeta } from "./item-meta";
import {
  buildFoundryItemTag,
  buildItemDescription,
  stripMachineTags,
} from "./item-meta";
import { lookupWeaponStatsByName } from "./weapon-catalog-lookup";
import type { InventoryCategory } from "@/src/types/inventory";

type FoundryItemRow = {
  _id?: string;
  id?: string;
  name?: string;
  type?: string;
  system?: Record<string, unknown>;
};

export type FoundryImportItemRow = {
  foundryItemId: string;
  name: string;
  description: string | null;
  category: InventoryCategory;
  iconType: string | null;
  meta: Dnd5eItemMeta;
};

export type FoundryEquipmentImportResult = {
  equipment: Dnd5eEquipmentState;
  attacks: Dnd5eAttackEntry[];
  importItems: FoundryImportItemRow[];
};

function readFoundryId(item: FoundryItemRow): string {
  return String(item._id ?? item.id ?? randomUUID());
}

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function stripHtml(html: unknown): string | null {
  if (typeof html !== "string") return null;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text || null;
}

function mapDamageTypeEnToDe(raw: string): "Wucht" | "Hieb" | "Stich" | null {
  const t = raw.toLowerCase();
  if (t.includes("bludgeon") || t.includes("wucht")) return "Wucht";
  if (t.includes("slash") || t.includes("hieb")) return "Hieb";
  if (t.includes("pierc") || t.includes("stich")) return "Stich";
  return null;
}

function readDamageTypes(raw: unknown): string {
  if (Array.isArray(raw)) return raw.map(String).join(" ");
  if (raw && typeof raw === "object") {
    // Foundry Set serializes as array or { values }
    const values = (raw as { values?: unknown }).values;
    if (Array.isArray(values)) return values.map(String).join(" ");
    return Object.keys(raw as Record<string, unknown>).join(" ");
  }
  if (typeof raw === "string") return raw;
  return "";
}

function readDamageField(field: unknown): {
  damage: string | null;
  damageType: "Wucht" | "Hieb" | "Stich" | null;
} {
  if (!field || typeof field !== "object") {
    return { damage: null, damageType: null };
  }
  const data = field as {
    number?: unknown;
    denomination?: unknown;
    bonus?: unknown;
    types?: unknown;
    custom?: { enabled?: unknown; formula?: unknown };
  };

  const typeRaw = readDamageTypes(data.types);
  const damageType = mapDamageTypeEnToDe(typeRaw);

  if (data.custom?.enabled && typeof data.custom.formula === "string") {
    const formula = data.custom.formula.trim();
    if (formula) return { damage: formula, damageType };
  }

  const number = readNumber(data.number, 0);
  const denomination = readNumber(data.denomination, 0);
  if (number > 0 && denomination > 0) {
    let dice = `${number}d${denomination}`;
    const bonus = typeof data.bonus === "string" ? data.bonus.trim() : "";
    if (bonus && bonus !== "@mod" && !/^@/.test(bonus)) {
      const cleaned = bonus.replace(/^\+/, "");
      if (cleaned) dice = `${dice}+${cleaned}`;
    }
    return { damage: dice, damageType };
  }

  return { damage: null, damageType };
}

function readFoundryDamageFromActivities(
  system: Record<string, unknown>,
): { damage: string | null; damageType: "Wucht" | "Hieb" | "Stich" | null } {
  const activities = system.activities;
  if (!activities || typeof activities !== "object") {
    return { damage: null, damageType: null };
  }
  const list = Array.isArray(activities)
    ? activities
    : Object.values(activities as Record<string, unknown>);

  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const activity = raw as {
      type?: unknown;
      damage?: { parts?: unknown[]; includeBase?: unknown };
    };
    const type = String(activity.type ?? "").toLowerCase();
    if (type && !["attack", "damage", "save", "heal"].includes(type)) continue;
    const parts = activity.damage?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      const parsed = readDamageField(part);
      if (parsed.damage) return parsed;
      if (Array.isArray(part)) {
        const dice = String(part[0] ?? "").trim();
        const typeRaw = String(part[1] ?? "");
        if (dice) {
          return { damage: dice, damageType: mapDamageTypeEnToDe(typeRaw) };
        }
      }
    }
  }
  return { damage: null, damageType: null };
}

function readFoundryDamage(system: Record<string, unknown>): {
  damage: string | null;
  damageType: "Wucht" | "Hieb" | "Stich" | null;
} {
  const damage = system.damage as
    | { parts?: unknown[]; base?: unknown; versatile?: unknown }
    | undefined;

  // Legacy dnd5e ≤3.x
  const parts = damage?.parts;
  if (Array.isArray(parts) && parts.length > 0) {
    const first = parts[0];
    if (Array.isArray(first)) {
      const dice = String(first[0] ?? "").trim();
      const typeRaw = String(first[1] ?? "");
      if (dice) {
        return { damage: dice, damageType: mapDamageTypeEnToDe(typeRaw) };
      }
    }
    const fromField = readDamageField(first);
    if (fromField.damage) return fromField;
  }

  // dnd5e 4.0+: system.damage.base
  const fromBase = readDamageField(damage?.base);
  if (fromBase.damage) return fromBase;

  // Activities (attack/damage)
  return readFoundryDamageFromActivities(system);
}

function readFoundryMagicalBonus(system: Record<string, unknown>): number | null {
  const bonus = readNumber(system.magicalBonus, 0);
  return bonus !== 0 ? Math.round(bonus) : null;
}

function readFoundryProperties(system: Record<string, unknown>): string[] {
  const props = system.properties;
  if (Array.isArray(props)) return props.map(String);
  if (props && typeof props === "object") {
    const labels: Record<string, string> = {
      fin: "Finesse",
      lgt: "Leicht",
      hvy: "Schwer",
      two: "Zweihändig",
      ver: "Vielseitig",
      thr: "Wurfwaffe",
      rng: "Reichweite",
      rel: "Laden",
      amm: "Geschosse",
      mgc: "Magisch",
    };
    return Object.entries(props as Record<string, unknown>)
      .filter(([, v]) => v === true || v === 1)
      .map(([k]) => labels[k] ?? k);
  }
  return [];
}

function readFoundryWeight(system: Record<string, unknown>): number {
  const weight = system.weight as { value?: unknown } | number | undefined;
  if (typeof weight === "number") return Math.max(0, weight);
  if (weight && typeof weight === "object") return Math.max(0, readNumber(weight.value, 0));
  return 0;
}

function isEquipped(system: Record<string, unknown>): boolean {
  return Boolean(system.equipped);
}

function isAttuned(system: Record<string, unknown>): boolean {
  const att = system.attunement;
  if (typeof att === "number") return att >= 2;
  if (typeof att === "boolean") return att;
  return Boolean(system.attuned);
}

function requiresAttunement(system: Record<string, unknown>): boolean {
  const att = system.attunement;
  if (typeof att === "number") return att >= 1;
  return Boolean(system.attunementRequired);
}

function foundryTypeToKind(type: string, system: Record<string, unknown>): Dnd5eItemMeta["kind"] {
  const armor = system.armor as { type?: string; value?: number } | undefined;
  const equipType = String(
    (system.type as { value?: string } | undefined)?.value ?? system.type ?? "",
  ).toLowerCase();

  if (type === "weapon") return "weapon";
  if (type === "consumable") return "consumable";
  if (type === "tool") return "tool";
  if (type === "container") return "equipment";

  if (type === "equipment" || type === "loot") {
    if (equipType.includes("shield") || equipType === "shield") return "armor";
    if (armor?.type || armor?.value) return "armor";
    if (equipType.includes("potion") || equipType.includes("trank")) return "consumable";
    if (equipType.includes("wand") || equipType.includes("rod") || equipType.includes("ring")) {
      return "magic";
    }
    return "equipment";
  }

  return "unknown";
}

function foundryTypeToCategory(type: string, meta: Dnd5eItemMeta): InventoryCategory {
  if (type === "weapon" || meta.kind === "weapon") return "Weapon";
  if (type === "consumable" || meta.kind === "consumable") return "Consumable";
  return "Equipment";
}

function mapFoundryItemToMeta(item: FoundryItemRow): Dnd5eItemMeta {
  const system = item.system ?? {};
  const type = String(item.type ?? "loot").toLowerCase();
  const kind = foundryTypeToKind(type, system);
  const { damage, damageType } = readFoundryDamage(system);
  const magicalBonus = readFoundryMagicalBonus(system);
  const properties = readFoundryProperties(system);
  const armor = system.armor as { value?: number; type?: string; dex?: number | null } | undefined;
  const equipType = String(
    (system.type as { value?: string } | undefined)?.value ?? "",
  ).toLowerCase();
  const armorType = String(armor?.type ?? "").toLowerCase();
  const isBodyArmor = ["light", "medium", "heavy"].includes(armorType);

  let acFormula: string | null = null;
  let acBonus: number | null = null;
  const isShield = equipType.includes("shield") || armorType === "shield";

  if (isShield) {
    const shieldBonus = armor?.value != null ? readNumber(armor.value, 2) : 2;
    acBonus = Math.max(1, shieldBonus);
    acFormula = `+${acBonus}`;
  } else if (isBodyArmor && armor?.value != null) {
    const base = readNumber(armor.value, 0);
    const dex = armor.dex;
    if (dex === 0) acFormula = String(base);
    else if (dex != null && dex > 0) acFormula = `${base} + GES (max ${dex})`;
    else acFormula = `${base} + GES`;
  } else if (armor?.value != null && readNumber(armor.value, 0) > 0) {
    // Ringe/Umhänge/Schmuck: armor.value ist additiver Bonus, keine Basis-RK
    acBonus = Math.round(readNumber(armor.value, 0));
    acFormula = `+${acBonus}`;
  }

  const effectBonus = readAcBonusFromFoundryEffects(item);
  if (effectBonus !== 0) {
    acBonus = (acBonus ?? 0) + effectBonus;
    if (!acFormula || acFormula.startsWith("+")) {
      acFormula = `+${acBonus}`;
    }
  }

  const nameBonus = inferAcBonusFromItemName(String(item.name ?? ""));
  if ((acBonus == null || acBonus === 0) && nameBonus > 0) {
    acBonus = nameBonus;
    acFormula = `+${nameBonus}`;
  }

  const range = system.range as { value?: number; long?: number } | undefined;
  const rangeMeters =
    range?.value != null
      ? range.long != null
        ? `${range.value}/${range.long}`
        : String(range.value)
      : null;

  const descHtml =
    (system.description as { value?: string } | undefined)?.value ??
    (system.description as string | undefined);

  return {
    version: 1,
    kind,
    weightLb: readFoundryWeight(system),
    damage,
    damageType,
    properties,
    acFormula,
    acBonus,
    magicalBonus,
    isShield,
    attunement: requiresAttunement(system),
    isMagical:
      kind === "magic" ||
      (magicalBonus != null && magicalBonus > 0) ||
      properties.some((p) => p.toLowerCase().includes("magisch") || p === "mgc") ||
      (acBonus != null && acBonus > 0 && !isBodyArmor),
    effect: stripHtml(descHtml),
    strRequirement: readNumber((system.strength as number | undefined) ?? system.str, 0) || null,
    rangeMeters,
    rarity: String((system.rarity as string | undefined) ?? "Gewöhnlich"),
  };
}

function inferAcBonusFromItemName(name: string): number {
  const n = name.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (/ring of protection|ring der beschutzung|ring des schutzes|schutzring/.test(n)) {
    return 1;
  }
  if (/cloak of protection|umhang der beschutzung|umhang des schutzes|schutzumhang/.test(n)) {
    return 1;
  }
  return 0;
}

/** Foundry Active Effects → system.attributes.ac.bonus */
function readAcBonusFromFoundryEffects(item: FoundryItemRow): number {
  const effects = (item as { effects?: unknown }).effects;
  if (!Array.isArray(effects)) return 0;
  let bonus = 0;
  for (const raw of effects) {
    const effect = raw as {
      disabled?: boolean;
      transfer?: boolean;
      changes?: Array<{ key?: string; mode?: number; value?: unknown }>;
    };
    if (effect.disabled) continue;
    for (const change of effect.changes ?? []) {
      const key = String(change.key ?? "").toLowerCase();
      if (!key.includes("attributes.ac.bonus") && key !== "system.attributes.ac.bonus") {
        continue;
      }
      const value = Number(change.value);
      if (!Number.isFinite(value)) continue;
      // mode 2 = ADD in Foundry; ohne Mode trotzdem als Bonus werten
      bonus += value;
    }
  }
  return Math.round(bonus);
}

function inferSlotForFoundryItem(
  item: FoundryItemRow,
  meta: Dnd5eItemMeta,
): Dnd5eEquipmentSlot | null {
  if (!isEquipped(item.system ?? {})) return null;

  const type = String(item.type ?? "").toLowerCase();
  const equipType = String(
    (item.system?.type as { value?: string } | undefined)?.value ?? "",
  ).toLowerCase();
  const name = String(item.name ?? "").toLowerCase();

  if (type === "weapon") return "mainHand";
  if (meta.isShield || equipType.includes("shield") || name.includes("schild")) return "offHand";
  // Rucksack/Container → kein Körper-Slot mehr (nur containers[])
  if (
    type === "container" ||
    equipType.includes("backpack") ||
    name.includes("rucksack") ||
    name.includes("backpack")
  ) {
    return null;
  }
  if (type === "equipment" || type === "loot") {
    if (equipType.includes("ring") || name.includes("ring")) return "ring1";
    if (equipType.includes("cloak") || name.includes("umhang")) return "shoulders";
    if (equipType.includes("boot") || name.includes("stiefel")) return "feet";
    if (equipType.includes("glove") || name.includes("handschuh")) return "hands";
    if (equipType.includes("helm") || name.includes("helm")) return "head";
    if (equipType.includes("amulet") || name.includes("amulett")) return "neck";
  }
  if (meta.kind === "armor" && meta.acFormula) return "chest";
  if (equipType.includes("belt") || equipType.includes("gürtel") || name.includes("gürtel") || name.includes("belt")) {
    return "waist";
  }
  return null;
}

function isContainerItem(item: FoundryItemRow): boolean {
  const type = String(item.type ?? "").toLowerCase();
  const name = String(item.name ?? "").toLowerCase();
  return (
    type === "container" ||
    name.includes("rucksack") ||
    name.includes("backpack") ||
    name.includes("tasche der halt") ||
    name.includes("bag of holding")
  );
}

function containerKindFromItem(item: FoundryItemRow): Dnd5eEquipmentContainer["kind"] {
  const name = String(item.name ?? "").toLowerCase();
  if (name.includes("tasche der halt") || name.includes("bag of holding")) {
    return "bag_of_holding";
  }
  return "backpack";
}

export function mapFoundryItemsToEquipment(
  actorItems: unknown[] | undefined,
): FoundryEquipmentImportResult {
  const items = (actorItems ?? []).filter(
    (x) => x && typeof x === "object",
  ) as FoundryItemRow[];

  const equipment = createEmptyEquipmentState();
  const importItems: FoundryImportItemRow[] = [];
  const attacks: Dnd5eAttackEntry[] = [];

  const equippedWeapons: FoundryItemRow[] = [];
  const containerItems: FoundryItemRow[] = [];
  const stowedItems: FoundryItemRow[] = [];

  for (const item of items) {
    const type = String(item.type ?? "").toLowerCase();
    if (["feat", "spell", "class", "race", "background", "subclass"].includes(type)) continue;

    const foundryItemId = readFoundryId(item);
    const meta = mapFoundryItemToMeta(item);
    const name = String(item.name ?? "").trim() || "Gegenstand";
    const userText = meta.effect;
    const description = buildItemDescription({
      tags: [buildFoundryItemTag(foundryItemId), "[Foundry] Import"],
      meta,
      userText: userText ? stripMachineTags(userText) : null,
    });

    importItems.push({
      foundryItemId,
      name,
      description,
      category: foundryTypeToCategory(type, meta),
      iconType: type || null,
      meta,
    });

    if (type === "weapon") {
      let damageDice = meta.damage;
      let damageType = meta.damageType;
      if (!damageDice) {
        const fallback = lookupWeaponStatsByName(name);
        if (fallback?.damage) {
          damageDice = fallback.damage;
          damageType =
            (fallback.damageType as Dnd5eItemMeta["damageType"]) ?? damageType;
        }
      }
      const dmg = damageDice
        ? `${damageDice}${damageType ? ` ${damageType}` : ""}`
        : "—";
      attacks.push({
        id: foundryItemId,
        name,
        damage: dmg,
        notes: meta.properties?.length ? meta.properties.join(", ") : null,
      });
    }

    if (isContainerItem(item)) {
      containerItems.push(item);
      continue;
    }

    if (isEquipped(item.system ?? {})) {
      if (type === "weapon") equippedWeapons.push(item);
    } else {
      stowedItems.push(item);
    }
  }

  for (const containerItem of containerItems) {
    const fid = readFoundryId(containerItem);
    equipment.containers.push({
      id: randomUUID(),
      kind: containerKindFromItem(containerItem),
      label: String(containerItem.name ?? "Gepäck"),
      linkedItemId: fid,
      itemIds: [],
    });
  }

  if (equipment.containers.length === 0 && stowedItems.length > 0) {
    equipment.containers.push({
      id: randomUUID(),
      kind: "backpack",
      label: "Rucksack (Foundry)",
      linkedItemId: null,
      itemIds: [],
    });
  }

  const defaultContainerId = equipment.containers[0]?.id ?? null;

  let offHandUsed = false;
  for (const item of items) {
    const fid = readFoundryId(item);
    const meta = mapFoundryItemToMeta(item);
    const slot = inferSlotForFoundryItem(item, meta);
    if (!slot) continue;

    if (slot === "mainHand") {
      if (!equipment.slots.mainHand) equipment.slots.mainHand = fid;
      else if (!equipment.slots.offHand && !offHandUsed) {
        equipment.slots.offHand = fid;
        offHandUsed = true;
      }
      continue;
    }

    if (slot === "offHand" && !equipment.slots.offHand) {
      equipment.slots.offHand = fid;
      continue;
    }

    if (!equipment.slots[slot]) {
      equipment.slots[slot] = fid;
    }
  }

  for (const item of equippedWeapons) {
    const fid = readFoundryId(item);
    if (equipment.slots.mainHand === fid || equipment.slots.offHand === fid) continue;
    if (!equipment.slots.mainHand) equipment.slots.mainHand = fid;
    else if (!equipment.slots.offHand) equipment.slots.offHand = fid;
  }

  let beltIdx = 0;
  for (const item of items) {
    if (beltIdx >= MAX_BELT_SLOTS) break;
    const type = String(item.type ?? "").toLowerCase();
    if (type !== "consumable") continue;
    if (!isEquipped(item.system ?? {})) continue;
    equipment.belt[beltIdx++] = readFoundryId(item);
  }

  equipment.attunedItemIds = items
    .filter((item) => isAttuned(item.system ?? {}))
    .map((item) => readFoundryId(item))
    .slice(0, MAX_ATTUNEMENT);

  if (defaultContainerId) {
    const container = equipment.containers.find((c) => c.id === defaultContainerId);
    if (container) {
      for (const item of stowedItems) {
        const fid = readFoundryId(item);
        const placed =
          Object.values(equipment.slots).includes(fid) ||
          equipment.belt.includes(fid) ||
          equipment.attunedItemIds.includes(fid) ||
          container.linkedItemId === fid ||
          equipment.containers.some((c) => c.linkedItemId === fid);
        if (!placed) container.itemIds.push(fid);
      }
    }
  }

  return { equipment, attacks, importItems };
}

export function remapEquipmentToCharacterItemIds(
  equipment: Dnd5eEquipmentState,
  foundryToCharacterItemId: Map<string, string>,
): Dnd5eEquipmentState {
  const mapId = (id: string | null | undefined): string | null => {
    if (!id) return null;
    return foundryToCharacterItemId.get(id) ?? id;
  };

  return {
    containers: equipment.containers.map((c) => ({
      ...c,
      linkedItemId: mapId(c.linkedItemId),
      itemIds: c.itemIds.map((id) => mapId(id)!).filter(Boolean),
    })),
    belt: equipment.belt.map((id) => mapId(id)),
    slots: Object.fromEntries(
      Object.entries(equipment.slots).map(([k, v]) => [k, mapId(v)]),
    ) as Dnd5eEquipmentState["slots"],
    generalSlots: Object.fromEntries(
      Object.entries(equipment.generalSlots ?? {}).map(([k, v]) => [k, mapId(v)]),
    ) as Dnd5eEquipmentState["generalSlots"],
    attunedItemIds: equipment.attunedItemIds
      .map((id) => mapId(id)!)
      .filter(Boolean),
    weaponPresets: (equipment.weaponPresets ?? []).map((p) => ({
      ...p,
      mainHand: mapId(p.mainHand),
      offHand: mapId(p.offHand),
    })),
    loadouts: (equipment.loadouts ?? []).map((l) => ({
      ...l,
      belt: l.belt.map((id) => mapId(id)),
      slots: Object.fromEntries(
        Object.entries(l.slots).map(([k, v]) => [k, mapId(v)]),
      ) as Dnd5eEquipmentLoadout["slots"],
      generalSlots: Object.fromEntries(
        Object.entries(l.generalSlots ?? {}).map(([k, v]) => [k, mapId(v)]),
      ) as Dnd5eEquipmentLoadout["generalSlots"],
      attunedItemIds: l.attunedItemIds.map((id) => mapId(id)!).filter(Boolean),
    })),
  };
}

export async function syncFoundryItemsToCharacterInventory(
  supabase: ReturnType<typeof import("@/src/lib/supabase/server").createAdminClient>,
  characterId: string,
  importItems: FoundryImportItemRow[],
): Promise<Map<string, string>> {
  const foundryToTh = new Map<string, string>();

  const { data: existingRows } = await (supabase as any)
    .from("character_items")
    .select("id, description")
    .eq("character_id", characterId)
    .eq("is_deleted", false);

  const existingByFoundryId = new Map<string, string>();
  for (const row of (existingRows as { id: string; description?: string | null }[]) ?? []) {
    const m = String(row.description ?? "").match(/\[foundry:([^\]]+)\]/i);
    if (m?.[1]) existingByFoundryId.set(m[1], String(row.id));
  }

  for (const item of importItems) {
    const existingId = existingByFoundryId.get(item.foundryItemId);
    if (existingId) {
      await (supabase as any)
        .from("character_items")
        .update({
          name: item.name,
          description: item.description,
          category: item.category,
          icon_type: item.iconType,
        })
        .eq("id", existingId);
      foundryToTh.set(item.foundryItemId, existingId);
      continue;
    }

    const { data: inserted, error } = await (supabase as any)
      .from("character_items")
      .insert({
        character_id: characterId,
        name: item.name,
        description: item.description,
        category: item.category,
        icon_type: item.iconType,
      })
      .select("id")
      .single();

    if (!error && inserted?.id) {
      foundryToTh.set(item.foundryItemId, String(inserted.id));
    }
  }

  return foundryToTh;
}
