export type BattlemapTokenSide = "party" | "friendly" | "neutral" | "hostile";

export type BattlemapGridConfig = {
  cellSizePx: number;
  originX: number;
  originY: number;
  columns: number;
  rows: number;
  showGrid: boolean;
};

export type SessionBattlemap = {
  id: string;
  session_id: string;
  campaign_id: string;
  title: string;
  image_url: string;
  image_storage_path: string | null;
  sort_order: number;
  grid_config: BattlemapGridConfig;
  created_at?: string;
  updated_at?: string;
};

export type SessionBattlemapToken = {
  id: string;
  battlemap_id: string;
  session_id: string;
  character_id: string | null;
  npc_id: string | null;
  creature_id: string | null;
  grid_x: number;
  grid_y: number;
  label: string | null;
  image_url: string | null;
  size_cells: number;
  is_visible_to_players: boolean;
  token_side: BattlemapTokenSide;
  created_at?: string;
  updated_at?: string;
};

export const DEFAULT_BATTLEMAP_GRID: BattlemapGridConfig = {
  cellSizePx: 50,
  originX: 0,
  originY: 0,
  columns: 20,
  rows: 20,
  showGrid: true,
};
