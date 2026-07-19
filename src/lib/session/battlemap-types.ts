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

/** Tisch-Prop: NSC-Karte oder Szenen-Bild auf der Map. */
export type BattlemapPropKind = "npc_card" | "scene_image";

/**
 * Position und Größe relativ zur Map-Bildgröße (0–1).
 * pos_x/pos_y = obere linke Ecke; width/height = Anteil an Bildbreite/-höhe.
 */
export type SessionBattlemapProp = {
  id: string;
  battlemap_id: string;
  session_id: string;
  kind: BattlemapPropKind;
  npc_id: string | null;
  image_url: string | null;
  scene_media_id: string | null;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  rotation: number;
  is_visible_to_players: boolean;
  z_index: number;
  created_at?: string;
  updated_at?: string;
};

export type GmTokenPlacementDraft = {
  kind: "npc" | "creature";
  refId: string;
  name: string;
  imageUrl: string | null;
  tokenSide: BattlemapTokenSide;
  sizeCells: number;
  isVisibleToPlayers: boolean;
};

export type GmPropPlacementDraft = {
  kind: BattlemapPropKind;
  npcId?: string | null;
  sceneMediaId?: string | null;
  imageUrl: string | null;
  label: string;
  width: number;
  height: number;
};
