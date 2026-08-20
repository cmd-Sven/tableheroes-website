/**
 * Battlemap-Roadmap (kurz):
 * - Fog: manuelle Rect/Circle-Shapes (SL), JIT-Sync, Preset → nächste Session
 * - Kein Follow-SL-Viewport (Zoom/Pan bleibt lokal)
 * @see BATTLEMAP.md
 */

export type BattlemapTokenSide = "party" | "friendly" | "neutral" | "hostile";

export type BattlemapFogShapeKind = "rect" | "circle";

/** Manuelle Fog-of-War-Fläche, am Grid ausgerichtet. */
export type SessionBattlemapFogShape = {
  id: string;
  battlemap_id: string;
  session_id: string;
  campaign_id: string;
  shape: BattlemapFogShapeKind;
  /** Rect: oben links; Circle: Zentrumszelle */
  grid_x: number;
  grid_y: number;
  /** Rect: Breite in Zellen; Circle: Radius in Zellen */
  grid_w: number;
  /** Rect: Höhe in Zellen; Circle: = grid_w */
  grid_h: number;
  z_index: number;
  created_at?: string;
  updated_at?: string;
};

export type BattlemapFogTool = "select" | "rect" | "circle" | null;

export type BattlemapEffectShapeKind = "rect" | "circle" | "cone";

/** SL-Schablone zur Markierung von Effektbereichen (Zauber, Auren, …). */
export type SessionBattlemapEffectTemplate = {
  id: string;
  battlemap_id: string;
  session_id: string;
  campaign_id: string;
  shape: BattlemapEffectShapeKind;
  /** Rect: oben links; Circle: Zentrum; Cone: Spitze */
  grid_x: number;
  grid_y: number;
  /** Rect: Breite; Circle: Radius; Cone: Länge in Zellen */
  grid_w: number;
  /** Rect: Höhe; Circle: = grid_w */
  grid_h: number;
  /** Cone: Richtung in Grad (0 = Ost, im Uhrzeigersinn) */
  direction_deg: number;
  z_index: number;
  created_at?: string;
  updated_at?: string;
};

export type BattlemapEffectTool = "select" | "rect" | "circle" | "cone" | null;

export type CharacterTokenPlacement = {
  characterId: string;
  characterName: string;
  /** Bewegung in ft aus Charakterbogen (serverseitig geladen) */
  speedFt: number;
  /** floor(speedFt / 5) */
  baseCells: number;
  useDash: boolean;
  /** Erstplatzierung auf dieser Map — kein Distanzlimit */
  isFirstPlacement: boolean;
  originGridX?: number;
  originGridY?: number;
};

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
  show_hp_bar?: boolean;
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
