/**
 * battlemap-stage-utils — Shared helpers and prop types for BattlemapStage (coords, fit scale, keyboard guards).
 */
import type {
  BattlemapContainerTool,
  BattlemapEffectTool,
  BattlemapFogTool,
  BattlemapMarkerKind,
  BattlemapMarkerTool,
  BattlemapTrapTool,
  CharacterTokenPlacement,
  GmPropPlacementDraft,
  GmTokenPlacementDraft,
  SessionBattlemap,
  SessionBattlemapContainer,
  SessionBattlemapEffectTemplate,
  SessionBattlemapFogShape,
  SessionBattlemapMarker,
  SessionBattlemapProp,
  SessionBattlemapToken,
  SessionBattlemapTrap,
} from "@/src/lib/session/battlemap-types";
import { BATTLEMAP_MARKER_KINDS } from "@/src/lib/session/battlemap-types";
import type { CharacterConditionKey } from "@/src/lib/characters/condition-tokens";
import type { ActiveCombatTurnHighlight } from "@/src/lib/combat-initiative";

export function isMarkerPlaceKind(
  tool: BattlemapMarkerTool,
): tool is BattlemapMarkerKind {
  return Boolean(
    tool && tool !== "select" && (BATTLEMAP_MARKER_KINDS as readonly string[]).includes(tool),
  );
}

/** Spieler/SL: eigenen Charakter-Token ziehen; SL zusätzlich NPC-/Gegner-Token. */
export function canUserDragBattlemapToken(
  token: SessionBattlemapToken,
  opts: {
    isGm: boolean;
    ownCharacterId?: string | null;
    placementActive?: boolean;
    shapeSelectActive?: boolean;
  },
): boolean {
  if (opts.placementActive || opts.shapeSelectActive) return false;

  if (token.character_id) {
    if (opts.ownCharacterId && token.character_id === opts.ownCharacterId) return true;
    return opts.isGm;
  }

  return opts.isGm;
}

/** Space/hotkeys müssen Textfelder nicht abfangen (z. B. Trap-Wizard). */
export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return Boolean(el.closest?.("[contenteditable='true']"));
}

export type BattlemapStageProps = {
  battlemap: SessionBattlemap;
  tokens: SessionBattlemapToken[];
  props: SessionBattlemapProp[];
  fogShapes?: SessionBattlemapFogShape[];
  effectTemplates?: SessionBattlemapEffectTemplate[];
  markers?: SessionBattlemapMarker[];
  traps?: SessionBattlemapTrap[];
  containers?: SessionBattlemapContainer[];
  isGm?: boolean;
  characterPlacement?: CharacterTokenPlacement | null;
  gmTokenPlacement?: GmTokenPlacementDraft | null;
  gmMoveTokenId?: string | null;
  selectedTokenId?: string | null;
  selectedPropId?: string | null;
  selectedFogShapeId?: string | null;
  fogTool?: BattlemapFogTool;
  effectTool?: BattlemapEffectTool;
  markerTool?: BattlemapMarkerTool;
  trapTool?: BattlemapTrapTool;
  containerTool?: BattlemapContainerTool;
  /** Wenn true: Space-Pan nicht aktiv (z. B. Trap-Wizard-Modal offen). */
  disableSpacePan?: boolean;
  selectedEffectTemplateId?: string | null;
  selectedMarkerId?: string | null;
  selectedTrapId?: string | null;
  selectedContainerId?: string | null;
  onSelectEffectTemplate?: (templateId: string | null) => void;
  onEffectTemplateCreate?: (input: {
    shape: "rect" | "circle" | "cone";
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
    directionDeg?: number;
  }) => void;
  onEffectTemplateMove?: (templateId: string, gridX: number, gridY: number) => void;
  onEffectTemplateDelete?: (templateId: string) => void;
  onEffectToolCancel?: () => void;
  onSelectMarker?: (markerId: string | null) => void;
  onMarkerCreate?: (input: {
    kind: BattlemapMarkerKind;
    gridX: number;
    gridY: number;
  }) => void;
  onMarkerMove?: (markerId: string, gridX: number, gridY: number) => void;
  onMarkerDelete?: (markerId: string) => void;
  onMarkerToolCancel?: () => void;
  onSelectTrap?: (trapId: string | null) => void;
  onTrapPlaceCell?: (gridX: number, gridY: number) => void;
  onTrapToolCancel?: () => void;
  onTrapDelete?: (trapId: string) => void;
  onTrapMarkDiscovered?: (trapId: string) => void;
  onTrapTrigger?: (trapId: string) => void;
  onTrapDisarm?: (trapId: string) => void;
  onSelectContainer?: (containerId: string | null) => void;
  onContainerOpenMenu?: (
    container: SessionBattlemapContainer,
    clientX: number,
    clientY: number,
  ) => void;
  onContainerPlaceCell?: (gridX: number, gridY: number) => void;
  onContainerToolCancel?: () => void;
  onCancelPlacement?: () => void;
  onToggleDash?: () => void;
  onCellClick?: (gridX: number, gridY: number) => void;
  onSelectToken?: (tokenId: string | null) => void;
  onSelectProp?: (propId: string | null) => void;
  onSelectFogShape?: (shapeId: string | null) => void;
  onFogShapeCreate?: (input: {
    shape: "rect" | "circle";
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
  }) => void;
  onFogShapeMove?: (shapeId: string, gridX: number, gridY: number) => void;
  onFogShapeDelete?: (shapeId: string) => void;
  onFogToolCancel?: () => void;
  /** Freihändig zeichnen */
  drawTool?: "draw" | null;
  drawColor?: string;
  drawWidth?: number;
  drawStrokes?: import("@/src/lib/session/map-draw-types").SessionMapDrawStroke[];
  onDrawStroke?: (points: import("@/src/lib/session/map-draw-types").MapDrawPoint[]) => void;
  onTokenMove?: (token: SessionBattlemapToken, gridX: number, gridY: number) => void;
  onPropDrop?: (draft: GmPropPlacementDraft, posX: number, posY: number) => void;
  onPropResize?: (propId: string, delta: number) => void;
  onToggleTokenVisibility?: (tokenId: string, visible: boolean) => void;
  onTogglePropVisibility?: (propId: string, visible: boolean) => void;
  onRemoveToken?: (tokenId: string) => void;
  onRemoveProp?: (propId: string) => void;
  hpByRef?: Record<string, { current: number; max: number }>;
  activeTurnHighlight?: ActiveCombatTurnHighlight | null;
  ownCharacterId?: string | null;
  /** characterId → Gemüt-/Zustands-Anzeige-URL */
  characterDisplayUrlById?: Record<string, string | null | undefined>;
  /** characterId → aktive SL-Zustände */
  characterConditionsById?: Record<string, CharacterConditionKey[] | undefined>;
  /** Spieler-Bewegungsreichweite (Zellen) für Drag-Moves ohne Placement-Modus */
  playerMoveMaxCells?: number | null;
  onTokenContextMenu?: (
    token: SessionBattlemapToken,
    clientX: number,
    clientY: number,
  ) => void;
};

/** Bildschirmkoordinaten → Bildpixel (Zoom/Pan der TransformWrapper berücksichtigen). */
export function clientToMapPixels(
  clientX: number,
  clientY: number,
  el: HTMLElement,
  mapWidth: number,
  mapHeight: number,
): { px: number; py: number } | null {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    px: ((clientX - rect.left) / rect.width) * mapWidth,
    py: ((clientY - rect.top) / rect.height) * mapHeight,
  };
}

export function fitScaleFor(
  mapWidth: number,
  mapHeight: number,
  viewWidth: number,
  viewHeight: number,
): number {
  if (mapWidth <= 0 || mapHeight <= 0 || viewWidth <= 0 || viewHeight <= 0) {
    return 1;
  }
  // Etwas Luft am Rand, damit die Karte nicht bündig am Viewport klebt
  const padding = 0.92;
  return Math.min(viewWidth / mapWidth, viewHeight / mapHeight) * padding;
}
