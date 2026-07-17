import type { CharacterItem, InventoryCategory } from "@/src/types/inventory";
import type { ShopCatalogItem } from "@/src/lib/shop-catalog/types";
import {
  isStandardCategory,
  STANDARD_INVENTORY_CATEGORIES,
  type InventoryDisplayCategory,
} from "./inventory-categories";
import {
  collectPlacedItemIds,
  canPlaceItemInContainer,
  normalizeEquipmentState,
  placeItemInContainer,
} from "./equipment";
import type { Dnd5eEquipmentContainer, Dnd5eEquipmentState } from "./equipment-types";
import {
  buildItemDescription,
  CUSTOM_DND5E_TAG,
  metaToInventoryCategory,
  type Dnd5eItemMeta,
} from "./item-meta";
import { findLootReferenceByRefId } from "./loot-reference-catalog";
import {
  enrichLootMechanics,
  lootMechanicsToMetaFields,
} from "./loot-mechanics";
import { buildCatalogTag } from "./item-resolve";

export type { InventoryDisplayCategory };

export function itemTypeToDisplayCategory(
  itemType: string | null | undefined,
): InventoryDisplayCategory {
  switch (String(itemType ?? "").toLowerCase()) {
    case "weapon":
      return "weapons";
    case "armor":
      return "armor";
    case "potion":
      return "potions";
    case "tool":
      return "tools";
    case "material":
      return "ingredients";
    case "ammunition":
      return "ammunition";
    default:
      return "gear";
  }
}

export function displayCategoryToMetaKind(
  category: InventoryDisplayCategory,
): Dnd5eItemMeta["kind"] {
  switch (category) {
    case "weapons":
      return "weapon";
    case "armor":
      return "armor";
    case "potions":
      return "consumable";
    case "tools":
      return "tool";
    case "ingredients":
    case "ammunition":
      return "supply";
    case "gepaeck":
    case "guertel":
    case "gear":
      return "equipment";
    default:
      return "equipment";
  }
}

export function kindStringToMetaKind(kind?: string | null): Dnd5eItemMeta["kind"] {
  const k = String(kind ?? "").toLowerCase();
  if (k === "weapon") return "weapon";
  if (k === "armor") return "armor";
  if (k === "consumable" || k === "potion") return "consumable";
  if (k === "tool") return "tool";
  if (k === "supply" || k === "material") return "supply";
  if (k === "magic") return "magic";
  if (k === "equipment" || k === "gear") return "equipment";
  return "unknown";
}

export function inferLootInventoryCategory(
  name: string,
  desc?: string | null,
  isMagical?: boolean,
  kind?: string | null,
): InventoryDisplayCategory {
  if (kind) {
    const fromKind = itemTypeToDisplayCategory(kind);
    if (fromKind !== "gear" || kind === "gear") return fromKind;
  }

  const n = name.toLowerCase();
  const d = (desc ?? "").toLowerCase();
  const joined = `${n} ${d}`;

  if (
    joined.includes("schwert") ||
    joined.includes("sword") ||
    joined.includes("axt") ||
    joined.includes("axe") ||
    joined.includes("bogen") ||
    joined.includes("bow") ||
    joined.includes("dolch") ||
    joined.includes("dagger") ||
    joined.includes("waffe") ||
    joined.includes("weapon")
  ) {
    return "weapons";
  }
  if (
    joined.includes("rüstung") ||
    joined.includes("armor") ||
    joined.includes("schild") ||
    joined.includes("shield") ||
    joined.includes("helm") ||
    joined.includes("brust")
  ) {
    return "armor";
  }
  if (
    joined.includes("trank") ||
    joined.includes("potion") ||
    joined.includes("elixier") ||
    joined.includes("heil") ||
    joined.includes("öl") && joined.includes("heil")
  ) {
    return "potions";
  }
  if (
    joined.includes("pfeil") ||
    joined.includes("arrow") ||
    joined.includes("bolt") ||
    joined.includes("munition") ||
    joined.includes("kugel")
  ) {
    return "ammunition";
  }
  if (
    joined.includes("werkzeug") ||
    joined.includes("tool") ||
    joined.includes("schloss") ||
    joined.includes("thieves")
  ) {
    return "tools";
  }
  if (
    joined.includes("kräuter") ||
    joined.includes("herb") ||
    joined.includes("zutat") ||
    joined.includes("ingredient")
  ) {
    return "ingredients";
  }
  if (
    joined.includes("gürtel") ||
    joined.includes("guertel") ||
    joined.includes("belt")
  ) {
    return "guertel";
  }
  if (
    joined.includes("rucksack") ||
    joined.includes("backpack") ||
    joined.includes("tasche der halt") ||
    joined.includes("bag of holding") ||
    joined.includes("bodenlose") ||
    joined.includes("portable hole") ||
    joined.includes("gepaeck") ||
    joined.includes("gepäck")
  ) {
    return "gepaeck";
  }
  if (isMagical) return "gear";
  return "gear";
}

export function normalizeLootInventoryCategory(
  value: string | null | undefined,
  fallback: InventoryDisplayCategory,
): InventoryDisplayCategory {
  const v = String(value ?? "").trim().toLowerCase();
  if (isStandardCategory(v) && v !== "unknown") return v;
  return fallback;
}

export function iconTypeForDisplayCategory(
  category: InventoryDisplayCategory,
): string {
  switch (category) {
    case "weapons":
      return "sword";
    case "armor":
      return "shield";
    case "potions":
      return "flask";
    case "tools":
      return "wrench";
    case "ammunition":
      return "crosshair";
    case "gepaeck":
      return "backpack";
    case "guertel":
      return "belt";
    default:
      return "gear";
  }
}

export function buildLootCharacterItemInsert(input: {
  name: string;
  desc?: string | null;
  rarity?: string | null;
  price?: number;
  isMagical?: boolean;
  inventoryCategory?: InventoryDisplayCategory | string | null;
  kind?: string | null;
  weightLb?: number;
  referenceId?: string | null;
  attunement?: boolean;
  damage?: string | null;
  damageType?: string | null;
  properties?: string[];
  rangeMeters?: string | null;
  acFormula?: string | null;
  strRequirement?: number | null;
  isShield?: boolean;
  effect?: string | null;
  extraUserLines?: string[];
}): {
  category: InventoryCategory;
  description: string | null;
  icon_type: string | null;
} {
  const name = input.name.trim();
  const desc = (input.desc ?? "").trim();
  const enriched = enrichLootMechanics({
    name,
    referenceId: input.referenceId,
    inventoryCategory: input.inventoryCategory ?? undefined,
    kind: input.kind ?? undefined,
    weightLb: input.weightLb,
    price: input.price,
    isMagical: input.isMagical,
    attunement: input.attunement,
    damage: input.damage,
    damageType: input.damageType,
    properties: input.properties,
    rangeMeters: input.rangeMeters,
    acFormula: input.acFormula,
    strRequirement: input.strRequirement,
    isShield: input.isShield,
    effect: input.effect,
  });

  const isMagical = Boolean(enriched.isMagical);
  const inferred = inferLootInventoryCategory(name, desc, isMagical, enriched.kind);
  const inventoryCategory = normalizeLootInventoryCategory(
    enriched.inventoryCategory,
    inferred,
  );
  const metaKind =
    enriched.kind != null
      ? kindStringToMetaKind(enriched.kind)
      : displayCategoryToMetaKind(inventoryCategory);

  const mechanics = lootMechanicsToMetaFields(enriched);

  const meta: Dnd5eItemMeta = {
    version: 1,
    kind: metaKind,
    weightLb: Math.max(0, Number(enriched.weightLb) || 0),
    quantity: 1,
    isMagical,
    attunement: mechanics.attunement ?? (isMagical && metaKind === "magic"),
    rarity: input.rarity ?? null,
    valueGp:
      enriched.price != null ? Math.max(0, Math.round(Number(enriched.price) || 0)) : null,
    inventoryCategory,
    ...mechanics,
  };

  const ref = findLootReferenceByRefId(enriched.referenceId);
  const tags = [CUSTOM_DND5E_TAG];
  if (ref) {
    tags.push(buildCatalogTag(ref.archetypeKey, ref.catalogId));
  }

  const userParts = [
    desc || null,
    ...(input.extraUserLines ?? []).filter(Boolean),
  ].filter(Boolean);

  const description = buildItemDescription({
    tags,
    meta,
    userText: userParts.join("\n\n") || null,
  });

  return {
    category: metaToInventoryCategory(meta),
    description,
    icon_type: iconTypeForDisplayCategory(inventoryCategory),
  };
}

function createDefaultBackpackContainer(): Dnd5eEquipmentContainer {
  return {
    id: crypto.randomUUID(),
    kind: "backpack",
    label: "Rucksack",
    linkedItemId: null,
    itemIds: [],
  };
}

/** Platziert ein Item im ersten passenden Rucksack (oder legt einen Standard-Rucksack an). */
export function autoPackItemToContainer(
  equipment: Dnd5eEquipmentState,
  itemId: string,
  items: CharacterItem[],
): Dnd5eEquipmentState {
  let next = normalizeEquipmentState(equipment);
  const placed = collectPlacedItemIds(next);
  if (placed.has(itemId)) return next;

  let containers = [...next.containers];
  if (containers.length === 0) {
    containers = [createDefaultBackpackContainer()];
    next = { ...next, containers };
  }

  const ordered = [
    ...containers.filter((c) => c.kind === "backpack"),
    ...containers.filter((c) => c.kind !== "backpack"),
  ];

  for (const container of ordered) {
    const check = canPlaceItemInContainer(container, items, itemId);
    if (check.ok) {
      return placeItemInContainer(next, container.id, itemId, items);
    }
  }

  return next;
}

export function parseAiInventoryCategory(
  value: unknown,
  name: string,
  desc: string,
  isMagical: boolean,
): InventoryDisplayCategory {
  const raw = String(value ?? "").trim().toLowerCase();
  if (STANDARD_INVENTORY_CATEGORIES.includes(raw as InventoryDisplayCategory) && raw !== "unknown") {
    return raw as InventoryDisplayCategory;
  }
  return inferLootInventoryCategory(name, desc, isMagical);
}

export function shopKindFromItemType(itemType: string | null | undefined): ShopCatalogItem["kind"] {
  switch (String(itemType ?? "").toLowerCase()) {
    case "weapon":
      return "weapon";
    case "armor":
      return "armor";
    case "potion":
      return "consumable";
    case "tool":
      return "tool";
    case "material":
      return "supply";
    default:
      return "equipment";
  }
}
