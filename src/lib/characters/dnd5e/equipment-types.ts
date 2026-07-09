/** Körper-Slots für die Silhouette */
export type Dnd5eEquipmentSlot =
  | "head"
  | "eyes"
  | "neck"
  | "shoulders"
  | "chest"
  | "hands"
  | "waist"
  | "legs"
  | "feet"
  | "mainHand"
  | "offHand"
  | "back";

export const DND5E_EQUIPMENT_SLOTS: Dnd5eEquipmentSlot[] = [
  "head",
  "eyes",
  "neck",
  "shoulders",
  "chest",
  "hands",
  "waist",
  "legs",
  "feet",
  "mainHand",
  "offHand",
  "back",
];

export const EQUIPMENT_SLOT_LABELS_DE: Record<Dnd5eEquipmentSlot, string> = {
  head: "Kopf",
  eyes: "Augen",
  neck: "Hals",
  shoulders: "Schultern",
  chest: "Brust",
  hands: "Hände",
  waist: "Taille",
  legs: "Beine",
  feet: "Füße",
  mainHand: "Haupthand",
  offHand: "Nebenhand",
  back: "Rücken",
};

export type Dnd5eContainerKind = "backpack" | "bag_of_holding" | "pouch";

export const CONTAINER_KIND_LABELS_DE: Record<Dnd5eContainerKind, string> = {
  backpack: "Rucksack",
  bag_of_holding: "Tasche der haltenden Magie",
  pouch: "Beutel",
};

/** Standard-Gewichtslimit in Pfund (D&D 5e) */
export const CONTAINER_CAPACITY_LB: Record<Dnd5eContainerKind, number | null> = {
  backpack: null,
  bag_of_holding: 500,
  pouch: 6,
};

export type Dnd5eEquipmentContainer = {
  id: string;
  kind: Dnd5eContainerKind;
  /** Anzeigename, z. B. „Rucksack (Leder)" */
  label: string;
  /** Optional: verknüpftes Inventar-Item (character_items.id) */
  linkedItemId?: string | null;
  itemIds: string[];
};

export type Dnd5eEquipmentState = {
  /** Mindestens ein Rucksack erforderlich, bevor Gepäck verteilt wird */
  containers: Dnd5eEquipmentContainer[];
  /** Gürtel-Schnellzugriff (max. 6) */
  belt: (string | null)[];
  slots: Partial<Record<Dnd5eEquipmentSlot, string | null>>;
  /** Eingestimmte magische Gegenstände (max. 3) */
  attunedItemIds: string[];
};

export const MAX_BELT_SLOTS = 6;
export const MAX_ATTUNEMENT = 3;

export function createEmptyEquipmentState(): Dnd5eEquipmentState {
  return {
    containers: [],
    belt: Array.from({ length: MAX_BELT_SLOTS }, () => null),
    slots: {},
    attunedItemIds: [],
  };
}
