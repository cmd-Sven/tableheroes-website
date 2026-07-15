import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Crosshair,
  FlaskConical,
  HelpCircle,
  Package,
  Shield,
  Swords,
  Wrench,
} from "lucide-react";
import type { CharacterItem } from "@/src/types/inventory";
import type { InventoryCustomCategory } from "./equipment-types";
import {
  type InventoryDisplayCategory,
  type Dnd5eItemMeta,
  parseDnd5eMetaFromDescription,
} from "./item-meta";
import { resolveCharacterItemStats } from "./item-resolve";

export type { InventoryDisplayCategory };

export const STANDARD_INVENTORY_CATEGORIES: InventoryDisplayCategory[] = [
  "weapons",
  "armor",
  "potions",
  "tools",
  "gear",
  "ingredients",
  "ammunition",
  "unknown",
];

export const CATEGORY_ICONS: Record<InventoryDisplayCategory, LucideIcon> = {
  weapons: Swords,
  armor: Shield,
  potions: FlaskConical,
  tools: Wrench,
  gear: Package,
  ingredients: FlaskConical,
  ammunition: Crosshair,
  unknown: HelpCircle,
};

export const CATEGORY_COLORS: Record<InventoryDisplayCategory, string> = {
  weapons: "border-red-500/60 bg-red-950/40 text-red-300",
  armor: "border-slate-400/60 bg-slate-800/50 text-slate-200",
  potions: "border-purple-500/60 bg-purple-950/40 text-purple-300",
  tools: "border-amber-600/60 bg-amber-950/40 text-amber-300",
  gear: "border-hero-border/60 bg-hero-dark/50 text-gray-300",
  ingredients: "border-lime-600/60 bg-lime-950/40 text-lime-300",
  ammunition: "border-orange-500/60 bg-orange-950/40 text-orange-300",
  unknown: "border-gray-500/60 bg-gray-900/50 text-gray-400",
};

export function isStandardCategory(
  cat: string | null | undefined,
): cat is InventoryDisplayCategory {
  return STANDARD_INVENTORY_CATEGORIES.includes(cat as InventoryDisplayCategory);
}

export function getItemQuantity(item: CharacterItem): number {
  const meta = parseDnd5eMetaFromDescription(item.description);
  return Math.max(1, Math.round(Number(meta?.quantity) || 1));
}

export function inferInventoryCategory(item: CharacterItem): InventoryDisplayCategory {
  const meta = parseDnd5eMetaFromDescription(item.description);
  if (meta?.inventoryCategory && isStandardCategory(meta.inventoryCategory)) {
    return meta.inventoryCategory;
  }

  const stats = resolveCharacterItemStats(item);
  const n = item.name.toLowerCase();
  const desc = (item.description ?? "").toLowerCase();

  if (stats.kind === "weapon" || item.category === "Weapon") return "weapons";
  if (stats.kind === "armor" || stats.isShield) return "armor";
  if (stats.kind === "consumable" || item.category === "Consumable") {
    if (n.includes("ration") || n.includes("rationen")) return "gear";
    if (n.includes("trank") || n.includes("potion") || n.includes("elixier")) return "potions";
    return "potions";
  }
  if (stats.kind === "tool") return "tools";

  if (
    n.includes("pfeil") ||
    n.includes("bolt") ||
    n.includes("arrow") ||
    n.includes("munition") ||
    n.includes("kugel")
  ) {
    return "ammunition";
  }
  if (
    n.includes("öl") ||
    n.includes("oil") ||
    n.includes("zutat") ||
    n.includes("kräuter") ||
    n.includes("herb")
  ) {
    return "ingredients";
  }
  if (
    n.includes("seil") ||
    n.includes("rope") ||
    n.includes("eimer") ||
    n.includes("bucket") ||
    n.includes("laterne") ||
    n.includes("rucksack") ||
    n.includes("backpack")
  ) {
    return "gear";
  }

  if (desc.includes("waffe") || desc.includes("weapon")) return "weapons";
  if (desc.includes("rüstung") || desc.includes("armor")) return "armor";

  return "unknown";
}

export function getItemDisplayCategory(
  item: CharacterItem,
  customCategories?: InventoryCustomCategory[],
): string {
  const meta = parseDnd5eMetaFromDescription(item.description);
  if (meta?.inventoryCategory) {
    if (isStandardCategory(meta.inventoryCategory)) return meta.inventoryCategory;
    const custom = customCategories?.find((c) => c.id === meta.inventoryCategory);
    if (custom) return custom.id;
  }
  return inferInventoryCategory(item);
}

export function getStackKey(item: CharacterItem): string {
  const stats = resolveCharacterItemStats(item);
  const catalog = stats.catalogId ?? "no-catalog";
  const kind = stats.kind ?? item.category;
  return `${catalog}:${item.name.trim().toLowerCase()}:${kind}`;
}

export function isConsumableItem(item: CharacterItem): boolean {
  const stats = resolveCharacterItemStats(item);
  if (stats.kind === "consumable" || item.category === "Consumable") return true;
  const n = item.name.toLowerCase();
  return (
    n.includes("ration") ||
    n.includes("trank") ||
    n.includes("potion") ||
    n.includes("munition") ||
    n.includes("pfeil") ||
    n.includes("arrow")
  );
}

export const EQUIP_CONFLICT_ICON = AlertTriangle;

/** Meta-Art → Anzeige-Kategorie (Legacy-Items mit kind „magic“). */
export function metaKindToDisplayCategory(
  kind: Dnd5eItemMeta["kind"],
): InventoryDisplayCategory {
  switch (kind) {
    case "weapon":
      return "weapons";
    case "armor":
      return "armor";
    case "consumable":
      return "potions";
    case "tool":
      return "tools";
    case "supply":
      return "gear";
    case "magic":
      return "gear";
    default:
      return "gear";
  }
}

/** Inventar-Kategorie → D&D-Item-Art (ein Feld für Editor & Loot). */
export function displayCategoryToMetaKind(
  category: InventoryDisplayCategory | string,
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
    default:
      return "equipment";
  }
}

export function patchMetaFromDisplayCategory(
  category: InventoryDisplayCategory,
  isMagical: boolean,
): Pick<Dnd5eItemMeta, "inventoryCategory" | "kind" | "isMagical"> {
  return {
    inventoryCategory: category,
    kind: displayCategoryToMetaKind(category),
    isMagical,
  };
}
