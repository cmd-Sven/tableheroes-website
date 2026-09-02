/**
 * LiveSessionBattlemapPane.types — Prop types for battlemap pane and stage host.
 */
import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  TransitionStartFunction,
} from "react";
import type { ActiveCombatTurnHighlight } from "@/src/lib/combat-initiative";
import type { CharacterConditionKey } from "@/src/lib/characters/condition-tokens";
import type {
  BattlemapContainerTool,
  BattlemapEffectTool,
  BattlemapFogTool,
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
import type { StageSceneMediaItem } from "@/src/components/session/StageSceneCard";
import type { LiveState } from "./live-session-types";

type BattlemapNotifyTokens = (detail?: {
  op?: "upsert" | "delete" | "refresh";
  token?: SessionBattlemapToken | null;
  tokenId?: string | null;
}) => void;
type BattlemapNotifyFog = (detail?: {
  op?: "upsert" | "delete" | "refresh";
  shape?: SessionBattlemapFogShape | null;
  shapeId?: string | null;
}) => void;
type BattlemapNotifyEffect = (detail?: {
  op?: "upsert" | "delete" | "refresh";
  template?: SessionBattlemapEffectTemplate | null;
  templateId?: string | null;
}) => void;

export type LiveSessionBattlemapPaneProps = {
  activeBattlemap: SessionBattlemap | null;
  visibleBattlemapTokens: SessionBattlemapToken[];
  visibleBattlemapProps: SessionBattlemapProp[];
  battlemapFogShapes: SessionBattlemapFogShape[];
  battlemapEffectTemplates: SessionBattlemapEffectTemplate[];
  battlemapMarkers: SessionBattlemapMarker[];
  battlemapTraps: SessionBattlemapTrap[];
  battlemapContainers: SessionBattlemapContainer[];
  battlemapTokens: SessionBattlemapToken[];
  isGM: boolean;
  tokenPlacement: CharacterTokenPlacement | null;
  setTokenPlacement: Dispatch<SetStateAction<CharacterTokenPlacement | null>>;
  gmTokenPlacement: GmTokenPlacementDraft | null;
  setGmTokenPlacement: Dispatch<SetStateAction<GmTokenPlacementDraft | null>>;
  gmMoveTokenId: string | null;
  setGmMoveTokenId: Dispatch<SetStateAction<string | null>>;
  selectedBattlemapTokenId: string | null;
  setSelectedBattlemapTokenId: Dispatch<SetStateAction<string | null>>;
  selectedBattlemapPropId: string | null;
  setSelectedBattlemapPropId: Dispatch<SetStateAction<string | null>>;
  selectedFogShapeId: string | null;
  setSelectedFogShapeId: Dispatch<SetStateAction<string | null>>;
  fogTool: BattlemapFogTool;
  setFogTool: Dispatch<SetStateAction<BattlemapFogTool>>;
  effectTool: BattlemapEffectTool;
  setEffectTool: Dispatch<SetStateAction<BattlemapEffectTool>>;
  markerTool: BattlemapMarkerTool;
  setMarkerTool: Dispatch<SetStateAction<BattlemapMarkerTool>>;
  trapTool: BattlemapTrapTool;
  setTrapTool: Dispatch<SetStateAction<BattlemapTrapTool>>;
  containerTool: BattlemapContainerTool;
  setContainerTool: Dispatch<SetStateAction<BattlemapContainerTool>>;
  drawTool: "draw" | null;
  drawColor: string;
  drawWidth: number;
  setWorldMapFogCount: Dispatch<SetStateAction<number>>;
  setWorldMapEffectCount: Dispatch<SetStateAction<number>>;
  setWorldMapMarkerCount: Dispatch<SetStateAction<number>>;
  setDrawStrokeCount: Dispatch<SetStateAction<number>>;
  worldMapFogClearReq: number;
  worldMapEffectClearReq: number;
  worldMapMarkerClearReq: number;
  drawUndoReq: number;
  drawClearReq: number;
  trapWizardCell: { gridX: number; gridY: number } | null;
  setTrapWizardCell: Dispatch<SetStateAction<{ gridX: number; gridY: number } | null>>;
  containerWizardCell: { gridX: number; gridY: number } | null;
  setContainerWizardCell: Dispatch<SetStateAction<{ gridX: number; gridY: number } | null>>;
  selectedEffectTemplateId: string | null;
  setSelectedEffectTemplateId: Dispatch<SetStateAction<string | null>>;
  selectedMarkerId: string | null;
  setSelectedMarkerId: Dispatch<SetStateAction<string | null>>;
  selectedTrapId: string | null;
  setSelectedTrapId: Dispatch<SetStateAction<string | null>>;
  selectedContainerId: string | null;
  setSelectedContainerId: Dispatch<SetStateAction<string | null>>;
  setBattlemapContainers: Dispatch<SetStateAction<SessionBattlemapContainer[]>>;
  activeBattlemapId: string | null;
  sessionId: string;
  campaignId: string;
  worldId: string | null | undefined;
  activeWorldMapId: string | null;
  battlemapActive: boolean;
  battlemapTrayScenes: StageSceneMediaItem[];
  startTransition: TransitionStartFunction;
  setBattlemapFogShapes: Dispatch<SetStateAction<SessionBattlemapFogShape[]>>;
  setBattlemapEffectTemplates: Dispatch<SetStateAction<SessionBattlemapEffectTemplate[]>>;
  setBattlemapMarkers: Dispatch<SetStateAction<SessionBattlemapMarker[]>>;
  setBattlemapTokens: Dispatch<SetStateAction<SessionBattlemapToken[]>>;
  notifyBattlemapFogChanged: BattlemapNotifyFog;
  notifyBattlemapEffectChanged: BattlemapNotifyEffect;
  notifyBattlemapTokensChanged: BattlemapNotifyTokens;
  handleFogShapeDelete: (shapeId: string) => void;
  handleEffectTemplateDelete: (templateId: string) => void;
  handleMarkerDelete: (markerId: string) => void;
  handleTrapDelete: (trapId: string) => void;
  handleTrapMarkDiscovered: (trapId: string) => void;
  handleTrapTrigger: (trapId: string) => void;
  handleContainerDelete: (containerId: string) => void;
  handleContainerTrapMarkDiscovered: (containerId: string) => void;
  handleContainerMarkDiscovered: (containerId: string) => void;
  handleContainerTrapTrigger: (containerId: string) => void;
  handleContainerPickLock: (containerId: string, characterId: string) => void;
  handleContainerForceOpen: (containerId: string, characterId: string) => void;
  setTrapDisarmTarget: Dispatch<SetStateAction<import("@/src/lib/session/battlemap-types").TrapDisarmTarget | null>>;
  handleBattlemapCellClick: (gridX: number, gridY: number) => void;
  handleBattlemapTokenMove: (token: SessionBattlemapToken, gridX: number, gridY: number) => void;
  handleBattlemapPropDrop: (draft: GmPropPlacementDraft, posX: number, posY: number) => void;
  handleBattlemapPropResize: (propId: string, delta: number) => void;
  battlemapTokenHpByRef: Record<string, { current: number; max: number }>;
  activeTurnHighlight: ActiveCombatTurnHighlight | null;
  currentPlayerCharacterId: string | null;
  characterDisplayUrlById: Record<string, string | null | undefined>;
  characterConditionsById: Record<string, CharacterConditionKey[]>;
  setTokenRadial: Dispatch<
    SetStateAction<{ token: SessionBattlemapToken; x: number; y: number } | null>
  >;
  setLiveState: Dispatch<SetStateAction<LiveState | null>>;
  liveStateRef: MutableRefObject<LiveState | null>;
};
