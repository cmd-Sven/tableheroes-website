import type { CharacterItem } from "@/src/types/inventory";
import type { Dnd5eEquipmentSlot } from "./equipment-types";
import { resolveCharacterItemStats } from "./item-resolve";

export type SlotValidationResult = {
  valid: boolean;
  reason?: "weapon_only" | "armor_only" | "shield_offhand" | "ring_only" | "not_equippable";
};

function nameHintsRing(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("ring") || n.includes("ring");
}

function nameHintsCloak(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("umhang") || n.includes("cloak") || n.includes("cape") || n.includes("mantel");
}

function nameHintsBoots(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("stiefel") || n.includes("boot") || n.includes("schuh");
}

function nameHintsHelmet(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("helm") ||
    n.includes("hat") ||
    n.includes("kappe") ||
    n.includes("haube") ||
    n.includes("hood")
  );
}

function nameHintsAmulet(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("amulett") ||
    n.includes("amulet") ||
    n.includes("halskette") ||
    n.includes("necklace") ||
    n.includes("medaillon")
  );
}

function nameHintsBelt(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("gürtel") || n.includes("guertel") || n.includes("belt");
}

/** D&D 5e Slot-Zuordnung für Drag & Drop */
export function validateItemForSlot(
  item: CharacterItem,
  slot: Dnd5eEquipmentSlot,
): SlotValidationResult {
  const stats = resolveCharacterItemStats(item);
  const n = item.name.toLowerCase();

  if (stats.kind === "weapon" || item.category === "Weapon") {
    if (slot === "mainHand" || slot === "offHand") return { valid: true };
    return { valid: false, reason: "weapon_only" };
  }

  if (stats.isShield) {
    if (slot === "offHand") return { valid: true };
    return { valid: false, reason: "shield_offhand" };
  }

  if (stats.kind === "armor") {
    if (slot === "chest") return { valid: true };
    if (slot === "head" && nameHintsHelmet(n)) return { valid: true };
    if (slot === "feet" && nameHintsBoots(n)) return { valid: true };
    return { valid: false, reason: "armor_only" };
  }

  if (nameHintsRing(n) || stats.kind === "magic") {
    if (slot === "ring1" || slot === "ring2") return { valid: true };
    if (nameHintsRing(n)) return { valid: false, reason: "ring_only" };
  }

  if (nameHintsCloak(n)) {
    if (slot === "shoulders" || slot === "back") return { valid: true };
  }

  if (nameHintsAmulet(n)) {
    if (slot === "neck") return { valid: true };
  }

  if (nameHintsBelt(n)) {
    if (slot === "waist") return { valid: true };
  }

  if (nameHintsBoots(n) && slot === "feet") return { valid: true };
  if (nameHintsHelmet(n) && slot === "head") return { valid: true };

  if (stats.kind === "magic" && !stats.isShield) {
    const wearableSlots: Dnd5eEquipmentSlot[] = [
      "head",
      "neck",
      "shoulders",
      "chest",
      "waist",
      "feet",
      "ring1",
      "ring2",
      "mainHand",
      "offHand",
    ];
    if (wearableSlots.includes(slot)) return { valid: true };
  }

  if (
    stats.kind === "consumable" ||
    stats.kind === "tool" ||
    stats.kind === "supply" ||
    stats.kind === "equipment"
  ) {
    return { valid: false, reason: "not_equippable" };
  }

  return { valid: false, reason: "not_equippable" };
}

export function validateItemForBelt(item: CharacterItem): SlotValidationResult {
  const stats = resolveCharacterItemStats(item);
  if (stats.kind === "consumable" || item.category === "Consumable") return { valid: true };
  if (stats.kind === "weapon") {
    const n = item.name.toLowerCase();
    if (n.includes("dolch") || n.includes("dagger") || n.includes("wurfmesser")) {
      return { valid: true };
    }
  }
  if (stats.kind === "magic") return { valid: true };
  const n = item.name.toLowerCase();
  if (n.includes("trank") || n.includes("potion") || n.includes("zauberstab") || n.includes("wand")) {
    return { valid: true };
  }
  return { valid: true };
}

export const DRAG_MIME = "application/x-tableheroes-item";
