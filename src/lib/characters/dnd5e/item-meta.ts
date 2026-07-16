import type { ShopCatalogItem } from "@/src/lib/shop-catalog/types";
import type { InventoryCategory } from "@/src/types/inventory";

/** Inventar-Kategorien für Grid-Filter und Icons */
export type InventoryDisplayCategory =
  | "weapons"
  | "armor"
  | "potions"
  | "tools"
  | "gear"
  | "ingredients"
  | "ammunition"
  | "scrolls"
  | "unknown";

/** Strukturierte D&D-5e-Item-Daten in character_items.description */
export type Dnd5eItemMeta = {
  version: 1;
  kind: ShopCatalogItem["kind"] | "unknown";
  weightLb: number;
  damage?: string | null;
  damageType?: "Wucht" | "Hieb" | "Stich" | null;
  properties?: string[];
  acFormula?: string | null;
  isShield?: boolean;
  attunement?: boolean;
  isMagical?: boolean;
  effect?: string | null;
  strRequirement?: number | null;
  rangeMeters?: string | null;
  rarity?: string | null;
  /** Stapelmenge (Standard 1) */
  quantity?: number;
  /** Explizite Inventar-Kategorie für Grid-Filter */
  inventoryCategory?: InventoryDisplayCategory | string | null;
  /** Geschätzter Wert in GP */
  valueGp?: number | null;
  /** Explizit als Verbrauchsgegenstand markiert (Gürtel-Nutzung entfernt 1×) */
  isConsumable?: boolean;
};

const META_BLOCK_RE = /\[dnd5e-meta\]([\s\S]*?)\[\/dnd5e-meta\]/i;
const FOUNDRY_TAG_RE = /\[foundry:([^\]]+)\]/i;
const CUSTOM_TAG = "[custom:dnd5e]";

export function parseDnd5eMetaFromDescription(
  description: string | null | undefined,
): Dnd5eItemMeta | null {
  if (!description) return null;
  const m = description.match(META_BLOCK_RE);
  if (!m?.[1]) return null;
  try {
    const raw = JSON.parse(m[1]) as Dnd5eItemMeta;
    if (raw?.version !== 1) return null;
    return {
      version: 1,
      kind: raw.kind ?? "unknown",
      weightLb: Math.max(0, Number(raw.weightLb) || 0),
      damage: raw.damage ?? null,
      damageType: raw.damageType ?? null,
      properties: Array.isArray(raw.properties) ? raw.properties.map(String) : [],
      acFormula: raw.acFormula ?? null,
      isShield: Boolean(raw.isShield),
      attunement: Boolean(raw.attunement),
      isMagical: Boolean(raw.isMagical),
      effect: raw.effect ?? null,
      strRequirement: raw.strRequirement ?? null,
      rangeMeters: raw.rangeMeters ?? null,
      rarity: raw.rarity ?? null,
      quantity: Math.max(1, Math.round(Number(raw.quantity) || 1)),
      inventoryCategory: raw.inventoryCategory ?? null,
      valueGp: raw.valueGp != null ? Math.max(0, Number(raw.valueGp) || 0) : null,
      isConsumable: Boolean(raw.isConsumable),
    };
  } catch {
    return null;
  }
}

export function parseFoundryItemTag(description: string | null | undefined): string | null {
  if (!description) return null;
  const m = description.match(FOUNDRY_TAG_RE);
  return m?.[1]?.trim() || null;
}

export function buildFoundryItemTag(foundryItemId: string): string {
  return `[foundry:${foundryItemId}]`;
}

export function stripMachineTags(description: string): string {
  return description
    .replace(META_BLOCK_RE, "")
    .replace(FOUNDRY_TAG_RE, "")
    .replace(/\[catalog:[^\]]+\]/gi, "")
    .replace(/\[custom:dnd5e\]/gi, "")
    .replace(/\[Shop\][^\n]*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildItemDescription(input: {
  userText?: string | null;
  meta?: Dnd5eItemMeta | null;
  tags?: string[];
}): string | null {
  const parts: string[] = [];
  for (const tag of input.tags ?? []) {
    if (tag.trim()) parts.push(tag.trim());
  }
  if (input.meta) {
    parts.push(`[dnd5e-meta]${JSON.stringify(input.meta)}[/dnd5e-meta]`);
  }
  const user = input.userText?.trim();
  if (user) parts.push(user);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

export function metaToInventoryCategory(meta: Dnd5eItemMeta): InventoryCategory {
  if (meta.kind === "weapon") return "Weapon";
  if (meta.kind === "consumable") return "Consumable";
  return "Equipment";
}

export function metaToResolvedStats(meta: Dnd5eItemMeta) {
  return {
    catalogId: null,
    archetypeKey: null,
    kind: meta.kind,
    weightLb: meta.weightLb,
    damage: meta.damage ?? null,
    damageType: meta.damageType ?? null,
    properties: meta.properties ?? [],
    acFormula: meta.acFormula ?? null,
    isShield: Boolean(meta.isShield),
    attunement: Boolean(meta.attunement),
    isMagical: Boolean(meta.isMagical) || meta.kind === "magic",
    effect: meta.effect ?? null,
    strRequirement: meta.strRequirement ?? null,
    rangeMeters: meta.rangeMeters ?? null,
  };
}

export function createEmptyCustomItemMeta(
  kind: Dnd5eItemMeta["kind"] = "equipment",
): Dnd5eItemMeta {
  return {
    version: 1,
    kind,
    weightLb: 0,
    quantity: 1,
    damage: null,
    damageType: null,
    properties: [],
    acFormula: null,
    isShield: false,
    attunement: false,
    isMagical: kind === "magic",
    effect: null,
    strRequirement: null,
    rangeMeters: null,
    rarity: "Gewöhnlich",
    isConsumable: kind === "consumable",
  };
}

export const CUSTOM_DND5E_TAG = CUSTOM_TAG;

export const DND5E_DAMAGE_TYPES: Array<"Wucht" | "Hieb" | "Stich"> = ["Wucht", "Hieb", "Stich"];

export const DND5E_ITEM_KIND_OPTIONS: Array<{
  id: Dnd5eItemMeta["kind"];
  label: string;
}> = [
  { id: "weapon", label: "Waffe" },
  { id: "armor", label: "Rüstung / Schild" },
  { id: "equipment", label: "Ausrüstung" },
  { id: "magic", label: "Magischer Gegenstand" },
  { id: "consumable", label: "Verbrauchsgut" },
  { id: "tool", label: "Werkzeug" },
  { id: "supply", label: "Vorräte" },
];

export const DND5E_WEAPON_PROPERTIES = [
  "Finesse",
  "Geschosse",
  "Laden",
  "Leicht",
  "Reichweite",
  "Schwer",
  "Vielseitig",
  "Zweihändig",
];
