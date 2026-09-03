export type InventoryCategory =
  | "Weapon"
  | "Equipment"
  | "Consumable"
  | "Story"
  | "CoinGem";

export type CharacterItem = {
  id: string;
  character_id: string;
  name: string;
  description: string | null;
  category: InventoryCategory;
  icon_type: string | null;
  is_deleted: boolean;
  target_fap: number;
  current_fap: number;
  created_at?: string;
};

export type CharacterGem = {
  name: string;
  estimated_value: number;
};

export type CharacterWealth = {
  id: string;
  character_id: string;
  gp: number;
  sp: number;
  cp: number;
  ep: number;
  pp: number;
  gem_data: CharacterGem[];
};

export type CharacterInventoryPayload = {
  items: CharacterItem[];
  wealth: CharacterWealth;
  sleep_debt_fap: number;
  /** Rationen 0–10 (Survival / Reise). */
  rations_count: number;
  /** Tage ohne Ration hintereinander. */
  starvation_days: number;
  /** Stadt-FAP: aufeinanderfolgende Kurzschlaf-Nächte (2 FAP). */
  consecutive_short_sleep_days: number;
};

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
  "Weapon",
  "Equipment",
  "Consumable",
  "Story",
  "CoinGem",
];
