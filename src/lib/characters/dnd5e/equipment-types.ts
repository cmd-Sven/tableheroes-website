/** Körper-Slots für die Silhouette */
export type Dnd5eEquipmentSlot =
  | "head"
  | "eyes"
  | "neck"
  | "shoulders"
  | "chest"
  | "hands"
  | "wrists"
  | "waist"
  | "legs"
  | "feet"
  | "mainHand"
  | "offHand"
  | "ring1"
  | "ring2";

/** Allgemeine Ausrüstungsfelder (nicht an Körper-Silhouette gebunden) */
export type Dnd5eGeneralEquipmentSlot = "clothing" | "accessories" | "misc";

export const DND5E_GENERAL_EQUIPMENT_SLOTS: Dnd5eGeneralEquipmentSlot[] = [
  "clothing",
  "accessories",
  "misc",
];

export const GENERAL_SLOT_LABELS_DE: Record<Dnd5eGeneralEquipmentSlot, string> = {
  clothing: "Kleidung",
  accessories: "Accessoires",
  misc: "Sonstiges",
};

export const GENERAL_SLOT_LABELS_EN: Record<Dnd5eGeneralEquipmentSlot, string> = {
  clothing: "Clothing",
  accessories: "Accessories",
  misc: "Other",
};

/** Schnellwechsel: max. 2 Waffenkombinationen (Haupthand + Nebenhand) */
export type Dnd5eWeaponPreset = {
  id: string;
  name: string;
  mainHand: string | null;
  offHand: string | null;
};

/** Vollständige Ausrüstung unter eigenem Namen (nur bei Rast anwendbar) */
export type Dnd5eEquipmentLoadout = {
  id: string;
  name: string;
  belt: (string | null)[];
  slots: Partial<Record<Dnd5eEquipmentSlot, string | null>>;
  generalSlots: Partial<Record<Dnd5eGeneralEquipmentSlot, string | null>>;
  attunedItemIds: string[];
};

export const DND5E_EQUIPMENT_SLOTS: Dnd5eEquipmentSlot[] = [
  "head",
  "eyes",
  "neck",
  "shoulders",
  "chest",
  "hands",
  "wrists",
  "waist",
  "legs",
  "feet",
  "mainHand",
  "offHand",
  "ring1",
  "ring2",
];

export const EQUIPMENT_SLOT_LABELS_DE: Record<Dnd5eEquipmentSlot, string> = {
  head: "Kopf",
  eyes: "Augen",
  neck: "Hals",
  shoulders: "Schultern",
  chest: "Brust",
  hands: "Hände",
  wrists: "Arme/Handgelenk",
  waist: "Taille",
  legs: "Beine",
  feet: "Füße",
  mainHand: "Haupthand",
  offHand: "Nebenhand",
  ring1: "Ring 1",
  ring2: "Ring 2",
};

export const EQUIPMENT_SLOT_LABELS_EN: Record<Dnd5eEquipmentSlot, string> = {
  head: "Head",
  eyes: "Eyes",
  neck: "Neck",
  shoulders: "Shoulders",
  chest: "Torso",
  hands: "Hands",
  wrists: "Arms/Wrists",
  waist: "Waist",
  legs: "Legs",
  feet: "Feet",
  mainHand: "Main Hand",
  offHand: "Off Hand",
  ring1: "Ring #1",
  ring2: "Ring #2",
};

export type Dnd5eContainerKind = "backpack" | "bag_of_holding" | "pouch";

export const CONTAINER_KIND_LABELS_DE: Record<Dnd5eContainerKind, string> = {
  backpack: "Rucksack",
  bag_of_holding: "Tasche der haltenden Magie",
  pouch: "Beutel",
};

export const CONTAINER_KIND_LABELS_EN: Record<Dnd5eContainerKind, string> = {
  backpack: "Backpack",
  bag_of_holding: "Bag of Holding",
  pouch: "Pouch",
};

/** Standard-Gewichtslimit in Pfund (D&D 5e) */
export const CONTAINER_CAPACITY_LB: Record<Dnd5eContainerKind, number> = {
  backpack: 30,
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
  /** Optional: individuelles Gewichtslimit (lb); sonst Standard für kind */
  maxCapacityLb?: number | null;
  itemIds: string[];
};

export type InventoryCustomCategory = {
  id: string;
  label: string;
  /** Lucide icon name (optional) */
  icon?: string;
};

export type Dnd5eEquipmentState = {
  /** Mindestens ein Rucksack erforderlich, bevor Gepäck verteilt wird */
  containers: Dnd5eEquipmentContainer[];
  /** Gürtel-Schnellzugriff (max. 6) */
  belt: (string | null)[];
  slots: Partial<Record<Dnd5eEquipmentSlot, string | null>>;
  /** Kleidung, Accessoires, Sonstiges — außerhalb der Silhouette */
  generalSlots?: Partial<Record<Dnd5eGeneralEquipmentSlot, string | null>>;
  /** Eingestimmte magische Gegenstände (max. 3) */
  attunedItemIds: string[];
  /** Bis zu 2 Waffenkombinationen für schnellen Wechsel */
  weaponPresets?: Dnd5eWeaponPreset[];
  /** Benannte Voll-Ausrüstungen (Rast erforderlich zum Anwenden) */
  loadouts?: Dnd5eEquipmentLoadout[];
  /** Benutzerdefinierte Inventar-Kategorien (Bearbeitungsmodus) */
  customCategories?: InventoryCustomCategory[];
};

export const MAX_BELT_SLOTS = 6;
export const MAX_ATTUNEMENT = 3;
export const MAX_WEAPON_PRESETS = 2;
/** Max. ausgerüstete Gepäckstücke (Rucksack / Tasche / Beutel) */
export const MAX_LUGGAGE_SLOTS = 5;

export function createEmptyEquipmentState(): Dnd5eEquipmentState {
  return {
    containers: [],
    belt: Array.from({ length: MAX_BELT_SLOTS }, () => null),
    slots: {},
    generalSlots: {},
    attunedItemIds: [],
    weaponPresets: [],
    loadouts: [],
    customCategories: [],
  };
}
