import type { InventoryDisplayCategory } from "./item-meta";
import {
  findLootReferenceByName,
  findLootReferenceByRefId,
  type LootReferenceId,
  type LootReferenceItem,
} from "./loot-reference-catalog";

/** Mechanische Felder für Loot-Items (Waffe, Rüstung, Verbrauchsgut …). */
export type LootMechanicsFields = {
  referenceId?: LootReferenceId | string | null;
  inventoryCategory?: InventoryDisplayCategory | string;
  kind?: string;
  weightLb?: number;
  price?: number;
  isMagical?: boolean;
  attunement?: boolean;
  damage?: string | null;
  damageType?: string | null;
  properties?: string[];
  rangeMeters?: string | null;
  acFormula?: string | null;
  strRequirement?: number | null;
  isShield?: boolean;
  effect?: string | null;
};

function applyReference(
  item: LootMechanicsFields,
  ref: LootReferenceItem,
  preserveMagicalName: boolean,
): LootMechanicsFields {
  const isMagical = preserveMagicalName
    ? Boolean(item.isMagical ?? ref.isMagical)
    : ref.isMagical;

  return {
    ...item,
    referenceId: ref.refId,
    inventoryCategory: ref.inventoryCategory,
    kind: ref.kind,
    weightLb: ref.weightLb,
    price: item.price != null && item.price > 0 ? item.price : ref.priceGp,
    isMagical,
    attunement: isMagical ? Boolean(item.attunement ?? ref.attunement) : false,
    damage: ref.damage ?? item.damage ?? null,
    damageType: ref.damageType ?? item.damageType ?? null,
    properties: ref.properties ?? item.properties,
    rangeMeters: ref.rangeMeters ?? item.rangeMeters ?? null,
    acFormula: ref.acFormula ?? item.acFormula ?? null,
    strRequirement: ref.strRequirement ?? item.strRequirement ?? null,
    isShield: ref.isShield ?? item.isShield ?? false,
    effect: ref.effect ?? item.effect ?? null,
  };
}

/**
 * Reichert ein Loot-Item mit harten Fakten aus dem Referenz-Katalog an.
 * Priorität: referenceId → Name-Match (auch bei „Langschwert +1“).
 */
export function enrichLootMechanics<T extends LootMechanicsFields & { name: string }>(
  item: T,
): T & LootMechanicsFields {
  const ref =
    findLootReferenceByRefId(item.referenceId) ??
    findLootReferenceByName(item.name);

  if (!ref) return item;

  const hasMagicalSuffix = /\+\s*\d+/i.test(item.name);
  const enriched = applyReference(item, ref, hasMagicalSuffix || Boolean(item.isMagical));

  if (hasMagicalSuffix && !enriched.isMagical) {
    enriched.isMagical = true;
  }

  return { ...item, ...enriched };
}

export function lootMechanicsToMetaFields(
  fields: LootMechanicsFields,
): {
  damage?: string | null;
  damageType?: "Wucht" | "Hieb" | "Stich" | null;
  properties?: string[];
  rangeMeters?: string | null;
  acFormula?: string | null;
  strRequirement?: number | null;
  isShield?: boolean;
  effect?: string | null;
  attunement?: boolean;
} {
  const dmgType = fields.damageType;
  const validDamageType =
    dmgType === "Wucht" || dmgType === "Hieb" || dmgType === "Stich" ? dmgType : null;

  return {
    damage: fields.damage ?? null,
    damageType: validDamageType,
    properties: fields.properties ?? [],
    rangeMeters: fields.rangeMeters ?? null,
    acFormula: fields.acFormula ?? null,
    strRequirement: fields.strRequirement ?? null,
    isShield: fields.isShield ?? false,
    effect: fields.effect ?? null,
    attunement: Boolean(fields.attunement),
  };
}
