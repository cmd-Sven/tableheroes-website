/**
 * Weltkarten-Typen und Icon-Enum.
 *
 * Icon-Mapping (Produkt-Spec → Lucide-Näherung):
 * | Spec                    | Enum key   | Lucide-Komponente   |
 * |-------------------------|------------|---------------------|
 * | Buch                    | book       | Book                |
 * | Goldmünzen              | coins      | Coins               |
 * | Schloss                 | castle     | Castle              |
 * | Haus                    | house      | House               |
 * | Lagerfeuer              | campfire   | Flame               |
 * | Fass                    | barrel     | Barrel              |
 * | Messer+Gabel gekreuzt   | utensils   | UtensilsCrossed     |
 * | Drache                  | dragon     | Skull (Näherung)    |
 * | Berg                    | mountain   | Mountain            |
 * | Schiff                  | ship       | Ship                |
 * | Anker                   | anchor     | Anchor              |
 * | Turm                    | tower      | Landmark            |
 * | Schwert                 | sword      | Sword               |
 * | Diamant                 | gem        | Gem                 |
 * | Höhle                   | cave       | MountainSnow        |
 * | Weg                     | path       | Route               |
 * | (Fallback)              | marker     | MapPin              |
 */

import type { BattlemapGridConfig } from "@/src/lib/session/battlemap-types";

export const WORLD_MAP_ICON_KEYS = [
  "book",
  "coins",
  "castle",
  "house",
  "campfire",
  "barrel",
  "utensils",
  "dragon",
  "mountain",
  "ship",
  "anchor",
  "tower",
  "sword",
  "gem",
  "cave",
  "path",
  "marker",
] as const;

export type WorldMapIconKey = (typeof WORLD_MAP_ICON_KEYS)[number];

export const WORLD_MAP_ICON_LABELS: Record<WorldMapIconKey, string> = {
  book: "Buch",
  coins: "Goldmünzen",
  castle: "Schloss",
  house: "Haus",
  campfire: "Lagerfeuer",
  barrel: "Fass",
  utensils: "Messer & Gabel",
  dragon: "Drache",
  mountain: "Berg",
  ship: "Schiff",
  anchor: "Anker",
  tower: "Turm",
  sword: "Schwert",
  gem: "Diamant",
  cave: "Höhle",
  path: "Weg",
  marker: "Markierung",
};

export const DEFAULT_WORLD_MAP_GRID: BattlemapGridConfig = {
  cellSizePx: 50,
  originX: 0,
  originY: 0,
  columns: 24,
  rows: 16,
  showGrid: true,
};

export type WorldMap = {
  id: string;
  world_id: string;
  title: string;
  image_url: string;
  image_storage_path: string | null;
  grid_config: BattlemapGridConfig;
  sort_order: number;
  group_token_grid_x: number | null;
  group_token_grid_y: number | null;
  group_token_visible: boolean;
  /** true = Lagerfeuer-Symbol (Camping) statt Gruppentoken */
  group_token_is_camping: boolean;
  created_at?: string;
  updated_at?: string;
};

export type WorldMapMarker = {
  id: string;
  world_map_id: string;
  icon: WorldMapIconKey;
  name: string;
  description: string | null;
  grid_x: number;
  grid_y: number;
  is_visible_to_players: boolean;
  lore_id: string | null;
  npc_id: string | null;
  faction_id: string | null;
  creature_id: string | null;
  quest_id: string | null;
  created_at?: string;
  updated_at?: string;
};

export type WorldMapMarkerNote = {
  id: string;
  marker_id: string;
  body: string;
  author_user_id: string;
  author_display_name: string | null;
  created_at: string;
  updated_at?: string;
};

export type SessionWorldMap = {
  id: string;
  session_id: string;
  world_map_id: string;
  sort_order: number;
  world_map?: WorldMap;
};

export type WorldMapEntityLink = {
  type: "lore" | "npc" | "faction" | "creature" | "quest";
  id: string;
  label: string;
  href: string;
};

export function isWorldMapIconKey(value: unknown): value is WorldMapIconKey {
  return typeof value === "string" && (WORLD_MAP_ICON_KEYS as readonly string[]).includes(value);
}
