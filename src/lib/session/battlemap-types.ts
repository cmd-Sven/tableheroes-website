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

/** 1-Feld-Spezialeffekt-Marker auf der Battlemap. */
export type BattlemapMarkerKind =
  | "fire"
  | "ice"
  | "debris"
  | "crack"
  | "danger"
  | "interest"
  | "trap";

export type SessionBattlemapMarker = {
  id: string;
  battlemap_id: string;
  session_id: string;
  campaign_id: string;
  kind: BattlemapMarkerKind;
  grid_x: number;
  grid_y: number;
  is_visible_to_players: boolean;
  z_index: number;
  created_at?: string;
  updated_at?: string;
};

/** null = Werkzeug aus; select = verschieben/löschen; sonst Art zum Platzieren */
export type BattlemapMarkerTool = "select" | BattlemapMarkerKind | null;

export const BATTLEMAP_MARKER_KINDS: readonly BattlemapMarkerKind[] = [
  "fire",
  "ice",
  "debris",
  "crack",
  "danger",
  "interest",
  "trap",
] as const;

export const BATTLEMAP_MARKER_META: Record<
  BattlemapMarkerKind,
  { label: string; hint: string }
> = {
  fire: { label: "Feuer", hint: "Flammen / Brand auf dem Feld" },
  ice: { label: "Eis", hint: "Frost / Eisfläche" },
  debris: { label: "Geröll", hint: "Unpassierbar durch Trümmer" },
  crack: { label: "Riss", hint: "Loch oder Riss im Boden" },
  danger: { label: "Gefahr", hint: "Wahrnehmung: gefährlich" },
  interest: { label: "Interessant", hint: "Etwas Entdeckenswertes" },
  trap: { label: "Falle", hint: "Achtung Falle" },
};

/** Schwierigkeit für Trap-Wizard / AI. */
export type BattlemapTrapDifficulty = "easy" | "medium" | "hard" | "deadly";

export type BattlemapTrapEffectShape = "circle" | "rect";

/** Runtime-Falle auf der Battlemap (unsichtbar bis Detection/Trigger). */
export type SessionBattlemapTrap = {
  id: string;
  battlemap_id: string;
  session_id: string;
  campaign_id: string;
  name: string;
  description: string;
  trap_type: string;
  difficulty: BattlemapTrapDifficulty;
  grid_x: number;
  grid_y: number;
  /** Spec: detectionDC */
  detection_dc: number;
  /** Spec: isAreaEffect — Schaden/Effekt-Fläche nach Auslösen (nicht Trigger) */
  is_area_effect: boolean;
  effect_shape: BattlemapTrapEffectShape;
  /** Spec: effectRadius in Gridfeldern (AoE nach Trigger; Trigger bleibt 1 Zelle) */
  effect_radius: number;
  /** Spec: damage (z. B. 2d6) */
  damage: string;
  damage_type: string;
  save_ability: string | null;
  save_dc: number | null;
  /**
   * Optionaler SL-Zustand (CharacterConditionKey), der bei fehlgeschlagenem
   * Rettungswurf über das bestehende Zustands-/Avatar-System gesetzt wird.
   */
  status_effect: string | null;
  is_armed: boolean;
  is_detected: boolean;
  is_triggered: boolean;
  is_disarmed: boolean;
  is_visible_to_players: boolean;
  triggered_by_character_id: string | null;
  triggered_at?: string | null;
  lore_context?: string | null;
  ai_payload?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

/** null = aus; place = Falle setzen; select = auswählen */
export type BattlemapTrapTool = "select" | "place" | null;

/** Falle + Charakter, der entschärfen soll (Token am Battlemap). */
export type TrapDisarmTarget = {
  trap: SessionBattlemapTrap;
  characterId: string;
  /** Trap eingebettet in Container — Disarm-Actions auf Container-Tabelle */
  sourceContainerId?: string;
};

/** Behältertyp für Battlemap-Container. */
export type BattlemapContainerType =
  | "chest"
  | "barrel"
  | "crate"
  | "urn"
  | "sarcophagus"
  | "other";

/** null = aus; place = setzen; select = auswählen */
export type BattlemapContainerTool = "select" | "place" | null;

/** Runtime-Behälter auf der Battlemap. */
export type SessionBattlemapContainer = {
  id: string;
  battlemap_id: string;
  session_id: string;
  campaign_id: string;
  name: string;
  description: string;
  container_type: BattlemapContainerType;
  grid_x: number;
  grid_y: number;
  is_locked: boolean;
  is_open: boolean;
  force_open_dc: number;
  /** Aktuelle TP (SL trackt Schaden bei gewaltsamem Öffnen). */
  hp_current: number;
  /** Maximale TP. */
  hp_max: number;
  /** Versteckt → Spieler sehen ihn erst nach Entdeckung; PP nur dann. */
  is_hidden: boolean;
  /** Versteckter Behälter wurde entdeckt. */
  is_discovered: boolean;
  /** SG für Entdeckung (versteckte Behälter). */
  detection_dc: number;
  has_trap: boolean;
  trap_config: Record<string, unknown>;
  is_trap_detected: boolean;
  is_trap_disarmed: boolean;
  is_trap_triggered: boolean;
  trap_visible_to_players: boolean;
  trap_triggered_by_character_id: string | null;
  trap_triggered_at?: string | null;
  lore_context?: string | null;
  ai_payload?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

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
