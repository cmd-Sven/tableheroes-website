"use client";

import {
  type CSSProperties,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { normalizeGuestSlots } from "@/src/lib/session-guest-slots";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient as createBrowserSupabase } from "@/src/lib/supabase/client";
import {
  Map,
  Users,
  BookOpen,
  PenSquare,
  Feather,
  Search,
  X,
  Flag,
  Cloud,
  CloudLightning,
  CloudRain,
  ScrollText,
  ExternalLink,
  PlusCircle,
  LayoutGrid,
  Snowflake,
  Sun,
  Swords,
  Gift,
  Mic,
  UserRound,
  Shield,
  Skull,
  Handshake,
  Hand,
  Minus,
  StickyNote,
  Minimize2,
  Maximize2,
  EyeOff,
} from "lucide-react";
import {
  ensureSessionPrepLiveState,
} from "@/src/app/dashboard/campaigns/[id]/session-actions";
import {
  compareCombatHudOrder,
  compareCombatInitiative,
  hasRolledCombatInitiative,
  isCreatureActiveCombatTurn,
  isNpcActiveCombatTurn,
  normalizeCombatConditions,
  normalizeCombatParticipantSide,
  parseInitiativeLabel,
  resolveActiveCombatTurnHighlight,
  type CombatConditionId,
  type CombatParticipantSide,
} from "@/src/lib/combat-initiative";
import { CombatInitiativeHud } from "@/src/components/session/CombatInitiativeHud";
const CombatStartVideoModal = dynamic(
  () =>
    import("@/src/components/session/CombatStartVideoModal").then((m) => ({
      default: m.CombatStartVideoModal,
    })),
  { ssr: false },
);
import {
  advanceCombatTurn,
  rollCombatInitiative,
  setCombatInitiative,
} from "@/src/lib/actions/combat-initiative-actions";
import { SessionEndWrapUpModal } from "@/src/components/session/SessionEndWrapUpModal";
import { adjustNpcReputation } from "@/src/lib/actions/npc-reputation-actions";
import {
  getCampaignNote,
  upsertCampaignNote,
} from "@/src/app/dashboard/campaigns/[id]/campaign-notes-actions";
import { setCampaignVisibility } from "@/src/app/dashboard/campaigns/[id]/campaign-visibility-actions";
import { createSystemLog } from "@/src/lib/actions/session-system-log-actions";
import { registerSessionOnlinePresence } from "@/src/lib/actions/session-presence-actions";
import { StageDeckHand } from "./StageDeckHand";
import { StageSceneCard, type StageSceneMediaItem } from "@/src/components/session/StageSceneCard";
import { logSceneMediaAppearance } from "@/src/app/dashboard/campaigns/[id]/scene-media-actions";
import {
  formatWeatherSummary,
  normalizeIntensity,
  WEATHER_PRESET_ORDER,
  WEATHER_PRESETS,
  type WeatherPresetId,
} from "@/src/lib/session-weather";
const PrivateInventoryModal = dynamic(
  () =>
    import("@/src/components/inventory/PrivateInventoryModal").then((m) => ({
      default: m.PrivateInventoryModal,
    })),
  { ssr: false },
);
const Dnd5eCharacterSheetModalWithLocale = dynamic(
  () =>
    import("@/src/components/characters/Dnd5eCharacterSheetModal").then((m) => ({
      default: m.Dnd5eCharacterSheetModalWithLocale,
    })),
  { ssr: false },
);
import { LiveSessionSidePanels } from "@/src/components/session/LiveSessionSidePanels";
import { LiveSessionLeftDock } from "@/src/components/session/LiveSessionLeftDock";
import { LiveSessionDicePanel } from "@/src/components/session/LiveSessionDicePanel";
import { LiveSessionTopToolbar } from "@/src/components/session/LiveSessionTopToolbar";
import { LiveSessionLoadingScreen } from "@/src/components/session/LiveSessionLoadingScreen";
import { usePreloadSessionAssets } from "@/src/hooks/usePreloadSessionAssets";
import { StageRosterCollapse } from "@/src/components/session/StageRosterCollapse";
import type {
  LeftPanelId,
  MainSidePanelId,
  TopToolbarPanelId,
} from "@/src/components/session/live-session-side-types";
import { LiveSessionCharacterAvatar } from "@/src/components/session/LiveSessionCharacterAvatar";
import {
  LiveSessionHandRaiseQueue,
  LiveSessionUrgentHandBanner,
} from "@/src/components/session/LiveSessionHandRaiseUI";
import {
  dispatchAvatarRollFx,
  rollFxKindFromMeta,
} from "@/src/lib/session/avatar-roll-fx";
import { playDiceNatSound, primeDiceNatSounds } from "@/src/lib/session/dice-nat-sounds";
import { useCombatStartFx } from "@/src/hooks/useCombatStartFx";
import {
  dispatchAvatarSpeechBubble,
  speechBubbleFromActivityEntry,
} from "@/src/lib/session/avatar-speech-bubble";
import { DiceRollOverlay } from "@/src/components/session/dice/DiceRollOverlay";
import { shouldAnimateDiceEntry } from "@/src/lib/session/dice-animation";
import {
  useDiceRevealBridge,
  useOnDiceAnimComplete,
} from "@/src/lib/session/dice-reveal-store";
import { dismissSessionHand } from "@/src/lib/actions/session-hand-raise-actions";
import {
  FALLBACK_PLAYER_COLOR,
  getPlayerColorForClass,
} from "@/src/lib/session/class-player-color";
import {
  normalizeHandRaises,
  type SessionHandRaise,
} from "@/src/lib/session/hand-raises";
import { isDnd5eCampaignSystem } from "@/src/lib/characters/dnd5e/formulas";
import { LiveStageShopOverlay } from "./LiveStageShopOverlay";
import {
  StageNpcShopControls,
  type LiveCampaignShopOption,
} from "./StageNpcShopControls";
import { updateNpcMerchantAssignment } from "@/src/app/dashboard/campaigns/[id]/shop-actions";
import { FateCoinsPool, type FateCoin } from "@/src/components/session/FateCoinsPool";
import { SessionDayPhaseIndicator } from "@/src/components/session/SessionDayPhaseIndicator";
import { StageLootItemCards } from "@/src/components/session/StageLootItemCards";
import { DowntimePlayerOverlay } from "@/src/components/session/DowntimePlayerOverlay";
import { GmNpcSearchModal } from "@/src/components/session/GmNpcSearchModal";
import { GmBeastSearchModal } from "@/src/components/session/GmBeastSearchModal";
import { StageBeastCard } from "@/src/components/session/StageBeastCard";
import { BeastDefeatLootModal } from "@/src/components/session/BeastDefeatLootModal";
import {
  setCreatureDefeated,
  setCreatureDiscovery,
  type CampaignCreatureStateRow,
} from "@/src/app/dashboard/campaigns/[id]/creature-state-actions";
import type { BeastDiscoveryKey } from "@/src/lib/beast-check-results";
import { ChronicleRecorderPanel } from "@/src/components/session/ChronicleRecorderPanel";
import { ChronicleInboxFeed } from "@/src/components/chronicle/ChronicleInboxFeed";
import { SessionChronistModeControl } from "@/src/components/session/SessionChronistModeControl";
import { ChronicleMicTestPanel } from "@/src/components/session/ChronicleMicTestPanel";
import { ChronicleRecordingTopBar } from "@/src/components/session/ChronicleRecordingTopBar";
import {
  ChronicleLiveMarkerBar,
} from "@/src/components/session/ChronicleLiveMarkerBar";
import { ChronicleRecordingNoticeModal } from "@/src/components/session/ChronicleRecordingNoticeModal";
import { ChronicleRecordingReminderBanner } from "@/src/components/session/ChronicleRecordingReminderBanner";
import { ChronicleMicMonitor } from "@/src/components/session/ChronicleMicMonitor";
import { useSessionChronicleRecorder } from "@/src/hooks/useSessionChronicleRecorder";
import { useSessionTranscriptionStatus } from "@/src/hooks/useSessionTranscriptionStatus";
import { useMicMonitor } from "@/src/hooks/useMicMonitor";
import type { TranscriptionMode } from "@/src/lib/session-chronicle/constants";
import {
  resolveSessionDayPhase,
  SESSION_DAY_PHASE_ORDER,
  sessionDayPhaseLabel,
  type SessionDayPhase,
} from "@/src/lib/session-day-phase";
import {
  parseFapAllocations,
  type FapAllocationsMap,
} from "@/src/lib/downtime-fap-types";
import {
  formatNpcReputationScore,
  npcReputationSmileyFromScore,
} from "@/src/lib/npc-reputation-smiley";
import { sortNpcsByLocationPriority } from "@/src/lib/npc-stage-display";
import {
  imageDisplayBackdropStyle,
  imageDisplayObjectStyle,
  normalizeImageDisplay,
} from "@/src/lib/image-display";
import { BattlemapStage } from "@/src/components/session/battlemap/BattlemapStage";
import { BattlemapTokenTray } from "@/src/components/session/battlemap/BattlemapTokenTray";
import { BattlemapTokenRadialMenu } from "@/src/components/session/battlemap/BattlemapTokenRadialMenu";
import { useBattlemapCharacterDisplays } from "@/src/components/session/battlemap/useBattlemapCharacterDisplays";
import { LiveWorldMapOverlay } from "@/src/components/world-maps/LiveWorldMapOverlay";
import {
  getSessionWorldMaps,
  getWorldMaps,
  setActiveWorldMap,
} from "@/src/lib/actions/world-map-actions";
import type { SessionWorldMap, WorldMap } from "@/src/lib/world-maps/types";
import {
  BATTLEMAP_EFFECT_CHANGED_BROADCAST,
  BATTLEMAP_FOG_CHANGED_BROADCAST,
  BATTLEMAP_TOKENS_CHANGED_BROADCAST,
  CHARACTER_DISPLAY_CHANGED_BROADCAST,
  CHARACTER_DISPLAY_CHANGED_EVENT,
  dispatchCharacterDisplayChanged,
  dispatchOpenCharacterRadial,
  type BattlemapEffectChangedDetail,
  type BattlemapFogChangedDetail,
  type BattlemapTokensChangedDetail,
  type CharacterDisplayChangedDetail,
  type CharacterDisplaySnapshot,
} from "@/src/lib/session/character-radial-bridge";
import {
  creaturePlacementDraft,
  npcPlacementDraft,
} from "@/src/components/session/LiveSessionTokensPanel";
import {
  createBattlemapEffectTemplate,
  createBattlemapFogShape,
  createBattlemapMarker,
  createBattlemapProp,
  clearBattlemapEffectTemplates,
  clearBattlemapFogShapes,
  clearBattlemapMarkers,
  getCharacterMovementRange,
  getSessionBattlemaps,
  listBattlemapEffectTemplates,
  listBattlemapFogShapes,
  listBattlemapMarkers,
  placeBattlemapCharacterToken,
  placeBattlemapGmToken,
  removeBattlemapEffectTemplate,
  removeBattlemapFogShape,
  removeBattlemapMarker,
  removeBattlemapProp,
  removeBattlemapToken,
  toggleBattlemapTokenVisibility,
  updateBattlemapEffectTemplate,
  updateBattlemapFogShape,
  updateBattlemapMarker,
  updateBattlemapProp,
  updateBattlemapTokenSettings,
} from "@/src/lib/actions/battlemap-actions";
import type {
  BattlemapEffectTool,
  BattlemapFogTool,
  BattlemapMarkerKind,
  BattlemapMarkerTool,
  BattlemapTrapTool,
  CharacterTokenPlacement,
  GmPropPlacementDraft,
  GmTokenPlacementDraft,
  SessionBattlemap,
  SessionBattlemapEffectTemplate,
  SessionBattlemapFogShape,
  SessionBattlemapMarker,
  SessionBattlemapProp,
  SessionBattlemapToken,
  SessionBattlemapTrap,
} from "@/src/lib/session/battlemap-types";
import { BATTLEMAP_MARKER_KINDS } from "@/src/lib/session/battlemap-types";
import {
  mapBattlemapPropRow,
  mapBattlemapTokenRow,
  mapBattlemapTrapRow,
  upsertBattlemapProp,
  upsertBattlemapToken,
  upsertBattlemapTrap,
} from "@/src/lib/session/battlemap-realtime-map";
import {
  checkBattlemapTrapsOnEnter,
  clearBattlemapTraps,
  listBattlemapTraps,
  removeBattlemapTrap,
} from "@/src/lib/actions/battlemap-trap-actions";
import { TrapWizardModal } from "@/src/components/session/battlemap/TrapWizardModal";
import { TrapTriggerModal } from "@/src/components/session/battlemap/TrapTriggerModal";
import {
  isWithinMovementRange,
  movementCellsForBurst,
} from "@/src/lib/session/battlemap-movement";
import { isCellBlockedByTokens } from "@/src/lib/session/battlemap-grid";
import { parseNpcSheetData } from "@/src/lib/npcs/npc-sheet-types";

type LiveState = {
  id: string;
  session_id: string;
  weather: string | null;
  weather_preset?: string | null;
  weather_intensity?: number | null;
  weather_temperature?: string | null;
  temperature?: TemperatureState | null;
  temperature_value?: number | null;
  current_location: string | null;
  current_location_lore_id?: string | null;
  current_time: string | null;
  journal_text: string | null;
  /** SL: physisch am Spieltisch (Portraits auch ohne Browser-Presence sichtbar) */
  physically_present_user_ids?: string[] | null;
  scribe_id: string | null;
  system_logs?: SystemLogEntry[] | null;
  hand_raises?: SessionHandRaise[] | null;
  visible_npc_ids: string[] | null;
  visible_faction_ids?: string[] | null;
  visible_creature_ids?: string[] | null;
  active_scene_media_id?: string | null;
  active_battlemap_id?: string | null;
  active_world_map_id?: string | null;
  battlemap_movement_paused?: boolean | null;
  background_url?: string | null;
  is_background_manual_override?: boolean | null;
  is_combat_mode?: boolean | null;
  /** false = Initiative-Setup; true = Runden laufen */
  combat_started?: boolean | null;
  current_turn_index?: number | null;
  combat_round?: number | null;
  active_shop_id?: string | null;
  active_merchant_npc_id?: string | null;
  current_loot_id?: string | null;
  /** True: NPC-Karten ausblenden (geschlossene Beute-Truhe). */
  loot_hide_npcs?: boolean | null;
  fate_coins?: FateCoin[] | null;
  destroyed_fate_coins?: number | null;
  /** GM: 0–3 reine UI-Platzhalter „Spieler 1–3“ (kein Account / kein Log). */
  dummy_player_count?: number | null;
  /** Gast-Namen pro Dummy-Slot (Live-Sync). */
  guest_slots?: unknown;
  downtime_active?: boolean | null;
  downtime_type?: string | null;
  downtime_current_day?: number | null;
  downtime_total_days?: number | null;
  fap_allocations?: FapAllocationsMap;
};

type StageVisibilityPatch = Pick<
  LiveState,
  "visible_npc_ids" | "visible_faction_ids" | "visible_creature_ids"
>;

function normalizePhysicallyPresentUserIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x)).filter((id) => id.length > 0);
}

function normalizeLiveRow(row: unknown): LiveState {
  const r = row as Record<string, unknown>;
  const npcRaw = r.visible_npc_ids;
  const facRaw = r.visible_faction_ids;
  const creatureRaw = r.visible_creature_ids;
  const logsRaw = r.system_logs;
  const fateCoinsRaw = r.fate_coins;
  return {
    ...(r as unknown as LiveState),
    visible_npc_ids: Array.isArray(npcRaw) ? npcRaw.map(String) : [],
    visible_faction_ids: Array.isArray(facRaw) ? facRaw.map(String) : [],
    visible_creature_ids: Array.isArray(creatureRaw) ? creatureRaw.map(String) : [],
    active_scene_media_id:
      r.active_scene_media_id != null ? String(r.active_scene_media_id) : null,
    active_battlemap_id:
      r.active_battlemap_id != null ? String(r.active_battlemap_id) : null,
    active_world_map_id:
      r.active_world_map_id != null ? String(r.active_world_map_id) : null,
    battlemap_movement_paused: r.battlemap_movement_paused === true,
    system_logs: Array.isArray(logsRaw)
      ? logsRaw
          .filter((entry): entry is Record<string, unknown> =>
            entry != null && typeof entry === "object",
          )
          .map((entry) => ({
            id: String(entry.id ?? `${entry.at ?? ""}-${entry.text ?? ""}`),
            at: String(entry.at ?? ""),
            text: String(entry.text ?? ""),
            type: entry.type != null ? String(entry.type) : undefined,
            author_name: entry.author_name != null ? String(entry.author_name) : undefined,
            author_user_id:
              entry.author_user_id != null ? String(entry.author_user_id) : undefined,
            character_id: entry.character_id != null ? String(entry.character_id) : undefined,
            meta:
              entry.meta != null && typeof entry.meta === "object"
                ? (entry.meta as Record<string, unknown>)
                : undefined,
          }))
          .filter((entry) => entry.text.trim().length > 0)
      : [],
    fate_coins: Array.isArray(fateCoinsRaw)
      ? fateCoinsRaw
          .map((coin): FateCoin | null => {
            if (!coin || typeof coin !== "object") return null;
            const row = coin as Record<string, unknown>;
            const id = String(row.id ?? "").trim();
            if (!id) return null;
            return { id, side: row.side === "black" ? "black" : "white" };
          })
          .filter((coin): coin is FateCoin => coin != null)
      : [],
    destroyed_fate_coins: Number(r.destroyed_fate_coins ?? 0),
    downtime_active: Boolean(r.downtime_active),
    downtime_type:
      r.downtime_type != null && String(r.downtime_type).trim() !== ""
        ? String(r.downtime_type)
        : "travel",
    downtime_current_day: Math.max(1, Number(r.downtime_current_day ?? 1)),
    downtime_total_days: Math.max(1, Number(r.downtime_total_days ?? 1)),
    fap_allocations: parseFapAllocations(r.fap_allocations as import("@/src/lib/database.types").Json),
    current_loot_id:
      r.current_loot_id != null && String(r.current_loot_id).trim() !== ""
        ? String(r.current_loot_id)
        : null,
    physically_present_user_ids: normalizePhysicallyPresentUserIds(
      r.physically_present_user_ids,
    ),
    hand_raises: normalizeHandRaises(r.hand_raises),
    dummy_player_count: Math.min(
      3,
      Math.max(0, Math.round(Number(r.dummy_player_count ?? 0)) || 0),
    ),
    loot_hide_npcs: Boolean(r.loot_hide_npcs ?? false),
    combat_round: Math.max(1, Number(r.combat_round ?? 1) || 1),
  };
}

function normalizeStageVisibilityPatch(value: unknown): Partial<StageVisibilityPatch> {
  if (!value || typeof value !== "object") return {};

  const payload = value as Record<string, unknown>;
  const patch: Partial<StageVisibilityPatch> = {};

  if (Object.prototype.hasOwnProperty.call(payload, "visible_npc_ids")) {
    patch.visible_npc_ids = Array.isArray(payload.visible_npc_ids)
      ? payload.visible_npc_ids.map(String)
      : [];
  }

  if (Object.prototype.hasOwnProperty.call(payload, "visible_faction_ids")) {
    patch.visible_faction_ids = Array.isArray(payload.visible_faction_ids)
      ? payload.visible_faction_ids.map(String)
      : [];
  }

  if (Object.prototype.hasOwnProperty.call(payload, "visible_creature_ids")) {
    patch.visible_creature_ids = Array.isArray(payload.visible_creature_ids)
      ? payload.visible_creature_ids.map(String)
      : [];
  }

  return patch;
}

/** Ohne passende session_id ist React-State wirkungslos (Updates/Stage) — nicht als „geladen“ zählen. */
function isViableLiveState(row: unknown, expectedSessionId: string): boolean {
  if (row == null || typeof row !== "object") return false;
  const sid = String((row as Record<string, unknown>).session_id ?? "").trim();
  const exp = String(expectedSessionId ?? "").trim();
  if (!sid || !exp) return false;
  return sid.toLowerCase() === exp.toLowerCase();
}

const TEMPERATURE_MIN = -40;
const TEMPERATURE_DEFAULT = 15;
const TEMPERATURE_MAX = 55;

function normalizeTemperatureValue(value: unknown): number {
  const n = Number(value ?? TEMPERATURE_DEFAULT);
  if (!Number.isFinite(n)) return TEMPERATURE_DEFAULT;
  return Math.min(TEMPERATURE_MAX, Math.max(TEMPERATURE_MIN, Math.round(n)));
}

function getTemperatureFillPercent(value: number) {
  const tempPercentage =
    ((normalizeTemperatureValue(value) - TEMPERATURE_MIN) /
      (TEMPERATURE_MAX - TEMPERATURE_MIN)) *
    100;
  return Math.max(0, Math.min(100, tempPercentage));
}

function getThermometerFillColor(value: number) {
  if (value < 0) {
    return "linear-gradient(to top, #bae6fd, #eff6ff)";
  }
  if (value <= 10) {
    return "linear-gradient(to top, #38bdf8, #bae6fd)";
  }
  if (value <= 20) {
    return "linear-gradient(to top, #facc15, #fef08a)";
  }
  if (value < 30) {
    return "linear-gradient(to top, #ea580c, #fb923c)";
  }
  return "linear-gradient(to top, #7f1d1d, #ef4444)";
}

function getWeatherVisual(liveState: LiveState | null): WeatherIconOption {
  const raw = `${liveState?.weather_preset ?? ""} ${liveState?.weather ?? ""}`.toLowerCase();
  const preset = liveState?.weather_preset;
  if (preset && WEATHER_ICON_OPTIONS.some((option) => option.id === preset)) {
    return WEATHER_ICON_OPTIONS.find((option) => option.id === preset)!;
  }
  const byKeyword = WEATHER_ICON_OPTIONS.find((option) =>
    option.keywords.some((keyword) => raw.includes(keyword)),
  );
  if (byKeyword) {
    return byKeyword;
  }
  return WEATHER_ICON_OPTIONS[0];
}

function getWeatherCondition(liveState: LiveState | null) {
  const raw = `${liveState?.weather_preset ?? ""} ${liveState?.weather ?? ""}`.toLowerCase();
  if (raw.includes("storm") || raw.includes("sturm") || raw.includes("gewitter") || raw.includes("blitz")) {
    return "storm";
  }
  if (raw.includes("rain") || raw.includes("regen")) return "rain";
  if (raw.includes("snow") || raw.includes("schnee") || raw.includes("blizzard")) return "snow";
  if (raw.includes("sun") || raw.includes("sonne") || raw.includes("klar") || raw.includes("heiter")) {
    return "sun";
  }
  return "none";
}

const RAIN_DROPS = Array.from({ length: 58 }, (_, index) => ({
  id: `rain-${index}`,
  left: `${(index * 23) % 100}%`,
  delay: (index % 14) * 0.24,
  duration: 4 + (index % 6) * 0.36,
  height: 14 + (index % 5) * 3,
  opacity: 0.34 + (index % 4) * 0.08,
  drift: -18 - (index % 5) * 4,
}));

function normalizeCombatParticipants(rows: unknown[]): CombatParticipant[] {
  return (rows || [])
    .map((row) => {
      const r = row as Record<string, unknown>;
      const type: CombatParticipant["type"] =
        r.type === "player" ? "player" : r.type === "npc" ? "npc" : "monster";
      return {
        id: String(r.id),
        session_id: String(r.session_id),
        name: String(r.name ?? ""),
        type,
        npc_id: r.npc_id != null ? String(r.npc_id) : null,
        side: normalizeCombatParticipantSide(r.side),
        initiative_value: Number(r.initiative_value ?? 0),
        initiative_label:
          r.initiative_label != null ? String(r.initiative_label) : null,
        sort_order: Number(r.sort_order ?? 0),
        image_url: r.image_url != null ? String(r.image_url) : null,
        is_active: r.is_active !== false,
        conditions: normalizeCombatConditions(r.conditions),
      };
    })
    .filter((row) => row.id && row.name);
}

function WeatherPngIcon({
  option,
  sizeClassName,
}: {
  option: WeatherIconOption;
  sizeClassName: string;
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const FallbackIcon = option.FallbackIcon;

  if (hasImageError) {
    return <FallbackIcon className={sizeClassName} strokeWidth={1.7} />;
  }

  return (
    <span className={`relative block ${sizeClassName}`}>
      <Image
        src={option.src}
        alt={option.label}
        fill
        sizes="(max-width: 768px) 96px, 128px"
        className="object-contain"
        onError={() => setHasImageError(true)}
      />
    </span>
  );
}

type PartyCharacter = {
  id: string;
  name: string;
  class: string | null;
  race: string | null;
  level: number | null;
  avatar_url: string | null;
  avatar_display?: unknown | null;
  /** Spieler-Account (für Presence: ausgegraut bis Tab offen) */
  playerUserId?: string | null;
  rations_count: number;
  starvation_days: number;
  /** Nur Client: GM-Platzhalter ohne echten Charakter */
  isSessionDummy?: boolean;
  /** Gast-Teilnehmer (ohne TH-Account) */
  guestId?: string | null;
};

type CampaignNpc = {
  id: string;
  name: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  token_url?: string | null;
  token_size_category?: string | null;
  sheet_data?: unknown | null;
  is_revealed?: boolean | null;
  is_merchant?: boolean | null;
  shop_id?: string | null;
  faction_id?: string | null;
  /** world_lore.id – gleiche Semantik wie Session-Ort */
  current_location_id?: string | null;
  home_location_id?: string | null;
};

type CampaignCreature = {
  id: string;
  name: string;
  creature_type: string | null;
  image_url: string | null;
  physical_description: string | null;
  challenge_rating: number | null;
  known_loot: string | null;
  is_revealed?: boolean | null;
};

type CampaignFaction = {
  id: string;
  name: string;
  image_url: string | null;
  image_display?: unknown | null;
  banner_url?: string | null;
  banner_display?: unknown | null;
  type: string | null;
  description: string | null;
  current_status?: string | null;
  is_revealed?: boolean;
};

type StagePortraitModal = {
  name: string;
  subtitle: string | null;
  imageUrl: string;
};

type ActiveNpcReaction = {
  id: string;
  npcId: string;
  /** Anzuzeigendes Emoji (Ruf-Stand), Broadcast nutzt scoreAfter → Smiley */
  emoji: string;
};

type TemperatureState = "cold" | "normal" | "hot";

type WeatherIconOption = {
  id: WeatherPresetId;
  label: string;
  src: string;
  FallbackIcon: LucideIcon;
  className: string;
  keywords: string[];
};

type SystemLogEntry = {
  id: string;
  at: string;
  text: string;
  type?: string;
  author_name?: string;
  author_user_id?: string;
  character_id?: string;
  meta?: Record<string, unknown>;
};

type CombatParticipant = {
  id: string;
  session_id: string;
  name: string;
  type: "player" | "monster" | "npc";
  npc_id: string | null;
  side: CombatParticipantSide | null;
  initiative_value: number;
  initiative_label: string | null;
  sort_order: number;
  image_url: string | null;
  is_active: boolean;
  conditions: CombatConditionId[];
};

type CombatTokenPayload = {
  type: "player" | "monster" | "npc";
  name: string;
  image_url: string | null;
  npc_id?: string | null;
  side?: CombatParticipantSide | null;
};

function buildNpcCombatToken(npc: Pick<CampaignNpc, "id" | "name" | "image_url">): CombatTokenPayload {
  return {
    type: "npc",
    name: npc.name,
    image_url: npc.image_url,
    npc_id: String(npc.id),
  };
}

function isCombatTokenUsed(
  token: CombatTokenPayload,
  names: Set<string>,
  npcIds: Set<string>,
): boolean {
  if (token.type === "npc" && token.npc_id) return npcIds.has(token.npc_id);
  return names.has(token.name);
}

type StageCardGlowStyle = CSSProperties & {
  "--glow-color": string;
};

function getStageCardGlowColor(kind: "npc" | "faction") {
  return kind === "faction" ? "#cab926" : "#8b5cf6";
}

function useTemporaryStageGlow() {
  const [showGlow, setShowGlow] = useState(true);

  useEffect(() => {
    setShowGlow(true);
    const timeout = window.setTimeout(() => setShowGlow(false), 4000);
    return () => window.clearTimeout(timeout);
  }, []);

  return showGlow;
}

function getFactionStatusVisual(status: string | null | undefined) {
  switch (status) {
    case "Feindlich":
      return { Icon: Skull, color: "text-red-400", label: "Feindlich" };
    case "Im Krieg":
      return { Icon: Swords, color: "text-red-500", label: "Im Krieg" };
    case "Verbündet":
      return { Icon: Shield, color: "text-hero-vibrant", label: "Verbündet" };
    case "Freundlich":
      return { Icon: Handshake, color: "text-emerald-400", label: "Freundlich" };
    case "Neutral":
      return { Icon: Minus, color: "text-gray-400", label: "Neutral" };
    default:
      return null;
  }
}

function StageFactionPlayerNotesButton({
  campaignId,
  factionId,
  factionName,
}: {
  campaignId: string;
  factionId: string;
  factionName: string;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const openModal = () => {
    setOpen(true);
    if (loaded) return;
    startTransition(async () => {
      try {
        const note = await getCampaignNote(campaignId, "faction", factionId);
        const text = note?.content ?? "";
        setContent(text);
        setSaved(text);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Meine Notizen zu ${factionName}`}
        title="Meine Notizen"
        onClick={(e) => {
          e.stopPropagation();
          openModal();
        }}
        className="absolute left-2 top-2 z-30 grid h-8 w-8 place-items-center rounded-full border border-hero-vibrant/50 bg-black/75 text-hero-vibrant shadow-lg backdrop-blur transition-colors hover:bg-hero-vibrant/20"
      >
        <StickyNote className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[200] bg-black/50"
            aria-label="Notizen schließen"
            onClick={() => setOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-[201] w-[min(92vw,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-hero-border bg-background-card p-4 shadow-2xl">
            <h4 className="font-barlow font-bold text-sm uppercase text-accent-gold mb-2">
              Meine Notizen — {factionName}
            </h4>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Beobachtungen zu dieser Fraktion…"
              className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-sm text-gray-200 resize-y"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-hero-border px-3 py-1.5 font-barlow text-xs font-bold uppercase text-gray-400"
              >
                Schließen
              </button>
              <button
                type="button"
                disabled={isPending || content === saved}
                onClick={() => {
                  startTransition(async () => {
                    await upsertCampaignNote(campaignId, "faction", factionId, content);
                    setSaved(content);
                    setOpen(false);
                  });
                }}
                className="rounded border border-hero-vibrant/50 bg-hero-vibrant/10 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-40"
              >
                {isPending ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

function StageNpcCard({
  npc,
  isSingle,
  isGM,
  isCombatMode,
  isInInitiative,
  isActiveTurn = false,
  isUpdating,
  reputationScore,
  reactions,
  onPortrait,
  onReaction,
  onRemove,
  onToggleShop,
  onAssignMerchantAndOpen,
  onDragCombatToken,
  campaignShops,
  isShopOpen,
  isShopBusy,
  linkedToStageFaction = false,
}: {
  npc: CampaignNpc;
  isSingle: boolean;
  isGM: boolean;
  isCombatMode: boolean;
  isInInitiative: boolean;
  isActiveTurn?: boolean;
  isUpdating: boolean;
  reputationScore: number;
  reactions: ActiveNpcReaction[];
  onPortrait: (portrait: StagePortraitModal) => void;
  onReaction: (npcId: string, amount: number) => void;
  onRemove: (npcId: string) => void;
  onToggleShop: (npc: CampaignNpc) => void;
  onAssignMerchantAndOpen: (npc: CampaignNpc, shopId: string) => void;
  onDragCombatToken: (event: DragEvent<HTMLElement>, token: CombatTokenPayload) => void;
  campaignShops: LiveCampaignShopOption[];
  isShopOpen: boolean;
  isShopBusy: boolean;
  linkedToStageFaction?: boolean;
}) {
  const showGlow = useTemporaryStageGlow();
  const cardTitle = [npc.name, npc.title].filter(Boolean).join(" — ");
  const glowColor = linkedToStageFaction
    ? getStageCardGlowColor("faction")
    : getStageCardGlowColor("npc");
  const canDragToInitiative = isGM && isCombatMode && !isInInitiative;

  return (
    <motion.div
      draggable={canDragToInitiative}
      onDragStart={(e) => {
        if (!canDragToInitiative) return;
        onDragCombatToken(e as unknown as DragEvent<HTMLElement>, buildNpcCombatToken(npc));
      }}
      className={`group relative isolate aspect-3/4 w-full max-h-[min(48vh,380px)] overflow-visible rounded-lg transition-transform duration-200 hover:z-10 hover:scale-[1.02] ${
        isSingle ? "max-w-xs" : ""
      } ${npc.image_url ? "cursor-zoom-in" : "cursor-default"} ${
        canDragToInitiative ? "cursor-grab active:cursor-grabbing" : ""
      } ${isInInitiative ? "ring-2 ring-accent-gold/50" : ""} ${
        isActiveTurn
          ? "ring-4 ring-accent-gold shadow-[0_0_28px_rgba(202,185,38,0.75)]"
          : ""
      } ${
        linkedToStageFaction ? "ring-2 ring-accent-gold/70" : ""
      }`}
      initial={{ opacity: 0, scale: 1.5, y: 200, rotateZ: -15 }}
      animate={
        isCombatMode
          ? { opacity: 1, scale: 0.7, y: 80, rotateZ: 0 }
          : { opacity: 1, scale: 1, y: 0, rotateZ: 0 }
      }
      exit={{
        opacity: 0,
        scale: 0.8,
        y: -50,
        transition: { duration: 0.2 },
      }}
      transition={{ type: "spring", stiffness: 260, damping: 20, mass: 1 }}
    >
      <div
        className="animated-border-box"
        style={
          {
            opacity: showGlow ? 1 : 0,
            "--glow-color": glowColor,
          } as StageCardGlowStyle
        }
      />
      <div className="relative h-full overflow-hidden rounded-lg border-2 border-amber-900/70 bg-background-dark shadow-2xl hover:border-accent-gold/80">
        <button
          type="button"
          title={cardTitle}
          aria-label={`Porträt: ${npc.name}`}
          onClick={() => {
            if (npc.image_url) {
              onPortrait({
                name: npc.name,
                subtitle: npc.title,
                imageUrl: npc.image_url,
              });
            }
          }}
          className="absolute inset-0 h-full w-full focus:outline-none"
        >
          {npc.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Session-Bühnen-Karte
            <img
              src={npc.image_url}
              alt=""
              className="pointer-events-none h-full w-full object-cover object-top"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-hero-dark/70">
              <span className="font-cinzel text-5xl text-accent-gold">
                {npc.name[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </button>

        {isActiveTurn ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center">
            <span className="rounded-full border border-accent-gold bg-accent-gold/25 px-3 py-1 font-barlow text-[10px] font-extrabold uppercase tracking-wide text-accent-gold shadow-[0_0_16px_rgba(202,185,38,0.65)] backdrop-blur-sm">
              Am Zug
            </span>
          </div>
        ) : null}

        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="pointer-events-none absolute left-1/2 top-8 z-20 -translate-x-1/2 animate-[npc-reaction-float_3s_ease-out_forwards] text-6xl drop-shadow-[0_0_18px_rgba(0,0,0,0.85)]"
          >
            {reaction.emoji}
          </div>
        ))}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/40 to-transparent p-3">
          <p className="truncate font-barlow text-sm font-bold uppercase text-white">
            {npc.name}
          </p>
          {npc.title && (
            <p className="truncate font-libre text-[10px] text-gray-300">
              {npc.title}
            </p>
          )}
        </div>

        {isGM && (
          <div className="absolute inset-x-2 top-2 z-30 flex items-start justify-between gap-2">
            {canDragToInitiative ? (
              <span className="pointer-events-none rounded-full border border-accent-gold/50 bg-black/70 px-2 py-0.5 font-barlow text-[9px] font-extrabold uppercase text-accent-gold shadow-lg backdrop-blur">
                → Initiative
              </span>
            ) : isInInitiative ? (
              <span className="pointer-events-none rounded-full border border-accent-gold/60 bg-accent-gold/15 px-2 py-0.5 font-barlow text-[9px] font-extrabold uppercase text-accent-gold shadow-lg backdrop-blur">
                In Initiative
              </span>
            ) : (
              <span />
            )}
            <div className="flex items-center overflow-hidden rounded-full border border-amber-900/70 bg-background-dark/90 shadow-lg backdrop-blur">
            <button
              type="button"
              aria-label={`Ruf bei ${npc.name} senken`}
              onClick={(e) => {
                e.stopPropagation();
                onReaction(String(npc.id), -5);
              }}
              disabled={isUpdating}
                className="flex h-8 w-8 items-center justify-center bg-red-950/90 font-barlow text-sm font-bold text-red-300 hover:bg-red-900 disabled:opacity-50"
            >
              -
            </button>
              <span
                className="flex min-w-[3.25rem] items-center justify-center px-1.5 font-barlow text-sm font-extrabold tabular-nums leading-none text-accent-gold"
                title={`Ruf ${formatNpcReputationScore(reputationScore)}`}
                aria-label={`Ruf ${formatNpcReputationScore(reputationScore)}`}
              >
                {formatNpcReputationScore(reputationScore)}
              </span>
            <button
              type="button"
              aria-label={`Ruf bei ${npc.name} erhöhen`}
              onClick={(e) => {
                e.stopPropagation();
                onReaction(String(npc.id), 5);
              }}
              disabled={isUpdating}
                className="flex h-8 w-8 items-center justify-center bg-emerald-950/90 font-barlow text-sm font-bold text-hero-vibrant hover:bg-emerald-900 disabled:opacity-50"
            >
              +
            </button>
            </div>
            <button
              type="button"
              aria-label={`${npc.name} von der Bühne entfernen`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(String(npc.id));
              }}
              className="grid h-8 w-8 place-items-center rounded-full border border-red-700/70 bg-red-950/90 text-red-200 shadow-lg backdrop-blur transition-colors hover:bg-red-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            {isGM ? (
              <StageNpcShopControls
                npcName={npc.name}
                isMerchant={Boolean(npc.is_merchant && npc.shop_id)}
                isShopOpen={isShopOpen}
                shops={campaignShops}
                isBusy={isShopBusy}
                onAssignAndOpen={(shopId) => onAssignMerchantAndOpen(npc, shopId)}
                onToggleShop={() => onToggleShop(npc)}
              />
            ) : null}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StageFactionCard({
  faction,
  isSingle,
  isGM,
  isCombatMode,
  campaignId,
  onPortrait,
  onRemove,
}: {
  faction: CampaignFaction;
  isSingle: boolean;
  isGM: boolean;
  isCombatMode: boolean;
  campaignId: string;
  onPortrait: (portrait: StagePortraitModal) => void;
  onRemove: (factionId: string) => void;
}) {
  const showGlow = useTemporaryStageGlow();
  const cardTitle = [faction.name, faction.type].filter(Boolean).join(" — ");
  const glowColor = getStageCardGlowColor("faction");
  const statusVisual = getFactionStatusVisual(faction.current_status);
  const bannerDisplay = normalizeImageDisplay(faction.banner_display ?? null);
  const emblemDisplay = normalizeImageDisplay(faction.image_display ?? null);
  const stageImageUrl = faction.banner_url || faction.image_url;

  return (
    <motion.div
      className={`group relative isolate aspect-3/4 w-full max-h-[min(42vh,320px)] overflow-visible rounded-lg transition-transform duration-200 hover:z-10 hover:scale-[1.02] ${
        isSingle ? "max-w-xs" : ""
      } ${stageImageUrl ? "cursor-zoom-in" : "cursor-default"}`}
      initial={{ opacity: 0, scale: 1.5, y: 200, rotateZ: -15 }}
      animate={
        isCombatMode
          ? { opacity: 1, scale: 0.7, y: 80, rotateZ: 0 }
          : { opacity: 1, scale: 1, y: 0, rotateZ: 0 }
      }
      exit={{
        opacity: 0,
        scale: 0.8,
        y: -50,
        transition: { duration: 0.2 },
      }}
      transition={{ type: "spring", stiffness: 260, damping: 20, mass: 1 }}
    >
      <div
        className="animated-border-box"
        style={
          {
            opacity: showGlow ? 1 : 0,
            "--glow-color": glowColor,
          } as StageCardGlowStyle
        }
      />
      <button
        type="button"
        title={cardTitle}
        aria-label={`Fraktion: ${faction.name}`}
        onClick={() => {
          if (faction.banner_url) {
            onPortrait({
              name: faction.name,
              subtitle: faction.type,
              imageUrl: faction.banner_url,
            });
          }
        }}
        className="relative h-full w-full overflow-hidden rounded-lg border-2 border-amber-800/70 bg-amber-950/40 shadow-lg hover:border-amber-500/80"
      >
        {faction.banner_url ? (
          <div
            className="pointer-events-none h-full w-full"
            style={imageDisplayBackdropStyle(bannerDisplay)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Session-Bühnen-Karte */}
            <img
              src={faction.banner_url}
              alt=""
              className="h-full w-full"
              style={imageDisplayObjectStyle(bannerDisplay)}
            />
          </div>
        ) : faction.image_url ? (
          <div
            className="pointer-events-none h-full w-full"
            style={imageDisplayBackdropStyle(emblemDisplay)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Session-Bühnen-Karte Fallback */}
            <img
              src={faction.image_url}
              alt=""
              className="h-full w-full"
              style={imageDisplayObjectStyle(emblemDisplay)}
            />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-amber-950/50">
            <Flag className="h-14 w-14 text-accent-gold/90" />
          </div>
        )}
        {faction.image_url && faction.banner_url ? (
          <div
            className="pointer-events-none absolute left-2 top-2 z-10 h-10 w-10 overflow-hidden rounded border border-amber-200/70 bg-black/50 shadow-md"
            style={imageDisplayBackdropStyle(emblemDisplay)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Wappen-Overlay */}
            <img
              src={faction.image_url}
              alt=""
              className="h-full w-full"
              style={imageDisplayObjectStyle(emblemDisplay)}
            />
          </div>
        ) : null}
      </button>
      {statusVisual ? (
        <span
          className={`pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-1 rounded-full border border-black/40 bg-black/70 px-2 py-1 backdrop-blur ${statusVisual.color}`}
          title={statusVisual.label}
        >
          <statusVisual.Icon className="h-3.5 w-3.5" />
          <span className="font-barlow text-[9px] font-bold uppercase">{statusVisual.label}</span>
        </span>
      ) : null}
      {!isGM ? (
        <StageFactionPlayerNotesButton
          campaignId={campaignId}
          factionId={String(faction.id)}
          factionName={faction.name}
        />
      ) : null}
      {isGM ? (
        <button
          type="button"
          aria-label={`${faction.name} von der Bühne entfernen`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(String(faction.id));
          }}
          className="absolute right-2 top-2 z-30 grid h-8 w-8 place-items-center rounded-full border border-red-700/70 bg-red-950/90 text-red-200 shadow-lg backdrop-blur transition-colors hover:bg-red-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </motion.div>
  );
}

const WEATHER_ICON_BASE_PATH = "/images/Session_ui/Wetter_icons";

const WEATHER_ICON_OPTIONS: WeatherIconOption[] = WEATHER_PRESET_ORDER.map((id) => {
  const meta = WEATHER_PRESETS[id];
  const fallbackById: Record<WeatherPresetId, { Icon: LucideIcon; className: string; keywords: string[] }> = {
    blizzard: {
      Icon: Snowflake,
      className: "bg-cyan-950 text-cyan-200 border-cyan-400/70",
      keywords: ["blizzard", "whiteout", "schneesturm", "ice", "eis"],
    },
    storm: {
      Icon: CloudLightning,
      className: "bg-purple-950 text-purple-200 border-purple-500/70",
      keywords: ["gewitter", "storm", "thunder", "blitz", "unwetter"],
    },
    heavy_wind: {
      Icon: Cloud,
      className: "bg-teal-950 text-teal-200 border-teal-400/70",
      keywords: ["wind", "orkan", "brise", "böe"],
    },
    clouds: {
      Icon: Cloud,
      className: "bg-slate-800 text-slate-200 border-slate-500/70",
      keywords: ["wolke", "cloud", "cloudy", "bewölkt", "nebel", "fog", "dunst"],
    },
    rain: {
      Icon: CloudRain,
      className: "bg-blue-950 text-blue-200 border-blue-500/70",
      keywords: ["regen", "rain", "shower"],
    },
    snow: {
      Icon: Snowflake,
      className: "bg-cyan-950 text-cyan-200 border-cyan-400/70",
      keywords: ["schnee", "snow"],
    },
    sun: {
      Icon: Sun,
      className: "bg-yellow-900 text-yellow-200 border-yellow-400/70",
      keywords: ["sonne", "sun", "sunny", "klar", "clear", "heiter"],
    },
    sun_clouds: {
      Icon: Sun,
      className: "bg-amber-900 text-amber-200 border-amber-400/70",
      keywords: ["sonne wolken", "sun clouds", "wechselhaft"],
    },
  };
  const fallback = fallbackById[id];
  return {
    id,
    label: meta.label,
    src: `${WEATHER_ICON_BASE_PATH}/${meta.iconFilename}`,
    FallbackIcon: fallback.Icon,
    className: fallback.className,
    keywords: fallback.keywords,
  };
});

type LoreLocationOption = {
  id: string;
  name: string;
  type: string | null;
  image_url?: string | null;
  default_image_url?: string | null;
};

type ActiveQuest = {
  id: string;
  title: string;
  description: string | null;
  rewards: string | null;
  type: string | null;
  quest_giver?: { id: string; name: string | null } | null;
  location?: { id: string; name: string | null } | null;
};

type Props = {
  sessionId: string;
  campaignId: string;
  worldId: string | null;
  sessionStatus: string;
  isGM: boolean;
  isGuest?: boolean;
  guestDisplayName?: string;
  guestSlotIndex?: number;
  forcePlayerView?: boolean;
  userId: string;
  initialLiveState: LiveState | null;
  partyCharacters: PartyCharacter[];
  allCampaignNpcs: CampaignNpc[];
  allCampaignCreatures?: CampaignCreature[];
  allCampaignFactions: CampaignFaction[];
  /** null = alle NPCs im Stage Manager */
  stageDeckNpcIds: string[] | null;
  /** null = alle Kreaturen im Stage Manager */
  stageDeckCreatureIds?: string[] | null;
  /** null = alle Fraktionen im Stage Manager */
  stageDeckFactionIds: string[] | null;
  /** Kampagnen-Szenenbilder (Mediathek) */
  allSceneMedia?: StageSceneMediaItem[];
  /** null = alle Szenen im Deck */
  stageDeckSceneMediaIds?: string[] | null;
  /** Kampagnenweite Kreaturen-Entdeckungen & Besiegt */
  initialCreatureStates?: Record<string, CampaignCreatureStateRow>;
  activeQuests: ActiveQuest[];
  /** Nur GM: Orte aus Lore (isLocationType) für Dropdown */
  loreLocationOptions?: LoreLocationOption[];
  /** Spieler dürfen Lore-Link nur sehen, wenn Eintrag für sie revealed ist */
  sessionLocationLoreReadable?: boolean;
  /** Nur GM: Shop-Templates für schnelle Händler-Zuweisung auf der Bühne */
  campaignShops?: LiveCampaignShopOption[];
  transcriptionMode?: "table" | "jitsi" | null;
  /** Nur GM: Gäste-Join-Link für Foundry / Spieler ohne Account */
  guestJoinUrl?: string | null;
  campaignSystem?: string | null;
};

export function LiveSessionBoard({
  sessionId,
  campaignId,
  worldId,
  sessionStatus,
  isGM: actualUserIsGM,
  isGuest = false,
  guestDisplayName,
  guestSlotIndex,
  forcePlayerView = false,
  userId,
  initialLiveState,
  partyCharacters,
  allCampaignNpcs,
  allCampaignCreatures = [],
  allCampaignFactions,
  stageDeckNpcIds,
  stageDeckCreatureIds = null,
  stageDeckFactionIds,
  allSceneMedia = [],
  stageDeckSceneMediaIds = null,
  initialCreatureStates = {},
  activeQuests,
  loreLocationOptions = [],
  sessionLocationLoreReadable = false,
  campaignShops = [],
  transcriptionMode = null,
  guestJoinUrl = null,
  campaignSystem = null,
}: Props) {
  const router = useRouter();
  /** Cookie-Session (RLS): nicht supabaseClient.ts (nur Anon ohne Auth). */
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const liveChannelRef = useRef<RealtimeChannel | null>(null);
  const isGM = actualUserIsGM && !forcePlayerView;

  const viableInitial =
    initialLiveState != null &&
    isViableLiveState(initialLiveState, sessionId);

  const [liveState, setLiveState] = useState<LiveState | null>(
    viableInitial ? normalizeLiveRow(initialLiveState as unknown) : null,
  );
  const liveStateRef = useRef<LiveState | null>(
    viableInitial ? normalizeLiveRow(initialLiveState as unknown) : null,
  );
  const [isLiveStateInitializing, setIsLiveStateInitializing] = useState(
    !viableInitial && isGM,
  );
  const [liveStateLoadError, setLiveStateLoadError] = useState<string | null>(
    null,
  );
  const [inventoryCharacter, setInventoryCharacter] =
    useState<PartyCharacter | null>(null);
  const [sheetCharacter, setSheetCharacter] = useState<PartyCharacter | null>(null);
  const showDnd5eSheet = isDnd5eCampaignSystem(campaignSystem);
  const [fateGmSettingsOpen, setFateGmSettingsOpen] = useState(false);
  const [leftPanel, setLeftPanel] = useState<LeftPanelId | null>(null);
  const [topPanel, setTopPanel] = useState<TopToolbarPanelId | null>(null);
  const [stageRosterOpen, setStageRosterOpen] = useState(true);
  const [stageDeckHandOpen, setStageDeckHandOpen] = useState(true);
  const [sessionBattlemaps, setSessionBattlemaps] = useState<SessionBattlemap[]>([]);
  const [availableWorldMaps, setAvailableWorldMaps] = useState<WorldMap[]>([]);
  const [sessionWorldMapLinks, setSessionWorldMapLinks] = useState<SessionWorldMap[]>([]);
  const [battlemapTokens, setBattlemapTokens] = useState<SessionBattlemapToken[]>([]);
  const [battlemapProps, setBattlemapProps] = useState<SessionBattlemapProp[]>([]);
  const [battlemapFogShapes, setBattlemapFogShapes] = useState<SessionBattlemapFogShape[]>([]);
  const [battlemapEffectTemplates, setBattlemapEffectTemplates] = useState<
    SessionBattlemapEffectTemplate[]
  >([]);
  const [battlemapMarkers, setBattlemapMarkers] = useState<SessionBattlemapMarker[]>([]);
  const [battlemapTraps, setBattlemapTraps] = useState<SessionBattlemapTrap[]>([]);
  const [fogTool, setFogTool] = useState<BattlemapFogTool>(null);
  const [effectTool, setEffectTool] = useState<BattlemapEffectTool>(null);
  const [markerTool, setMarkerTool] = useState<BattlemapMarkerTool>(null);
  const [trapTool, setTrapTool] = useState<BattlemapTrapTool>(null);
  const [selectedFogShapeId, setSelectedFogShapeId] = useState<string | null>(null);
  const [selectedEffectTemplateId, setSelectedEffectTemplateId] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedTrapId, setSelectedTrapId] = useState<string | null>(null);
  const [trapWizardCell, setTrapWizardCell] = useState<{
    gridX: number;
    gridY: number;
  } | null>(null);
  const [trapTriggerEvent, setTrapTriggerEvent] = useState<{
    trap: SessionBattlemapTrap;
    characterName: string;
    characterId: string;
    passivePerception: number;
  } | null>(null);
  const [tokenPlacement, setTokenPlacement] = useState<CharacterTokenPlacement | null>(null);
  const [gmTokenPlacement, setGmTokenPlacement] = useState<GmTokenPlacementDraft | null>(null);
  const [gmMoveTokenId, setGmMoveTokenId] = useState<string | null>(null);
  const [selectedBattlemapTokenId, setSelectedBattlemapTokenId] = useState<string | null>(null);
  const [selectedBattlemapPropId, setSelectedBattlemapPropId] = useState<string | null>(null);
  const [tokenRadial, setTokenRadial] = useState<{
    token: SessionBattlemapToken;
    x: number;
    y: number;
  } | null>(null);
  const [activeTranscriptionMode, setActiveTranscriptionMode] = useState<
    TranscriptionMode | null
  >(transcriptionMode);
  const [npcMerchantOverrides, setNpcMerchantOverrides] = useState<
    Record<string, { is_merchant: boolean; shop_id: string | null }>
  >({});
  const [isShopBusy, startShopTransition] = useTransition();

  const campaignNpcs = useMemo(
    () =>
      allCampaignNpcs.map((npc) => {
        const patch = npcMerchantOverrides[String(npc.id)];
        return patch
          ? {
              ...npc,
              is_merchant: patch.is_merchant,
              shop_id: patch.shop_id,
            }
          : npc;
      }),
    [allCampaignNpcs, npcMerchantOverrides],
  );

  const campaignCreatures = useMemo(() => allCampaignCreatures, [allCampaignCreatures]);

  const activeBattlemapId = liveState?.active_battlemap_id ?? null;
  const activeWorldMapId = liveState?.active_world_map_id ?? null;
  const activeBattlemap = useMemo(
    () => sessionBattlemaps.find((m) => m.id === activeBattlemapId) ?? null,
    [sessionBattlemaps, activeBattlemapId],
  );
  const battlemapActive = Boolean(activeBattlemap);

  // --- Preload assets when joining (show loading screen until done) ---
  const preloadManifest = useMemo(() => {
    if (!liveState) return null;
    return {
      backgroundUrl: liveState.background_url || null,
      battlemapUrl: activeBattlemap?.image_url || null,
      npcPortraits: (liveState.visible_npc_ids ?? [])
        .map((id: string) => allCampaignNpcs.find((n) => String(n.id) === id)?.image_url)
        .filter(Boolean) as string[],
      characterPortraits: partyCharacters
        .map((c) => c.avatar_url)
        .filter(Boolean) as string[],
      weatherIcons: true,
      diceAssets: true,
    };
  }, [liveState, activeBattlemap, allCampaignNpcs, partyCharacters]);

  const preload = usePreloadSessionAssets(preloadManifest);
  const [preloadDismissed, setPreloadDismissed] = useState(false);
  const showLoadingScreen =
    !preloadDismissed && !preload.done && preloadManifest !== null;

  useEffect(() => {
    if (preload.done && !preloadDismissed) {
      const t = window.setTimeout(() => setPreloadDismissed(true), 400);
      return () => clearTimeout(t);
    }
  }, [preload.done, preloadDismissed]);

  useEffect(() => {
    const t = window.setTimeout(() => setPreloadDismissed(true), 4500);
    return () => window.clearTimeout(t);
  }, []);

  // Nach dem Ladebalken: Token-Bilder still im Hintergrund warmhalten
  useEffect(() => {
    if (!preload.done || battlemapTokens.length === 0) return;
    const urls = new Set<string>();
    for (const t of battlemapTokens) {
      if (t.image_url) urls.add(t.image_url);
    }
    for (const url of urls) {
      const img = new window.Image();
      img.decoding = "async";
      img.src = url;
    }
  }, [preload.done, battlemapTokens]);

  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;
    void getSessionBattlemaps(sessionId)
      .then((maps) => {
        if (!cancelled) setSessionBattlemaps(maps);
      })
      .catch(() => {
        /* optional: maps not migrated yet */
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, isGuest]);

  useEffect(() => {
    if (isGuest || !worldId) {
      setAvailableWorldMaps([]);
      setSessionWorldMapLinks([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      getWorldMaps(worldId).catch(() => [] as WorldMap[]),
      getSessionWorldMaps(sessionId).catch(() => [] as SessionWorldMap[]),
    ]).then(([maps, links]) => {
      if (cancelled) return;
      setAvailableWorldMaps(maps);
      setSessionWorldMapLinks(links);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, worldId, isGuest]);

  useEffect(() => {
    if (isGuest || !activeBattlemapId) {
      setBattlemapTokens([]);
      return;
    }
    let cancelled = false;

    async function loadTokens() {
      const { data, error } = await (supabase as any)
        .from("session_battlemap_tokens")
        .select("*")
        .eq("battlemap_id", activeBattlemapId)
        .order("created_at", { ascending: true });
      if (!cancelled && !error) {
        setBattlemapTokens(
          (data ?? []).map((row: Record<string, unknown>) => mapBattlemapTokenRow(row)),
        );
      }
    }

    void loadTokens();

    const channel = supabase
      .channel(`session_battlemap_tokens_${activeBattlemapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_battlemap_tokens",
          filter: `battlemap_id=eq.${activeBattlemapId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "DELETE") {
            const oldId =
              payload.old && typeof payload.old === "object" && "id" in payload.old
                ? String((payload.old as { id: unknown }).id)
                : "";
            if (oldId) {
              setBattlemapTokens((prev) => prev.filter((t) => t.id !== oldId));
            } else {
              void loadTokens();
            }
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row?.id) {
            void loadTokens();
            return;
          }
          const token = mapBattlemapTokenRow(row);
          setBattlemapTokens((prev) => upsertBattlemapToken(prev, token));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeBattlemapId, isGuest, supabase]);

  // Sofort-Sync über Session-Broadcast (Tokens + Charakter-Zustände)
  useEffect(() => {
    if (isGuest) return;
    function onLocalCharacterDisplay(e: Event) {
      const detail = (e as CustomEvent<CharacterDisplayChangedDetail>).detail;
      if (!detail?.characterId || detail.remote) return;
      void liveChannelRef.current?.send({
        type: "broadcast",
        event: CHARACTER_DISPLAY_CHANGED_BROADCAST,
        payload: {
          characterId: detail.characterId,
          snapshot: detail.snapshot ?? null,
          senderId: userId,
        },
      });
    }
    window.addEventListener(CHARACTER_DISPLAY_CHANGED_EVENT, onLocalCharacterDisplay);
    return () => {
      window.removeEventListener(
        CHARACTER_DISPLAY_CHANGED_EVENT,
        onLocalCharacterDisplay,
      );
    };
  }, [isGuest, userId]);

  const notifyBattlemapTokensChanged = useCallback(
    (detail?: {
      op?: BattlemapTokensChangedDetail["op"];
      token?: SessionBattlemapToken | null;
      tokenId?: string | null;
    }) => {
      if (!activeBattlemapId) return;
      const op =
        detail?.op ??
        (detail?.token ? "upsert" : detail?.tokenId ? "delete" : "refresh");
      void liveChannelRef.current?.send({
        type: "broadcast",
        event: BATTLEMAP_TOKENS_CHANGED_BROADCAST,
        payload: {
          battlemapId: activeBattlemapId,
          op,
          token: detail?.token
            ? ({ ...detail.token } as unknown as Record<string, unknown>)
            : null,
          tokenId: detail?.tokenId ?? detail?.token?.id ?? null,
          senderId: userId,
        } satisfies BattlemapTokensChangedDetail,
      });
    },
    [activeBattlemapId, userId],
  );

  const notifyBattlemapFogChanged = useCallback(
    (detail?: {
      op?: BattlemapFogChangedDetail["op"];
      shape?: SessionBattlemapFogShape | null;
      shapeId?: string | null;
    }) => {
      if (!activeBattlemapId) return;
      const op =
        detail?.op ??
        (detail?.shape ? "upsert" : detail?.shapeId ? "delete" : "refresh");
      void liveChannelRef.current?.send({
        type: "broadcast",
        event: BATTLEMAP_FOG_CHANGED_BROADCAST,
        payload: {
          battlemapId: activeBattlemapId,
          op,
          shape: detail?.shape
            ? ({ ...detail.shape } as unknown as Record<string, unknown>)
            : null,
          shapeId: detail?.shapeId ?? detail?.shape?.id ?? null,
          senderId: userId,
        } satisfies BattlemapFogChangedDetail,
      });
    },
    [activeBattlemapId, userId],
  );

  const notifyBattlemapEffectChanged = useCallback(
    (detail?: {
      op?: BattlemapEffectChangedDetail["op"];
      template?: SessionBattlemapEffectTemplate | null;
      templateId?: string | null;
    }) => {
      if (!activeBattlemapId) return;
      const op =
        detail?.op ??
        (detail?.template ? "upsert" : detail?.templateId ? "delete" : "refresh");
      void liveChannelRef.current?.send({
        type: "broadcast",
        event: BATTLEMAP_EFFECT_CHANGED_BROADCAST,
        payload: {
          battlemapId: activeBattlemapId,
          op,
          template: detail?.template
            ? ({ ...detail.template } as unknown as Record<string, unknown>)
            : null,
          templateId: detail?.templateId ?? detail?.template?.id ?? null,
          senderId: userId,
        } satisfies BattlemapEffectChangedDetail,
      });
    },
    [activeBattlemapId, userId],
  );

  useEffect(() => {
    if (isGuest || !activeBattlemapId) {
      setBattlemapFogShapes([]);
      setSelectedFogShapeId(null);
      return;
    }
    let cancelled = false;

    async function loadFog() {
      try {
        const shapes = await listBattlemapFogShapes(activeBattlemapId!, sessionId);
        if (!cancelled) setBattlemapFogShapes(shapes);
      } catch {
        if (!cancelled) setBattlemapFogShapes([]);
      }
    }

    void loadFog();

    const channel = supabase
      .channel(`session_battlemap_fog_${activeBattlemapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_battlemap_fog_shapes",
          filter: `battlemap_id=eq.${activeBattlemapId}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          if (eventType === "DELETE") {
            const oldId =
              payload.old && typeof payload.old === "object" && "id" in payload.old
                ? String((payload.old as { id: unknown }).id)
                : "";
            if (oldId) {
              setBattlemapFogShapes((prev) => prev.filter((s) => s.id !== oldId));
              setSelectedFogShapeId((prev) => (prev === oldId ? null : prev));
            }
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row?.id) {
            void loadFog();
            return;
          }
          const shape: SessionBattlemapFogShape = {
            id: String(row.id),
            battlemap_id: String(row.battlemap_id),
            session_id: String(row.session_id),
            campaign_id: String(row.campaign_id),
            shape: row.shape === "circle" ? "circle" : "rect",
            grid_x: Math.round(Number(row.grid_x ?? 0)),
            grid_y: Math.round(Number(row.grid_y ?? 0)),
            grid_w: Math.max(1, Math.round(Number(row.grid_w ?? 1))),
            grid_h: Math.max(1, Math.round(Number(row.grid_h ?? 1))),
            z_index: Math.round(Number(row.z_index ?? 0)),
          };
          setBattlemapFogShapes((prev) => {
            const idx = prev.findIndex((s) => s.id === shape.id);
            if (idx < 0) return [...prev, shape];
            const next = [...prev];
            next[idx] = shape;
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeBattlemapId, isGuest, sessionId, supabase]);

  useEffect(() => {
    if (isGuest || !activeBattlemapId) {
      setBattlemapEffectTemplates([]);
      setSelectedEffectTemplateId(null);
      return;
    }
    let cancelled = false;

    async function loadEffects() {
      try {
        const templates = await listBattlemapEffectTemplates(activeBattlemapId!, sessionId);
        if (!cancelled) setBattlemapEffectTemplates(templates);
      } catch {
        if (!cancelled) setBattlemapEffectTemplates([]);
      }
    }

    void loadEffects();

    const channel = supabase
      .channel(`session_battlemap_effects_${activeBattlemapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_battlemap_effect_templates",
          filter: `battlemap_id=eq.${activeBattlemapId}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          if (eventType === "DELETE") {
            const oldId =
              payload.old && typeof payload.old === "object" && "id" in payload.old
                ? String((payload.old as { id: unknown }).id)
                : "";
            if (oldId) {
              setBattlemapEffectTemplates((prev) => prev.filter((t) => t.id !== oldId));
              setSelectedEffectTemplateId((prev) => (prev === oldId ? null : prev));
            }
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row?.id) {
            void loadEffects();
            return;
          }
          const shapeRaw = String(row.shape ?? "rect");
          const template: SessionBattlemapEffectTemplate = {
            id: String(row.id),
            battlemap_id: String(row.battlemap_id),
            session_id: String(row.session_id),
            campaign_id: String(row.campaign_id),
            shape: shapeRaw === "circle" ? "circle" : shapeRaw === "cone" ? "cone" : "rect",
            grid_x: Math.round(Number(row.grid_x ?? 0)),
            grid_y: Math.round(Number(row.grid_y ?? 0)),
            grid_w: Math.max(1, Math.round(Number(row.grid_w ?? 1))),
            grid_h: Math.max(1, Math.round(Number(row.grid_h ?? 1))),
            direction_deg: Math.round(Number(row.direction_deg ?? 0)) % 360,
            z_index: Math.round(Number(row.z_index ?? 0)),
          };
          setBattlemapEffectTemplates((prev) => {
            const idx = prev.findIndex((t) => t.id === template.id);
            if (idx < 0) return [...prev, template];
            const next = [...prev];
            next[idx] = template;
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeBattlemapId, isGuest, sessionId, supabase]);

  useEffect(() => {
    if (isGuest || !activeBattlemapId) {
      setBattlemapMarkers([]);
      setSelectedMarkerId(null);
      return;
    }
    let cancelled = false;

    async function loadMarkers() {
      try {
        const list = await listBattlemapMarkers(activeBattlemapId!, sessionId);
        if (!cancelled) setBattlemapMarkers(list);
      } catch {
        if (!cancelled) setBattlemapMarkers([]);
      }
    }

    void loadMarkers();

    const channel = supabase
      .channel(`session_battlemap_markers_${activeBattlemapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_battlemap_markers",
          filter: `battlemap_id=eq.${activeBattlemapId}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          if (eventType === "DELETE") {
            const oldId =
              payload.old && typeof payload.old === "object" && "id" in payload.old
                ? String((payload.old as { id: unknown }).id)
                : "";
            if (oldId) {
              setBattlemapMarkers((prev) => prev.filter((m) => m.id !== oldId));
              setSelectedMarkerId((prev) => (prev === oldId ? null : prev));
            }
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row?.id) {
            void loadMarkers();
            return;
          }
          const kindRaw = String(row.kind ?? "fire");
          const kind: BattlemapMarkerKind = (
            BATTLEMAP_MARKER_KINDS as readonly string[]
          ).includes(kindRaw)
            ? (kindRaw as BattlemapMarkerKind)
            : "fire";
          const marker: SessionBattlemapMarker = {
            id: String(row.id),
            battlemap_id: String(row.battlemap_id),
            session_id: String(row.session_id),
            campaign_id: String(row.campaign_id),
            kind,
            grid_x: Math.round(Number(row.grid_x ?? 0)),
            grid_y: Math.round(Number(row.grid_y ?? 0)),
            is_visible_to_players: row.is_visible_to_players !== false,
            z_index: Math.round(Number(row.z_index ?? 0)),
          };
          setBattlemapMarkers((prev) => {
            const idx = prev.findIndex((m) => m.id === marker.id);
            if (idx < 0) return [...prev, marker];
            const next = [...prev];
            next[idx] = marker;
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeBattlemapId, isGuest, sessionId, supabase]);

  useEffect(() => {
    if (isGuest || !activeBattlemapId) {
      setBattlemapTraps([]);
      setSelectedTrapId(null);
      return;
    }
    let cancelled = false;

    async function loadTraps() {
      try {
        const list = await listBattlemapTraps(activeBattlemapId!, sessionId);
        if (!cancelled) setBattlemapTraps(list);
      } catch {
        if (!cancelled) setBattlemapTraps([]);
      }
    }

    void loadTraps();

    const channel = supabase
      .channel(`session_battlemap_traps_${activeBattlemapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_battlemap_traps",
          filter: `battlemap_id=eq.${activeBattlemapId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "DELETE") {
            const oldId =
              payload.old && typeof payload.old === "object" && "id" in payload.old
                ? String((payload.old as { id: unknown }).id)
                : "";
            if (oldId) {
              setBattlemapTraps((prev) => prev.filter((t) => t.id !== oldId));
              setSelectedTrapId((prev) => (prev === oldId ? null : prev));
            } else {
              void loadTraps();
            }
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row?.id) {
            void loadTraps();
            return;
          }
          const trap = mapBattlemapTrapRow(row);
          setBattlemapTraps((prev) => upsertBattlemapTrap(prev, trap));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeBattlemapId, isGuest, sessionId, supabase]);

  useEffect(() => {
    if (isGuest || !activeBattlemapId) {
      setBattlemapProps([]);
      return;
    }
    let cancelled = false;

    async function loadProps() {
      const { data, error } = await (supabase as any)
        .from("session_battlemap_props")
        .select("*")
        .eq("battlemap_id", activeBattlemapId)
        .order("z_index", { ascending: true })
        .order("created_at", { ascending: true });
      if (!cancelled && !error) {
        setBattlemapProps(
          (data ?? []).map((row: Record<string, unknown>) => mapBattlemapPropRow(row)),
        );
      }
    }

    void loadProps();

    const channel = supabase
      .channel(`session_battlemap_props_${activeBattlemapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_battlemap_props",
          filter: `battlemap_id=eq.${activeBattlemapId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "DELETE") {
            const oldId =
              payload.old && typeof payload.old === "object" && "id" in payload.old
                ? String((payload.old as { id: unknown }).id)
                : "";
            if (oldId) {
              setBattlemapProps((prev) => prev.filter((p) => p.id !== oldId));
            } else {
              void loadProps();
            }
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row?.id) {
            void loadProps();
            return;
          }
          const prop = mapBattlemapPropRow(row);
          setBattlemapProps((prev) => upsertBattlemapProp(prev, prop));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeBattlemapId, isGuest, supabase]);

  useEffect(() => {
    setActiveTranscriptionMode(transcriptionMode);
  }, [transcriptionMode]);

  useEffect(() => {
    liveStateRef.current = liveState;
  }, [liveState]);

  const resolveLiveStateBase = useCallback(async (): Promise<LiveState | null> => {
    setLiveStateLoadError(null);
    if (
      liveStateRef.current &&
      isViableLiveState(liveStateRef.current, sessionId)
    ) {
      setIsLiveStateInitializing(false);
      return normalizeLiveRow(liveStateRef.current);
    }

    if (isGM) {
      setIsLiveStateInitializing(true);
    }

    const { data, error } = await supabase
      .from("session_live_states")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      console.error("[LiveSessionBoard] session_live_states:", error.message);
      setLiveStateLoadError(error.message);
    }

    if (data) {
      const next = normalizeLiveRow(data);
      liveStateRef.current = next;
      setLiveState(next);
      setBackgroundUrl(next.background_url || null);
      setIsLiveStateInitializing(false);
      setLiveStateLoadError(null);
      return next;
    }

    if (isGM) {
      try {
        const row = await ensureSessionPrepLiveState(sessionId);
        if (row) {
          const next = normalizeLiveRow(row);
          liveStateRef.current = next;
          setLiveState(next);
          setBackgroundUrl(next.background_url || null);
          setIsLiveStateInitializing(false);
          setLiveStateLoadError(null);
          return next;
        }
        setLiveStateLoadError(
          "Live-State konnte nicht automatisch angelegt werden.",
        );
      } catch (e) {
        console.error("[resolveLiveStateBase] ensureSessionPrepLiveState", e);
        setLiveStateLoadError(
          e instanceof Error
            ? e.message
            : "Live-State konnte nicht automatisch angelegt werden.",
        );
      } finally {
        setIsLiveStateInitializing(false);
      }
    } else {
      setIsLiveStateInitializing(false);
      setLiveStateLoadError(
        "Der Session-Zustand ist noch nicht bereit. Bitte warte, bis der Spielleiter die Session vorbereitet hat.",
      );
    }

    return null;
  }, [sessionId, isGM, supabase]);

  const refreshLiveState = useCallback(async () => {
    const { data, error } = await supabase
      .from("session_live_states")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (!error && data) {
      const next = normalizeLiveRow(data);
      liveStateRef.current = next;
      setLiveState(next);
      setBackgroundUrl(next.background_url || null);
    }
  }, [sessionId, supabase]);

  const [isUpdating, startTransition] = useTransition();

  const startCharacterTokenPlacement = useCallback(
    (characterId: string, characterName: string) => {
      if (!activeBattlemapId) return;
      const existing = battlemapTokens.find((t) => t.character_id === characterId);
      startTransition(async () => {
        try {
          const range = await getCharacterMovementRange(characterId);
          setTokenPlacement({
            characterId,
            characterName,
            speedFt: range.speedFt,
            baseCells: range.baseCells,
            useDash: false,
            isFirstPlacement: !existing,
            originGridX: existing?.grid_x,
            originGridY: existing?.grid_y,
          });
          setGmTokenPlacement(null);
          setGmMoveTokenId(null);
          setSelectedBattlemapTokenId(null);
          setSelectedBattlemapPropId(null);
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Bewegungsreichweite konnte nicht geladen werden.",
          );
        }
      });
    },
    [activeBattlemapId, battlemapTokens, startTransition],
  );

  const handleBattlemapCellClick = useCallback(
    (gridX: number, gridY: number) => {
      if (!activeBattlemapId) return;

      if (gmMoveTokenId || gmTokenPlacement) {
        if (!isGM) return;
        const movingToken = gmMoveTokenId
          ? battlemapTokens.find((t) => t.id === gmMoveTokenId)
          : null;
        startTransition(async () => {
          try {
            const placed = await placeBattlemapGmToken({
              sessionId,
              battlemapId: activeBattlemapId,
              gridX,
              gridY,
              tokenId: gmMoveTokenId ?? undefined,
              npcId: gmTokenPlacement?.kind === "npc" ? gmTokenPlacement.refId : undefined,
              creatureId:
                gmTokenPlacement?.kind === "creature" ? gmTokenPlacement.refId : undefined,
              tokenSide: gmTokenPlacement?.tokenSide ?? movingToken?.token_side ?? "hostile",
              sizeCells: gmTokenPlacement?.sizeCells ?? movingToken?.size_cells ?? 1,
              isVisibleToPlayers:
                gmTokenPlacement?.isVisibleToPlayers ??
                movingToken?.is_visible_to_players ??
                true,
              label: gmTokenPlacement?.name ?? movingToken?.label ?? null,
              imageUrl: gmTokenPlacement?.imageUrl ?? movingToken?.image_url ?? null,
            });
            setBattlemapTokens((prev) => upsertBattlemapToken(prev, placed));
            notifyBattlemapTokensChanged({ op: "upsert", token: placed });
            toast.success(
              gmMoveTokenId ? "SL-Token verschoben." : `${gmTokenPlacement?.name ?? "Token"} platziert.`,
            );
            setGmTokenPlacement(null);
            setGmMoveTokenId(null);
            setSelectedBattlemapTokenId(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "SL-Token konnte nicht gesetzt werden.");
          }
        });
        return;
      }

      if (!tokenPlacement) return;
      if (!isGM && liveState?.battlemap_movement_paused) {
        toast.error("Bewegung ist pausiert — warte auf den Spielleiter.");
        return;
      }

      const existingToken = battlemapTokens.find(
        (t) => t.character_id === tokenPlacement.characterId,
      );
      if (
        !tokenPlacement.isFirstPlacement &&
        !isGM &&
        tokenPlacement.originGridX != null &&
        tokenPlacement.originGridY != null
      ) {
        const maxCells = movementCellsForBurst(
          tokenPlacement.baseCells,
          tokenPlacement.useDash,
        );
        if (
          !isWithinMovementRange(
            tokenPlacement.originGridX,
            tokenPlacement.originGridY,
            gridX,
            gridY,
            maxCells,
          )
        ) {
          toast.error(
            `Zu weit (${maxCells} Zellen erlaubt${tokenPlacement.useDash ? ", inkl. Dash" : ""}).`,
          );
          return;
        }
      }
      if (
        isCellBlockedByTokens(
          battlemapTokens,
          gridX,
          gridY,
          existingToken?.id,
        )
      ) {
        toast.error("Zelle ist blockiert.");
        return;
      }

      startTransition(async () => {
        try {
          const placed = await placeBattlemapCharacterToken({
            sessionId,
            battlemapId: activeBattlemapId,
            characterId: tokenPlacement.characterId,
            gridX,
            gridY,
            useDash: tokenPlacement.useDash,
          });
          setBattlemapTokens((prev) => upsertBattlemapToken(prev, placed));
          notifyBattlemapTokensChanged({ op: "upsert", token: placed });
          toast.success(
            tokenPlacement.isFirstPlacement
              ? `Token für ${tokenPlacement.characterName} gesetzt.`
              : `Token für ${tokenPlacement.characterName} bewegt.`,
          );
          setTokenPlacement(null);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Token konnte nicht gesetzt werden.");
        }
      });
    },
    [
      activeBattlemapId,
      battlemapTokens,
      gmMoveTokenId,
      gmTokenPlacement,
      isGM,
      liveState?.battlemap_movement_paused,
      notifyBattlemapTokensChanged,
      sessionId,
      startTransition,
      tokenPlacement,
    ],
  );

  const runTrapEnterCheck = useCallback(
    async (characterId: string, gridX: number, gridY: number) => {
      if (!activeBattlemapId) return;
      try {
        const result = await checkBattlemapTrapsOnEnter({
          sessionId,
          battlemapId: activeBattlemapId,
          characterId,
          gridX,
          gridY,
        });
        if (result.kind === "detected") {
          setBattlemapTraps((prev) => upsertBattlemapTrap(prev, result.trap));
          toast.message(
            `${result.characterName} bemerkt „${result.trap.name}“ (PP ${result.passivePerception} ≥ DC ${result.trap.detection_dc}).`,
          );
        } else if (result.kind === "triggered") {
          setBattlemapTraps((prev) => upsertBattlemapTrap(prev, result.trap));
          setLiveState((prev) => {
            if (!prev) return prev;
            const updated = normalizeLiveRow({
              ...prev,
              battlemap_movement_paused: true,
            });
            liveStateRef.current = updated;
            return updated;
          });
          setTrapTriggerEvent({
            trap: result.trap,
            characterName: result.characterName,
            characterId: result.characterId,
            passivePerception: result.passivePerception,
          });
          toast.error(`Falle „${result.trap.name}“ ausgelöst!`);
        }
      } catch {
        /* Trap-Check optional — Bewegung bleibt gültig */
      }
    },
    [activeBattlemapId, sessionId],
  );

  const handleBattlemapTokenMove = useCallback(
    (token: SessionBattlemapToken, gridX: number, gridY: number) => {
      if (!activeBattlemapId) return;
      if (token.grid_x === gridX && token.grid_y === gridY) return;

      const originGrid = { grid_x: token.grid_x, grid_y: token.grid_y };
      const applyLocalMove = (gx: number, gy: number) => {
        setBattlemapTokens((prev) =>
          prev.map((t) => (t.id === token.id ? { ...t, grid_x: gx, grid_y: gy } : t)),
        );
      };

      if (token.character_id) {
        if (!isGM && liveState?.battlemap_movement_paused) {
          toast.error("Bewegung ist pausiert — warte auf den Spielleiter.");
          return;
        }
        const characterId = token.character_id;
        const characterName = token.label ?? "Charakter";
        applyLocalMove(gridX, gridY);
        startTransition(async () => {
          try {
            const placed = await placeBattlemapCharacterToken({
              sessionId,
              battlemapId: activeBattlemapId,
              characterId,
              gridX,
              gridY,
              useDash: false,
            });
            setBattlemapTokens((prev) => upsertBattlemapToken(prev, placed));
            notifyBattlemapTokensChanged({ op: "upsert", token: placed });
            toast.success(`Token für ${characterName} bewegt.`);
            void runTrapEnterCheck(characterId, gridX, gridY);
          } catch (e) {
            applyLocalMove(originGrid.grid_x, originGrid.grid_y);
            toast.error(e instanceof Error ? e.message : "Token konnte nicht gesetzt werden.");
          }
        });
        return;
      }

      if (!isGM) return;
      applyLocalMove(gridX, gridY);
      startTransition(async () => {
        try {
          const placed = await placeBattlemapGmToken({
            sessionId,
            battlemapId: activeBattlemapId,
            gridX,
            gridY,
            tokenId: token.id,
            npcId: token.npc_id ?? undefined,
            creatureId: token.creature_id ?? undefined,
            tokenSide: token.token_side,
            sizeCells: token.size_cells,
            isVisibleToPlayers: token.is_visible_to_players,
            label: token.label,
            imageUrl: token.image_url,
          });
          setBattlemapTokens((prev) => upsertBattlemapToken(prev, placed));
          notifyBattlemapTokensChanged({ op: "upsert", token: placed });
          toast.success("Token verschoben.");
        } catch (e) {
          applyLocalMove(originGrid.grid_x, originGrid.grid_y);
          toast.error(e instanceof Error ? e.message : "Token konnte nicht gesetzt werden.");
        }
      });
    },
    [
      activeBattlemapId,
      isGM,
      liveState?.battlemap_movement_paused,
      notifyBattlemapTokensChanged,
      runTrapEnterCheck,
      sessionId,
      startTransition,
    ],
  );

  const handleFogShapeDelete = useCallback(
    (shapeId: string) => {
      startTransition(async () => {
        try {
          await removeBattlemapFogShape(shapeId, sessionId);
          setBattlemapFogShapes((prev) => prev.filter((s) => s.id !== shapeId));
          setSelectedFogShapeId((prev) => (prev === shapeId ? null : prev));
          notifyBattlemapFogChanged({ op: "delete", shapeId });
          toast.success("Fog-Fläche entfernt.");
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Fog-Fläche konnte nicht gelöscht werden.",
          );
        }
      });
    },
    [notifyBattlemapFogChanged, sessionId, startTransition],
  );

  const handleEffectTemplateDelete = useCallback(
    (templateId: string) => {
      startTransition(async () => {
        try {
          await removeBattlemapEffectTemplate(templateId, sessionId);
          setBattlemapEffectTemplates((prev) => prev.filter((t) => t.id !== templateId));
          setSelectedEffectTemplateId((prev) => (prev === templateId ? null : prev));
          notifyBattlemapEffectChanged({ op: "delete", templateId });
          toast.success("Effekt-Schablone entfernt.");
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Effekt-Schablone konnte nicht gelöscht werden.",
          );
        }
      });
    },
    [notifyBattlemapEffectChanged, sessionId, startTransition],
  );

  const handleMarkerDelete = useCallback(
    (markerId: string) => {
      startTransition(async () => {
        try {
          await removeBattlemapMarker(markerId, sessionId);
          setBattlemapMarkers((prev) => prev.filter((m) => m.id !== markerId));
          setSelectedMarkerId((prev) => (prev === markerId ? null : prev));
          toast.success("Spezialeffekt entfernt.");
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Marker konnte nicht gelöscht werden.",
          );
        }
      });
    },
    [sessionId, startTransition],
  );

  const handleFogClearAll = useCallback(() => {
    if (!activeBattlemapId || !isGM) return;
    if (battlemapFogShapes.length === 0) {
      toast.message("Keine Fog-Flächen zum Löschen.");
      return;
    }
    startTransition(async () => {
      try {
        await clearBattlemapFogShapes(activeBattlemapId, sessionId);
        setBattlemapFogShapes([]);
        setSelectedFogShapeId(null);
        notifyBattlemapFogChanged({ op: "refresh" });
        toast.success("Alle Fog-Flächen entfernt.");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Fog-Flächen konnten nicht gelöscht werden.",
        );
      }
    });
  }, [
    activeBattlemapId,
    battlemapFogShapes.length,
    isGM,
    notifyBattlemapFogChanged,
    sessionId,
    startTransition,
  ]);

  const handleEffectClearAll = useCallback(() => {
    if (!activeBattlemapId || !isGM) return;
    if (battlemapEffectTemplates.length === 0) {
      toast.message("Keine Effekt-Schablonen zum Löschen.");
      return;
    }
    startTransition(async () => {
      try {
        await clearBattlemapEffectTemplates(activeBattlemapId, sessionId);
        setBattlemapEffectTemplates([]);
        setSelectedEffectTemplateId(null);
        notifyBattlemapEffectChanged({ op: "refresh" });
        toast.success("Alle Effekt-Schablonen entfernt.");
      } catch (e) {
        toast.error(
          e instanceof Error
            ? e.message
            : "Effekt-Schablonen konnten nicht gelöscht werden.",
        );
      }
    });
  }, [
    activeBattlemapId,
    battlemapEffectTemplates.length,
    isGM,
    notifyBattlemapEffectChanged,
    sessionId,
    startTransition,
  ]);

  const handleMarkerClearAll = useCallback(() => {
    if (!activeBattlemapId || !isGM) return;
    if (battlemapMarkers.length === 0) {
      toast.message("Keine Spezialeffekte zum Löschen.");
      return;
    }
    startTransition(async () => {
      try {
        await clearBattlemapMarkers(activeBattlemapId, sessionId);
        setBattlemapMarkers([]);
        setSelectedMarkerId(null);
        toast.success("Alle Spezialeffekte entfernt.");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Marker konnten nicht gelöscht werden.",
        );
      }
    });
  }, [activeBattlemapId, battlemapMarkers.length, isGM, sessionId, startTransition]);

  const handleTrapDelete = useCallback(
    (trapId: string) => {
      startTransition(async () => {
        try {
          await removeBattlemapTrap(trapId, sessionId);
          setBattlemapTraps((prev) => prev.filter((t) => t.id !== trapId));
          setSelectedTrapId((prev) => (prev === trapId ? null : prev));
          toast.success("Falle entfernt.");
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Falle konnte nicht gelöscht werden.",
          );
        }
      });
    },
    [sessionId, startTransition],
  );

  const handleTrapClearAll = useCallback(() => {
    if (!activeBattlemapId || !isGM) return;
    if (battlemapTraps.length === 0) {
      toast.message("Keine Fallen zum Löschen.");
      return;
    }
    startTransition(async () => {
      try {
        await clearBattlemapTraps(activeBattlemapId, sessionId);
        setBattlemapTraps([]);
        setSelectedTrapId(null);
        toast.success("Alle Fallen entfernt.");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Fallen konnten nicht gelöscht werden.",
        );
      }
    });
  }, [activeBattlemapId, battlemapTraps.length, isGM, sessionId, startTransition]);

  const handleBattlemapPropDrop = useCallback(
    (draft: GmPropPlacementDraft, posX: number, posY: number) => {
      if (!isGM || !activeBattlemapId) return;
      startTransition(async () => {
        try {
          await createBattlemapProp({
            sessionId,
            battlemapId: activeBattlemapId,
            kind: draft.kind,
            npcId: draft.npcId ?? null,
            sceneMediaId: draft.sceneMediaId ?? null,
            imageUrl: draft.imageUrl,
            posX,
            posY,
            width: draft.width,
            height: draft.height,
          });
          toast.success(`${draft.label} auf die Map gelegt.`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Prop konnte nicht erstellt werden.");
        }
      });
    },
    [activeBattlemapId, isGM, sessionId, startTransition],
  );

  const handleBattlemapPropResize = useCallback(
    (propId: string, delta: number) => {
      if (!isGM) return;
      const prop = battlemapProps.find((p) => p.id === propId);
      if (!prop) return;
      startTransition(async () => {
        try {
          await updateBattlemapProp({
            propId,
            sessionId,
            width: Math.max(0.04, Math.min(0.6, prop.width + delta)),
            height: Math.max(0.04, Math.min(0.6, prop.height + delta)),
          });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Größe konnte nicht geändert werden.");
        }
      });
    },
    [battlemapProps, isGM, sessionId, startTransition],
  );

  const visibleBattlemapTokens = useMemo(
    () =>
      isGM
        ? battlemapTokens
        : battlemapTokens.filter((t) => t.is_visible_to_players),
    [battlemapTokens, isGM],
  );

  const battlemapNpcHpByRef = useMemo(() => {
    const map: Record<string, { current: number; max: number }> = {};
    for (const npc of campaignNpcs) {
      const sheet = parseNpcSheetData(npc.sheet_data);
      if (sheet?.combat?.hpMax) {
        map[`npc:${npc.id}`] = {
          current: sheet.combat.hpCurrent ?? sheet.combat.hpMax,
          max: sheet.combat.hpMax,
        };
      }
    }
    return map;
  }, [campaignNpcs]);

  const battlemapCharacterIds = useMemo(
    () =>
      visibleBattlemapTokens
        .map((t) => t.character_id)
        .filter((id): id is string => Boolean(id)),
    [visibleBattlemapTokens],
  );
  const { displays: battlemapCharDisplays, rollFxUrlByCharacterId } =
    useBattlemapCharacterDisplays(battlemapCharacterIds, {
      campaignId,
      enabled: battlemapActive,
    });
  const characterDisplayUrlById = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const id of battlemapCharacterIds) {
      map[id] =
        rollFxUrlByCharacterId[id] ??
        battlemapCharDisplays[id]?.url ??
        null;
    }
    return map;
  }, [
    battlemapCharacterIds,
    battlemapCharDisplays,
    rollFxUrlByCharacterId,
  ]);
  const characterConditionsById = useMemo(() => {
    const map: Record<
      string,
      NonNullable<(typeof battlemapCharDisplays)[string]>["activeConditions"]
    > = {};
    for (const id of battlemapCharacterIds) {
      map[id] = battlemapCharDisplays[id]?.activeConditions ?? [];
    }
    return map;
  }, [battlemapCharacterIds, battlemapCharDisplays]);

  const battlemapTokenHpByRef = useMemo(() => {
    const map: Record<string, { current: number; max: number }> = {
      ...battlemapNpcHpByRef,
    };
    for (const id of battlemapCharacterIds) {
      const d = battlemapCharDisplays[id];
      if (d && d.hpMax > 0) {
        map[`char:${id}`] = { current: d.hpCurrent, max: d.hpMax };
      }
    }
    return map;
  }, [battlemapCharacterIds, battlemapCharDisplays, battlemapNpcHpByRef]);

  const visibleBattlemapProps = useMemo(
    () =>
      isGM ? battlemapProps : battlemapProps.filter((p) => p.is_visible_to_players),
    [battlemapProps, isGM],
  );

  const [isStageManagerOpen, setIsStageManagerOpen] = useState(false);
  const [stageSearch, setStageSearch] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(
    viableInitial ? initialLiveState?.background_url || null : null,
  );
  const [showQuests, setShowQuests] = useState(false);
  const [downtimePlayerDismissed, setDowntimePlayerDismissed] = useState(false);
  const [mainSidePanel, setMainSidePanel] = useState<MainSidePanelId | null>(null);
  const [isDiceOpen, setIsDiceOpen] = useState(false);
  /** GM in Vorbereitung: Charakter zum Testen von Würfeln/Aktionen */
  const [prepTestCharacterId, setPrepTestCharacterId] = useState<string | null>(null);
  const [isEnding, startEndTransition] = useTransition();
  const [wrapUpOpen, setWrapUpOpen] = useState(false);
  const [recordingNoticeModalOpen, setRecordingNoticeModalOpen] = useState(false);
  const [stageFactionSearch, setStageFactionSearch] = useState("");
  const [npcSearchModalOpen, setNpcSearchModalOpen] = useState(false);
  const [beastSearchModalOpen, setBeastSearchModalOpen] = useState(false);
  const [creatureStates, setCreatureStates] =
    useState<Record<string, CampaignCreatureStateRow>>(initialCreatureStates);
  const [beastLootCreatureId, setBeastLootCreatureId] = useState<string | null>(null);
  const [stageDropHighlight, setStageDropHighlight] = useState(false);
  const [stagePortrait, setStagePortrait] = useState<StagePortraitModal | null>(
    null,
  );
  const [npcReactions, setNpcReactions] = useState<ActiveNpcReaction[]>([]);
  const [npcReputationScores, setNpcReputationScores] = useState<Record<string, number>>({});
  const [combatParticipants, setCombatParticipants] = useState<CombatParticipant[]>([]);
  /** Verhindert, dass veraltete Realtime-Reloads die Initiative-Liste nach dem Seed leeren. */
  const combatParticipantsLoadGenRef = useRef(0);
  const [rollingInitiativeId, setRollingInitiativeId] = useState<string | null>(null);
  const [lightningPulseKey, setLightningPulseKey] = useState(0);
  const [locationDraft, setLocationDraft] = useState(
    () =>
      (viableInitial ? initialLiveState?.current_location : null) ?? "",
  );
  const [temperatureDraft, setTemperatureDraft] = useState(() =>
    normalizeTemperatureValue(
      viableInitial ? initialLiveState?.temperature_value : null,
    ),
  );

  /** Wer die Session-Seite gerade offen hat (Realtime Presence) */
  const [presentUserIds, setPresentUserIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [chronistPanelOpen, setChronistPanelOpen] = useState(true);
  const [partyTrayMode, setPartyTrayMode] = useState<"full" | "compact" | "hidden">(
    "full",
  );
  const chronistStartFlowRef = useRef<(() => void) | null>(null);
  const chronistStopFlowRef = useRef<(() => void) | null>(null);
  const chronistSettingsFlowRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("th:party-tray-mode");
      if (raw === "full" || raw === "compact" || raw === "hidden") {
        setPartyTrayMode(raw);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("th:party-tray-mode", partyTrayMode);
    } catch {
      /* ignore */
    }
  }, [partyTrayMode]);

  const isPrepMode = sessionStatus === "Scheduled";
  const chronistTableMode =
    activeTranscriptionMode === "table" || activeTranscriptionMode === null;

  const prepMicTest = useMicMonitor();
  const chronicleRecorder = useSessionChronicleRecorder({
    sessionId,
    enabled: isGM && sessionStatus === "Live" && chronistTableMode,
    plannedMode: activeTranscriptionMode,
  });
  const { status: liveTranscriptionStatus } = useSessionTranscriptionStatus(
    sessionId,
    chronistTableMode && sessionStatus === "Live",
  );

  const gmMicActive =
    chronicleRecorder.localCaptureActive ||
    (isPrepMode && prepMicTest.isActive);

  const topBarTranscriptionStatus =
    sessionStatus === "Live"
      ? chronicleRecorder.phase === "recording"
        ? "recording"
        : chronicleRecorder.phase === "paused"
          ? "paused"
          : liveTranscriptionStatus
      : null;

  const recordingNoticeStatus =
    sessionStatus === "Live" &&
    chronistTableMode &&
    (topBarTranscriptionStatus === "recording" ||
      topBarTranscriptionStatus === "paused")
      ? topBarTranscriptionStatus
      : null;

  const [chronistReminderDismissed, setChronistReminderDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(`th-chronist-reminder-dismiss-${sessionId}`) === "1";
    } catch {
      return false;
    }
  });

  const [jitsiChronistReminderDismissed, setJitsiChronistReminderDismissed] = useState(
    () => {
      if (typeof window === "undefined") return false;
      try {
        return (
          sessionStorage.getItem(`th-chronist-jitsi-reminder-dismiss-${sessionId}`) ===
          "1"
        );
      } catch {
        return false;
      }
    },
  );

  const chronistRecordingActive =
    chronicleRecorder.localCaptureActive ||
    chronicleRecorder.phase === "starting";

  const chronistHealthBannerVariant =
    chronicleRecorder.captureHealth !== "idle" &&
    chronicleRecorder.captureHealth !== "starting"
      ? chronicleRecorder.captureHealth
      : null;

  const showChronistHealthBanner =
    isGM &&
    sessionStatus === "Live" &&
    chronistTableMode &&
    chronistHealthBannerVariant != null &&
    (chronistHealthBannerVariant === "reconnect-needed" ||
      chronistHealthBannerVariant === "no-signal" ||
      chronistHealthBannerVariant === "upload-stalled");

  useEffect(() => {
    if (chronicleRecorder.localCaptureActive) {
      try {
        sessionStorage.removeItem(`th-chronist-reminder-dismiss-${sessionId}`);
      } catch {
        /* ignore */
      }
      setChronistReminderDismissed(false);
    }
  }, [chronicleRecorder.localCaptureActive, sessionId]);

  function dismissChronistRecordingReminder() {
    try {
      sessionStorage.setItem(`th-chronist-reminder-dismiss-${sessionId}`, "1");
    } catch {
      /* ignore */
    }
    setChronistReminderDismissed(true);
  }

  function dismissJitsiChronistReminder() {
    try {
      sessionStorage.setItem(`th-chronist-jitsi-reminder-dismiss-${sessionId}`, "1");
    } catch {
      /* ignore */
    }
    setJitsiChronistReminderDismissed(true);
  }

  const showChronistNotRecordingReminder =
    isGM &&
    sessionStatus === "Live" &&
    chronistTableMode &&
    !chronistRecordingActive &&
    !liveTranscriptionStatus &&
    !chronistReminderDismissed &&
    !showChronistHealthBanner;

  const showJitsiChronistReminder =
    isGM &&
    sessionStatus === "Live" &&
    !chronistTableMode &&
    !jitsiChronistReminderDismissed;

  useEffect(() => {
    if (
      isGM ||
      !recordingNoticeStatus ||
      sessionStatus !== "Live" ||
      !chronistTableMode
    ) {
      return;
    }
    const key = `th-recording-notice-${sessionId}`;
    try {
      if (sessionStorage.getItem(key) === "1") return;
    } catch {
      /* ignore storage errors */
    }
    setRecordingNoticeModalOpen(true);
  }, [isGM, recordingNoticeStatus, sessionId, sessionStatus, chronistTableMode]);

  function dismissRecordingNotice() {
    try {
      sessionStorage.setItem(`th-recording-notice-${sessionId}`, "1");
    } catch {
      /* ignore storage errors */
    }
    setRecordingNoticeModalOpen(false);
  }
  const weatherCondition = getWeatherCondition(liveState);
  const dayPhase = resolveSessionDayPhase(liveState?.current_time);

  useEffect(() => {
    setBackgroundUrl(initialLiveState?.background_url || null);
  }, [initialLiveState?.background_url]);

  useEffect(() => {
    setLocationDraft(liveState?.current_location ?? "");
  }, [liveState?.current_location]);

  useEffect(() => {
    setTemperatureDraft(normalizeTemperatureValue(liveState?.temperature_value));
  }, [liveState?.temperature_value]);

  useEffect(() => {
    if (!stagePortrait) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setStagePortrait(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stagePortrait]);

  useEffect(() => {
    if (weatherCondition !== "storm") return;
    let timeout: number | null = null;
    let cancelled = false;

    function scheduleLightning() {
      timeout = window.setTimeout(
        () => {
          if (cancelled) return;
          setLightningPulseKey((current) => current + 1);
          scheduleLightning();
        },
        10000 + Math.random() * 15000,
      );
    }

    scheduleLightning();
    return () => {
      cancelled = true;
      if (timeout != null) window.clearTimeout(timeout);
    };
  }, [weatherCondition]);

  const canEditJournal =
    !forcePlayerView &&
    (isGM || (liveState?.scribe_id != null && liveState.scribe_id === userId));
  const systemLogs = liveState?.system_logs ?? [];
  const {
    active: combatStartFxActive,
    fxKey: combatStartFxKey,
    dismiss: dismissCombatStartFx,
  } = useCombatStartFx(liveState?.is_combat_mode && liveState?.combat_started);
  const handRaises = liveState?.hand_raises ?? [];
  const urgentHandRaise =
    isGM && !forcePlayerView ? handRaises.find((r) => r.urgent) ?? null : null;
  const prevSystemLogCountRef = useRef(systemLogs.length);
  const prevRollFxLogCountRef = useRef(systemLogs.length);

  useEffect(() => {
    if (!isGM || forcePlayerView) {
      prevSystemLogCountRef.current = systemLogs.length;
      return;
    }
    if (systemLogs.length <= prevSystemLogCountRef.current) {
      prevSystemLogCountRef.current = systemLogs.length;
      return;
    }
    const fresh = systemLogs.slice(prevSystemLogCountRef.current);
    prevSystemLogCountRef.current = systemLogs.length;
    for (const entry of fresh) {
      const text = entry.text ?? "";
      if (
        entry.type === "player_action" &&
        (text.includes("Ausrüstung") || text.includes("Loadout") || text.includes("Waffenkombination"))
      ) {
        toast.info(text, { duration: 9000 });
      }
    }
  }, [systemLogs, isGM, forcePlayerView]);

  useDiceRevealBridge();
  const pendingDiceFxRef = useRef<globalThis.Map<string, (typeof systemLogs)[number]>>(
    new globalThis.Map(),
  );
  const pendingInitiativeToastRef = useRef<{
    participantId: string;
    display: string;
  } | null>(null);

  useEffect(() => {
    const prime = () => {
      primeDiceNatSounds();
    };
    window.addEventListener("pointerdown", prime, { once: true, passive: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  function applyDiceResolveFx(entry: (typeof systemLogs)[number]) {
    const characterId = entry.character_id?.trim();
    if (characterId) {
      if (
        entry.type === "dice" ||
        entry.type === "attack_pending" ||
        entry.type === "skill_check" ||
        entry.type === "saving_throw" ||
        entry.type === "damage_roll"
      ) {
        const kind = rollFxKindFromMeta(entry.meta);
        if (kind) {
          playDiceNatSound(kind, entry.id);
          dispatchAvatarRollFx({
            characterId,
            kind,
            sourceId: entry.id,
          });
        }
      }
    }
    const bubble = speechBubbleFromActivityEntry(entry);
    if (bubble) dispatchAvatarSpeechBubble(bubble);
  }

  /** Crit/Patzer-Avatar-FX + Sprechblasen: bei 3D-Würfeln erst nach Animation. */
  useEffect(() => {
    if (systemLogs.length < prevRollFxLogCountRef.current) {
      prevRollFxLogCountRef.current = systemLogs.length;
      pendingDiceFxRef.current.clear();
      return;
    }
    if (systemLogs.length === prevRollFxLogCountRef.current) return;
    const fresh = systemLogs.slice(prevRollFxLogCountRef.current);
    prevRollFxLogCountRef.current = systemLogs.length;
    for (const entry of fresh) {
      if (shouldAnimateDiceEntry(entry)) {
        pendingDiceFxRef.current.set(entry.id, entry);
        continue;
      }
      applyDiceResolveFx(entry);
    }
  }, [systemLogs]);

  useOnDiceAnimComplete((sourceId) => {
    const entry = pendingDiceFxRef.current.get(sourceId);
    if (entry) {
      pendingDiceFxRef.current.delete(sourceId);
      applyDiceResolveFx(entry);
    }
    const pendingInit = pendingInitiativeToastRef.current;
    if (!pendingInit || !entry) return;
    const meta =
      entry.meta && typeof entry.meta === "object"
        ? (entry.meta as Record<string, unknown>)
        : null;
    const isInitiative =
      meta?.kind === "initiative" ||
      (typeof meta?.label === "string" && meta.label.trim() === "Initiative");
    if (!isInitiative) return;
    pendingInitiativeToastRef.current = null;
    toast.success(`Initiative: ${pendingInit.display}`);
    setRollingInitiativeId((cur) =>
      cur === pendingInit.participantId ? null : cur,
    );
  });

  const physicallyPresentIdSet = new Set(
    normalizePhysicallyPresentUserIds(liveState?.physically_present_user_ids),
  );
  const dummyPlayerCountLive = Math.min(
    3,
    Math.max(0, Math.round(Number(liveState?.dummy_player_count ?? 0)) || 0),
  );
  const displayPartyCharacters = useMemo((): PartyCharacter[] => {
    const guestSlots = normalizeGuestSlots(liveState?.guest_slots);
    const dummies: PartyCharacter[] = [];
    for (let i = 1; i <= dummyPlayerCountLive; i += 1) {
      const guestSlot = guestSlots.find((slot) => slot.slot === i);
      dummies.push({
        id: `session-dummy-${i}`,
        name: guestSlot?.name ?? `Spieler ${i}`,
        class: "Gast",
        race: null,
        level: null,
        avatar_url: "/images/icon-empty.svg",
        playerUserId: null,
        rations_count: 0,
        starvation_days: 0,
        isSessionDummy: true,
        guestId: guestSlot?.guest_id ?? null,
      });
    }
    return [...partyCharacters, ...dummies];
  }, [partyCharacters, dummyPlayerCountLive, liveState?.guest_slots]);

  const playerColorByCharacterId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const pc of displayPartyCharacters) {
      map[pc.id] = getPlayerColorForClass(pc.class);
    }
    return map;
  }, [displayPartyCharacters]);

  const playerColorByUserId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const pc of displayPartyCharacters) {
      if (pc.playerUserId) {
        map[pc.playerUserId] = getPlayerColorForClass(pc.class);
      }
    }
    return map;
  }, [displayPartyCharacters]);

  const temperatureValue = isGM
    ? temperatureDraft
    : normalizeTemperatureValue(liveState?.temperature_value);
  const weatherVisual = getWeatherVisual(liveState);
  const currentPlayerCharacter = useMemo(() => {
    return partyCharacters.find((pc) => pc.playerUserId === userId) ?? null;
  }, [partyCharacters, userId]);

  const activityCharacter = useMemo(() => {
    if (currentPlayerCharacter) {
      return { id: currentPlayerCharacter.id, name: currentPlayerCharacter.name };
    }
    if (isPrepMode && isGM && !forcePlayerView) {
      const testId = prepTestCharacterId ?? partyCharacters.find((pc) => !pc.isSessionDummy)?.id ?? null;
      const pc = partyCharacters.find((p) => p.id === testId);
      if (pc) return { id: pc.id, name: pc.name };
    }
    return null;
  }, [
    currentPlayerCharacter,
    isPrepMode,
    isGM,
    forcePlayerView,
    prepTestCharacterId,
    partyCharacters,
  ]);

  const toggleMainSidePanel = useCallback((id: MainSidePanelId) => {
    setMainSidePanel((prev) => (prev === id ? null : id));
    setLeftPanel(null);
    setTopPanel(null);
  }, []);

  const closeMainSidePanel = useCallback(() => {
    setMainSidePanel(null);
  }, []);

  const toggleLeftPanel = useCallback((id: LeftPanelId) => {
    setLeftPanel((prev) => (prev === id ? null : id));
    setMainSidePanel(null);
    setTopPanel(null);
    setIsDiceOpen(false);
  }, []);

  const closeLeftPanel = useCallback(() => {
    setLeftPanel(null);
  }, []);

  const toggleTopPanel = useCallback((id: TopToolbarPanelId) => {
    setTopPanel((prev) => (prev === id ? null : id));
    setLeftPanel(null);
    setMainSidePanel(null);
    setIsDiceOpen(false);
  }, []);

  const closeTopPanel = useCallback(() => {
    setTopPanel(null);
  }, []);

  useEffect(() => {
    if (!isPrepMode || !isGM || forcePlayerView || currentPlayerCharacter) return;
    if (prepTestCharacterId) return;
    const first = partyCharacters.find((pc) => !pc.isSessionDummy);
    if (first) setPrepTestCharacterId(first.id);
  }, [
    isPrepMode,
    isGM,
    forcePlayerView,
    currentPlayerCharacter,
    prepTestCharacterId,
    partyCharacters,
  ]);

  useEffect(() => {
    setDowntimePlayerDismissed(false);
  }, [liveState?.downtime_current_day, liveState?.downtime_active]);

  // SSR ohne Zeile: sofort Client + ggf. GM-Anlage (ref-synchron für Klicks vor Re-Render)
  useEffect(() => {
    if (viableInitial) return;
    void resolveLiveStateBase();
  }, [sessionId, viableInitial, resolveLiveStateBase]);

  const showNpcReaction = useCallback((npcId: string, emoji: string) => {
      const id = `${npcId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setNpcReactions((prev) => [...prev, { id, npcId, emoji }]);
      window.setTimeout(() => {
        setNpcReactions((prev) => prev.filter((item) => item.id !== id));
      }, 3000);
    },
    [],
  );

  function writeSystemLog(type: string, text: string) {
    if (!isGM || !text.trim()) return;
    void createSystemLog(sessionId, type, text).catch((error) => {
      console.error("[LiveSessionBoard] createSystemLog:", error);
    });
  }

  // ---------------------------------------------------------------------------
  // Gast: Live-State per API (kein Supabase-Login)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isGuest) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/session/guest/live-state?sessionId=${encodeURIComponent(sessionId)}`,
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { ok?: boolean; live_state?: unknown };
        if (data.ok && data.live_state) {
          const next = normalizeLiveRow(data.live_state);
          liveStateRef.current = next;
          setLiveState(next);
          setBackgroundUrl(next.background_url || null);
        }
      } catch {
        /* Polling-Fehler ignorieren */
      }
    };
    void poll();
    const timer = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isGuest, sessionId]);

  // ---------------------------------------------------------------------------
  // Realtime Subscription
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isGuest) return;
    const channel = supabase
      .channel(`session_live_${sessionId}`, {
        config: { presence: { key: userId } },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_live_states",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new) {
            const next = normalizeLiveRow(payload.new);
            liveStateRef.current = next;
            setLiveState(next);
            setBackgroundUrl(next.background_url || null);
          }
        },
      )
      .on("broadcast", { event: "stage_visibility_changed" }, (payload) => {
        const patch = normalizeStageVisibilityPatch(payload.payload);
        if (
          !Object.prototype.hasOwnProperty.call(patch, "visible_npc_ids") &&
          !Object.prototype.hasOwnProperty.call(patch, "visible_faction_ids")
        ) {
          return;
        }

        setLiveState((prev) => {
          if (!prev) return prev;
          const next = normalizeLiveRow({ ...prev, ...patch });
          liveStateRef.current = next;
          return next;
        });
      })
      .on("broadcast", { event: "npc_reaction" }, (payload) => {
        const reaction = payload.payload as {
          npcId?: unknown;
          scoreAfter?: unknown;
          type?: unknown;
        };
        const npcId =
          reaction.npcId != null ? String(reaction.npcId) : "";
        if (!npcId) return;
        const scoreN =
          reaction.scoreAfter != null ? Number(reaction.scoreAfter) : NaN;
        if (Number.isFinite(scoreN)) {
          showNpcReaction(npcId, npcReputationSmileyFromScore(scoreN));
        } else {
          const legacy = reaction.type === "positive" ? "positive" : "negative";
          showNpcReaction(
            npcId,
            legacy === "positive" ? npcReputationSmileyFromScore(20) : npcReputationSmileyFromScore(-20),
          );
        }
      })
      .on("broadcast", { event: CHARACTER_DISPLAY_CHANGED_BROADCAST }, (payload) => {
        const raw = payload.payload as {
          characterId?: unknown;
          snapshot?: CharacterDisplaySnapshot | null;
          senderId?: unknown;
        } | null;
        const characterId = raw?.characterId != null ? String(raw.characterId) : "";
        if (!characterId) return;
        if (raw?.senderId != null && String(raw.senderId) === userId) return;
        dispatchCharacterDisplayChanged({
          characterId,
          remote: true,
          snapshot: raw?.snapshot ?? undefined,
        });
      })
      .on("broadcast", { event: BATTLEMAP_TOKENS_CHANGED_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as BattlemapTokensChangedDetail;
        const battlemapId = raw.battlemapId != null ? String(raw.battlemapId) : "";
        const currentId = liveStateRef.current?.active_battlemap_id ?? null;
        if (!battlemapId || !currentId || battlemapId !== currentId) return;
        if (raw.senderId != null && String(raw.senderId) === userId) return;

        const op = raw.op ?? "refresh";
        if (op === "delete") {
          const tokenId = raw.tokenId != null ? String(raw.tokenId) : "";
          if (tokenId) {
            setBattlemapTokens((prev) => prev.filter((t) => t.id !== tokenId));
          }
          return;
        }

        if (op === "upsert" && raw.token && typeof raw.token === "object") {
          const token = mapBattlemapTokenRow(raw.token as Record<string, unknown>);
          setBattlemapTokens((prev) => upsertBattlemapToken(prev, token));
          return;
        }

        void (async () => {
          const { data, error } = await (supabase as any)
            .from("session_battlemap_tokens")
            .select("*")
            .eq("battlemap_id", battlemapId)
            .order("created_at", { ascending: true });
          if (error || !data) return;
          setBattlemapTokens(
            (data as Record<string, unknown>[]).map((row) => mapBattlemapTokenRow(row)),
          );
        })();
      })
      .on("broadcast", { event: BATTLEMAP_FOG_CHANGED_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as BattlemapFogChangedDetail;
        const battlemapId = raw.battlemapId != null ? String(raw.battlemapId) : "";
        const currentId = liveStateRef.current?.active_battlemap_id ?? null;
        if (!battlemapId || !currentId || battlemapId !== currentId) return;
        if (raw.senderId != null && String(raw.senderId) === userId) return;

        const op = raw.op ?? "refresh";
        if (op === "delete") {
          const shapeId = raw.shapeId != null ? String(raw.shapeId) : "";
          if (shapeId) {
            setBattlemapFogShapes((prev) => prev.filter((s) => s.id !== shapeId));
            setSelectedFogShapeId((prev) => (prev === shapeId ? null : prev));
          }
          return;
        }

        if (op === "upsert" && raw.shape && typeof raw.shape === "object") {
          const row = raw.shape as Record<string, unknown>;
          const shape: SessionBattlemapFogShape = {
            id: String(row.id),
            battlemap_id: String(row.battlemap_id),
            session_id: String(row.session_id),
            campaign_id: String(row.campaign_id),
            shape: row.shape === "circle" ? "circle" : "rect",
            grid_x: Math.round(Number(row.grid_x ?? 0)),
            grid_y: Math.round(Number(row.grid_y ?? 0)),
            grid_w: Math.max(1, Math.round(Number(row.grid_w ?? 1))),
            grid_h: Math.max(1, Math.round(Number(row.grid_h ?? 1))),
            z_index: Math.round(Number(row.z_index ?? 0)),
          };
          setBattlemapFogShapes((prev) => {
            const idx = prev.findIndex((s) => s.id === shape.id);
            if (idx < 0) return [...prev, shape];
            const next = [...prev];
            next[idx] = shape;
            return next;
          });
          return;
        }

        void listBattlemapFogShapes(battlemapId, sessionId)
          .then((shapes) => setBattlemapFogShapes(shapes))
          .catch(() => undefined);
      })
      .on("broadcast", { event: BATTLEMAP_EFFECT_CHANGED_BROADCAST }, (payload) => {
        const raw = (payload.payload ?? {}) as BattlemapEffectChangedDetail;
        const battlemapId = raw.battlemapId != null ? String(raw.battlemapId) : "";
        const currentId = liveStateRef.current?.active_battlemap_id ?? null;
        if (!battlemapId || !currentId || battlemapId !== currentId) return;
        if (raw.senderId != null && String(raw.senderId) === userId) return;

        const op = raw.op ?? "refresh";
        if (op === "delete") {
          const templateId = raw.templateId != null ? String(raw.templateId) : "";
          if (templateId) {
            setBattlemapEffectTemplates((prev) => prev.filter((t) => t.id !== templateId));
            setSelectedEffectTemplateId((prev) => (prev === templateId ? null : prev));
          }
          return;
        }

        if (op === "upsert" && raw.template && typeof raw.template === "object") {
          const row = raw.template as Record<string, unknown>;
          const shapeRaw = String(row.shape ?? "rect");
          const template: SessionBattlemapEffectTemplate = {
            id: String(row.id),
            battlemap_id: String(row.battlemap_id),
            session_id: String(row.session_id),
            campaign_id: String(row.campaign_id),
            shape: shapeRaw === "circle" ? "circle" : shapeRaw === "cone" ? "cone" : "rect",
            grid_x: Math.round(Number(row.grid_x ?? 0)),
            grid_y: Math.round(Number(row.grid_y ?? 0)),
            grid_w: Math.max(1, Math.round(Number(row.grid_w ?? 1))),
            grid_h: Math.max(1, Math.round(Number(row.grid_h ?? 1))),
            direction_deg: Math.round(Number(row.direction_deg ?? 0)) % 360,
            z_index: Math.round(Number(row.z_index ?? 0)),
          };
          setBattlemapEffectTemplates((prev) => {
            const idx = prev.findIndex((t) => t.id === template.id);
            if (idx < 0) return [...prev, template];
            const next = [...prev];
            next[idx] = template;
            return next;
          });
          return;
        }

        void listBattlemapEffectTemplates(battlemapId, sessionId)
          .then((templates) => setBattlemapEffectTemplates(templates))
          .catch(() => undefined);
      })
      .on("presence", { event: "sync" }, () => {
        const st = channel.presenceState();
        const ids = new Set(Object.keys(st));
        setPresentUserIds(ids);
        if (!isGM && ids.has(userId)) {
          void registerSessionOnlinePresence(sessionId);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId });
          if (!isGM) {
            void registerSessionOnlinePresence(sessionId);
          }
        }
      });

    liveChannelRef.current = channel;

    return () => {
      if (liveChannelRef.current === channel) {
        liveChannelRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [sessionId, showNpcReaction, supabase, userId, isGM, isGuest]);

  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;

    async function loadCombatParticipants() {
      const gen = ++combatParticipantsLoadGenRef.current;
      const { data, error } = await ((supabase as any).from("combat_participants") as any)
        .select("*")
        .eq("session_id", sessionId)
        .eq("is_active", true);

      if (cancelled || gen !== combatParticipantsLoadGenRef.current) return;
      if (!error) {
        setCombatParticipants(normalizeCombatParticipants(data ?? []));
      }
    }

    void loadCombatParticipants();

    const channel = supabase
      .channel(`session_combat_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "combat_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => void loadCombatParticipants(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      combatParticipantsLoadGenRef.current += 1;
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  // ---------------------------------------------------------------------------
  // Helper: Update Live State (environment / journal)
  // ---------------------------------------------------------------------------
  /** `baseOverride`: z. B. direkt nach resolveLiveStateBase, wenn React-State noch nachzieht */
  function updateLiveState(patch: Partial<LiveState>, baseOverride?: LiveState) {
    startTransition(async () => {
      try {
        let base = baseOverride ?? liveStateRef.current;
        if (!base) {
          base = await resolveLiveStateBase();
        }
        if (!base) {
          alert(
            "Session-Zustand konnte nicht geladen werden. Bitte Seite neu laden. " +
              "In der Browser-Konsole nach „ensureSessionPrepLiveState“ oder „session_live_states“ suchen. " +
              "In Supabase: Migrationen für session_live_states (inkl. ensure_session_prep_live_state) ausführen.",
          );
          return;
        }

        const { error } = await (supabase.from("session_live_states") as any)
          .update(patch)
          .eq("session_id", sessionId);

        if (error) {
          console.error("Update Live State Error:", error);
          alert(error.message);
          return;
        }

        const stageVisibilityPatch = normalizeStageVisibilityPatch(patch);

        setLiveState((prev) => {
          const mergeFrom = prev ?? base!;
          const next = { ...mergeFrom, ...patch };
          liveStateRef.current = next;
          if (Object.prototype.hasOwnProperty.call(patch, "background_url")) {
            setBackgroundUrl(next.background_url || null);
          }
          return next;
        });

        if (
          Object.prototype.hasOwnProperty.call(stageVisibilityPatch, "visible_npc_ids") ||
          Object.prototype.hasOwnProperty.call(stageVisibilityPatch, "visible_faction_ids")
        ) {
          void liveChannelRef.current?.send({
            type: "broadcast",
            event: "stage_visibility_changed",
            payload: stageVisibilityPatch,
          });
        }
      } catch (err: any) {
        console.error(err);
        alert(err.message || "Fehler beim Aktualisieren des Session-Zustands.");
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Derived Data: Active NPCs & Party
  // ---------------------------------------------------------------------------
  const activeNpcIds = useMemo(() => {
    return new Set((liveState?.visible_npc_ids || []).map(String));
  }, [liveState?.visible_npc_ids]);

  const activeNpcs = useMemo(
    () => campaignNpcs.filter((npc) => activeNpcIds.has(String(npc.id))),
    [campaignNpcs, activeNpcIds],
  );

  const sortedActiveNpcs = useMemo(
    () =>
      sortNpcsByLocationPriority(
        activeNpcs,
        liveState?.current_location_lore_id ?? null,
      ),
    [activeNpcs, liveState?.current_location_lore_id],
  );

  const activeCreatureIds = useMemo(() => {
    return new Set((liveState?.visible_creature_ids || []).map(String));
  }, [liveState?.visible_creature_ids]);

  const activeCreatures = useMemo(
    () => campaignCreatures.filter((c) => activeCreatureIds.has(String(c.id))),
    [campaignCreatures, activeCreatureIds],
  );

  const creatureStagePool = useMemo(() => {
    if (stageDeckCreatureIds == null) return campaignCreatures;
    const deck = new Set(stageDeckCreatureIds.map(String));
    if (deck.size === 0) return campaignCreatures;
    return campaignCreatures.filter((c) => deck.has(String(c.id)));
  }, [campaignCreatures, stageDeckCreatureIds]);

  const gmBeastSearchRows = useMemo(
    () =>
      creatureStagePool.map((c) => ({
        id: String(c.id),
        name: c.name,
        creature_type: c.creature_type,
        image_url: c.image_url,
        is_revealed: c.is_revealed,
      })),
    [creatureStagePool],
  );

  const gmNpcSearchRows = useMemo(
    () =>
      campaignNpcs.map((n) => ({
        id: String(n.id),
        name: n.name,
        title: n.title ?? null,
        image_url: n.image_url ?? null,
        is_revealed: n.is_revealed,
        current_location_id: n.current_location_id ?? null,
        home_location_id: n.home_location_id ?? null,
      })),
    [campaignNpcs],
  );

  useEffect(() => {
    if (activeNpcs.length === 0) {
      setNpcReputationScores({});
      return;
    }

    const npcIds = activeNpcs.map((npc) => String(npc.id));
    void (async () => {
      const { data, error } = await ((supabase as any).from(
        "campaign_npc_reputation",
      ) as any)
        .select("npc_id, reputation_score")
        .eq("campaign_id", campaignId)
        .in("npc_id", npcIds);

      if (error) {
        console.error("[LiveSessionBoard] load npc reputation:", error);
        return;
      }

      const next: Record<string, number> = {};
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        next[String(row.npc_id)] = Number(row.reputation_score ?? 0);
      }
      setNpcReputationScores(next);
    })();
  }, [activeNpcs, campaignId, supabase]);

  const npcStagePool = useMemo(() => {
    if (stageDeckNpcIds == null) {
      return campaignNpcs.map((n) => ({ ...n, id: String(n.id) }));
    }
    const deck = stageDeckNpcIds.map((id) => String(id)).filter(Boolean);
    if (deck.length === 0) {
      return campaignNpcs.map((n) => ({ ...n, id: String(n.id) }));
    }
    const allowed = new Set(deck);
    return campaignNpcs.filter((n) => allowed.has(String(n.id)));
  }, [campaignNpcs, stageDeckNpcIds]);

  const factionStagePool = useMemo(() => {
    if (stageDeckFactionIds == null) {
      return allCampaignFactions.map((f) => ({ ...f, id: String(f.id) }));
    }
    const deck = stageDeckFactionIds.map((id) => String(id)).filter(Boolean);
    if (deck.length === 0) {
      return allCampaignFactions.map((f) => ({ ...f, id: String(f.id) }));
    }
    const allowed = new Set(deck);
    return allCampaignFactions.filter((f) => allowed.has(String(f.id)));
  }, [allCampaignFactions, stageDeckFactionIds]);

  const sceneStagePool = useMemo(() => {
    if (stageDeckSceneMediaIds == null) return allSceneMedia;
    const deck = stageDeckSceneMediaIds.map((id) => String(id)).filter(Boolean);
    if (deck.length === 0) return allSceneMedia;
    const allowed = new Set(deck);
    return allSceneMedia.filter((s) => allowed.has(String(s.id)));
  }, [allSceneMedia, stageDeckSceneMediaIds]);

  const activeSceneMedia = useMemo(() => {
    const id = liveState?.active_scene_media_id;
    if (!id) return null;
    return allSceneMedia.find((s) => String(s.id) === String(id)) ?? null;
  }, [liveState?.active_scene_media_id, allSceneMedia]);

  const inHandScenes = useMemo(
    () =>
      sceneStagePool.filter(
        (s) => String(s.id) !== String(liveState?.active_scene_media_id ?? ""),
      ),
    [sceneStagePool, liveState?.active_scene_media_id],
  );

  const activeFactionIds = useMemo(() => {
    return new Set((liveState?.visible_faction_ids || []).map(String));
  }, [liveState?.visible_faction_ids]);

  const activeFactions = useMemo(
    () => allCampaignFactions.filter((f) => activeFactionIds.has(String(f.id))),
    [allCampaignFactions, activeFactionIds],
  );

  const stageRosterPreview = useMemo(() => {
    const npcs = liveState?.loot_hide_npcs
      ? []
      : sortedActiveNpcs.map((n) => ({
          id: `npc-${n.id}`,
          name: n.name,
          imageUrl: n.image_url,
        }));
    const creatures = activeCreatures.map((c) => ({
      id: `creature-${c.id}`,
      name: c.name,
      imageUrl: c.image_url,
    }));
    const factions = activeFactions.map((f) => ({
      id: `faction-${f.id}`,
      name: f.name,
      imageUrl: f.image_url ?? f.banner_url ?? null,
    }));
    return [...npcs, ...creatures, ...factions];
  }, [
    liveState?.loot_hide_npcs,
    sortedActiveNpcs,
    activeCreatures,
    activeFactions,
  ]);

  const stageHasDeckContent =
    sortedActiveNpcs.length > 0 ||
    activeFactions.length > 0 ||
    Boolean(liveState?.current_loot_id);

  const sortedCombatParticipants = useMemo(
    () =>
      [...combatParticipants]
        .filter((participant) => participant.is_active)
        .sort(compareCombatHudOrder),
    [combatParticipants],
  );
  const combatStarted = Boolean(liveState?.is_combat_mode && liveState?.combat_started);
  const activeCombatParticipant =
    combatStarted && sortedCombatParticipants.length > 0
      ? sortedCombatParticipants[
          Math.min(
            Math.max(0, Number(liveState?.current_turn_index ?? 0) || 0),
            sortedCombatParticipants.length - 1,
          )
        ]
      : null;
  const activeTurnHighlight = useMemo(
    () =>
      combatStarted
        ? resolveActiveCombatTurnHighlight(
            activeCombatParticipant,
            partyCharacters,
            battlemapTokens,
          )
        : null,
    [
      combatStarted,
      activeCombatParticipant,
      partyCharacters,
      battlemapTokens,
    ],
  );
  const combatParticipantNames = useMemo(
    () => new Set(combatParticipants.filter((p) => p.is_active).map((p) => p.name)),
    [combatParticipants],
  );
  const combatParticipantNpcIds = useMemo(
    () =>
      new Set(
        combatParticipants
          .filter((p) => p.is_active && p.npc_id)
          .map((p) => String(p.npc_id)),
      ),
    [combatParticipants],
  );
  const combatPlayerTokens = useMemo<CombatTokenPayload[]>(
    () =>
      partyCharacters
        .filter((pc) => !pc.isSessionDummy)
        .map((pc) => ({
          type: "player",
          name: pc.name,
          image_url: pc.avatar_url,
        })),
    [partyCharacters],
  );
  const combatMonsterTokens = useMemo<CombatTokenPayload[]>(
    () =>
      Array.from({ length: 10 }).map((_, index) => ({
        type: "monster",
        name: `Monster ${index + 1}`,
        image_url: null,
      })),
    [],
  );
  const combatNpcTokens = useMemo<CombatTokenPayload[]>(
    () => sortedActiveNpcs.map((npc) => buildNpcCombatToken(npc)),
    [sortedActiveNpcs],
  );

  const filteredNpcsForStageManager = useMemo(() => {
    const term = stageSearch.trim().toLowerCase();
    const base = !term
      ? npcStagePool
      : npcStagePool.filter((npc) =>
          `${npc.name} ${npc.title || ""}`.toLowerCase().includes(term),
        );
    return sortNpcsByLocationPriority(
      base,
      liveState?.current_location_lore_id ?? null,
    );
  }, [npcStagePool, stageSearch, liveState?.current_location_lore_id]);

  const filteredFactionsForStageManager = useMemo(() => {
    const term = stageFactionSearch.trim().toLowerCase();
    if (!term) return factionStagePool;
    return factionStagePool.filter((f) =>
      `${f.name} ${f.type || ""}`.toLowerCase().includes(term),
    );
  }, [factionStagePool, stageFactionSearch]);

  const inHandNpcs = useMemo(
    () =>
      sortNpcsByLocationPriority(
        npcStagePool.filter((n) => !activeNpcIds.has(String(n.id))),
        liveState?.current_location_lore_id ?? null,
      ),
    [npcStagePool, activeNpcIds, liveState?.current_location_lore_id],
  );

  const inHandFactions = useMemo(
    () => factionStagePool.filter((f) => !activeFactionIds.has(String(f.id))),
    [factionStagePool, activeFactionIds],
  );

  const showGmDeckHand =
    isGM &&
    (inHandNpcs.length > 0 || inHandFactions.length > 0 || inHandScenes.length > 0);

  const battlemapTrayNpcs = useMemo(() => npcStagePool, [npcStagePool]);

  const battlemapTrayCreatures = useMemo(() => creatureStagePool, [creatureStagePool]);

  const battlemapTrayScenes = useMemo(() => inHandScenes, [inHandScenes]);

  const stagePrepHref = `/dashboard/campaigns/${campaignId}/sessions/${sessionId}/stage-prep`;

  const revealNpcOnCampaignIfNeeded = useCallback(
    async (npcId: string) => {
      const npc = allCampaignNpcs.find((entry) => String(entry.id) === npcId);
      if (!npc || npc.is_revealed === true) return;
      try {
        await setCampaignVisibility(campaignId, "npc", npcId, true);
        router.refresh();
      } catch (err) {
        console.error("[LiveSessionBoard] reveal NPC on stage:", err);
      }
    },
    [allCampaignNpcs, campaignId, router],
  );

  const revealCreatureOnCampaignIfNeeded = useCallback(
    async (creatureId: string) => {
      const creature = allCampaignCreatures.find((entry) => String(entry.id) === creatureId);
      if (!creature || creature.is_revealed === true) return;
      try {
        await setCampaignVisibility(campaignId, "bestarium", creatureId, true);
        router.refresh();
      } catch (err) {
        console.error("[LiveSessionBoard] reveal creature on stage:", err);
      }
    },
    [allCampaignCreatures, campaignId, router],
  );

  function placeOnStage(kind: "npc" | "faction" | "scene" | "creature", id: string) {
    void (async () => {
      const base = await resolveLiveStateBase();
      if (!base) {
        alert(
          isGM
            ? "Session-Zustand konnte noch nicht angelegt werden. Bitte nutze „Erneut initialisieren“ im Hinweisbanner oder lade die Seite neu."
            : "Session-Zustand ist noch nicht bereit. Bitte warte auf den Spielleiter.",
        );
        return;
      }
      const sid = String(id);
      if (kind === "scene") {
        if (!isGM) return;
        const scene = allSceneMedia.find((entry) => String(entry.id) === sid);
        if (!scene) return;
        updateLiveState({ active_scene_media_id: sid }, base);
        const npcIds = (base.visible_npc_ids || []).map(String);
        const locationLoreId = base.current_location_lore_id
          ? String(base.current_location_lore_id)
          : null;
        const locationName = base.current_location?.trim() || null;
        const locationHint = locationName ? ` (Ort: ${locationName})` : "";
        writeSystemLog(
          "scene_show",
          `Eine Szene wird auf der Bühne gezeigt: „${scene.title}“${locationHint}${npcIds.length > 0 ? ` (NSCs anwesend: ${npcIds.length})` : ""}.`,
        );
        try {
          await logSceneMediaAppearance({
            campaignId,
            sessionId,
            sceneMediaId: sid,
            npcIds,
            locationLoreId,
            locationName,
          });
        } catch (err) {
          console.error("[LiveSessionBoard] scene appearance log:", err);
        }
        setStagePortrait({
          name: scene.title,
          subtitle: scene.category,
          imageUrl: scene.image_url,
        });
        return;
      }
      if (kind === "npc") {
        const currentIds = new Set((base.visible_npc_ids || []).map(String));
        if (currentIds.has(sid)) return;
        currentIds.add(sid);
        updateLiveState({ visible_npc_ids: Array.from(currentIds) }, base);
        const npc = allCampaignNpcs.find((entry) => String(entry.id) === sid);
        writeSystemLog(
          "stage_card",
          `Eine neue Präsenz betritt das Geschehen: ${npc?.name ?? "Unbekannt"}.`,
        );
        await revealNpcOnCampaignIfNeeded(sid);
      } else if (kind === "creature") {
        const currentIds = new Set((base.visible_creature_ids || []).map(String));
        if (currentIds.has(sid)) return;
        currentIds.add(sid);
        updateLiveState({ visible_creature_ids: Array.from(currentIds) }, base);
        const creature = allCampaignCreatures.find((entry) => String(entry.id) === sid);
        const descHint = creature?.physical_description?.trim().slice(0, 220);
        const descLong = (creature?.physical_description?.trim().length ?? 0) > 220;
        writeSystemLog(
          "stage_card",
          descHint
            ? `Eine Kreatur betritt die Bühne: ${creature?.name ?? "Unbekannt"}. ${descHint}${descLong ? "…" : ""}`
            : `Eine Kreatur betritt die Bühne: ${creature?.name ?? "Unbekannt"}.`,
        );
        await revealCreatureOnCampaignIfNeeded(sid);
      } else {
        const currentIds = new Set(
          (base.visible_faction_ids || []).map(String),
        );
        if (currentIds.has(sid)) return;
        currentIds.add(sid);
        updateLiveState({ visible_faction_ids: Array.from(currentIds) }, base);
        const faction = allCampaignFactions.find((entry) => String(entry.id) === sid);
        writeSystemLog(
          "stage_card",
          `Eine neue Präsenz betritt das Geschehen: ${faction?.name ?? "Unbekannt"}.`,
        );
      }
    })();
  }

  function removeFromStage(kind: "npc" | "faction" | "scene" | "creature", id: string) {
    if (!isGM) return;
    const sid = String(id);
    const base = liveStateRef.current;
    if (!base) return;

    if (kind === "scene") {
      if (String(base.active_scene_media_id ?? "") !== sid) return;
      updateLiveState({ active_scene_media_id: null });
      const scene = allSceneMedia.find((entry) => String(entry.id) === sid);
      writeSystemLog(
        "scene_remove",
        `Die Szene „${scene?.title ?? "Unbekannt"}“ verlässt die Bühne.`,
      );
      return;
    }

    if (kind === "npc") {
      updateLiveState({
        visible_npc_ids: (base.visible_npc_ids || [])
          .map(String)
          .filter((npcId) => npcId !== sid),
      });
      const npc = allCampaignNpcs.find((entry) => String(entry.id) === sid);
      writeSystemLog(
        "stage_remove",
        `${npc?.name ?? "Ein NSC"} verlässt die Bühne.`,
      );
    } else if (kind === "creature") {
      updateLiveState({
        visible_creature_ids: (base.visible_creature_ids || [])
          .map(String)
          .filter((creatureId) => creatureId !== sid),
      });
      const creature = allCampaignCreatures.find((entry) => String(entry.id) === sid);
      writeSystemLog(
        "stage_remove",
        `${creature?.name ?? "Eine Kreatur"} verlässt die Bühne.`,
      );
    } else {
      updateLiveState({
        visible_faction_ids: (base.visible_faction_ids || [])
          .map(String)
          .filter((factionId) => factionId !== sid),
      });
      const faction = allCampaignFactions.find((entry) => String(entry.id) === sid);
      writeSystemLog(
        "stage_remove",
        `${faction?.name ?? "Eine Fraktion"} verlässt die Bühne.`,
      );
    }
  }

  function handleNpcReaction(npcId: string, amount: number) {
    if (!isGM) return;
    startTransition(async () => {
      try {
        const row = await adjustNpcReputation(campaignId, npcId, amount);
        const emoji = npcReputationSmileyFromScore(row.reputation_score);
        setNpcReputationScores((current) => ({
          ...current,
          [npcId]: row.reputation_score,
        }));
        showNpcReaction(npcId, emoji);
        await liveChannelRef.current?.send({
          type: "broadcast",
          event: "npc_reaction",
          payload: { npcId, scoreAfter: row.reputation_score },
        });
      } catch (err: any) {
        console.error("[LiveSessionBoard] adjustNpcReputation:", err);
        alert(err?.message || "NPC-Reaktion konnte nicht gesendet werden.");
      }
    });
  }

  function toggleShopForNpc(npc: CampaignNpc) {
    if (!isGM || !npc.is_merchant || !npc.shop_id) return;

    const shopIsOpen =
      liveStateRef.current?.active_shop_id === npc.shop_id &&
      liveStateRef.current?.active_merchant_npc_id === String(npc.id);

    if (shopIsOpen) {
      updateLiveState({ active_shop_id: null, active_merchant_npc_id: null });
      writeSystemLog("shop", `${npc.name} schließt den Handel.`);
      return;
    }

    updateLiveState({
      active_shop_id: npc.shop_id,
      active_merchant_npc_id: String(npc.id),
    });
    writeSystemLog("shop", `${npc.name} öffnet den Shop für die Gruppe.`);
  }

  function assignMerchantAndOpenShop(npc: CampaignNpc, shopId: string) {
    if (!isGM) return;
    const npcId = String(npc.id);
    const trimmedShopId = shopId.trim();
    if (!trimmedShopId) return;

    startShopTransition(async () => {
      try {
        const result = await updateNpcMerchantAssignment(
          campaignId,
          npcId,
          true,
          trimmedShopId,
        );
        if (!result.success) {
          alert(result.error || "Händler konnte nicht zugewiesen werden.");
          return;
        }

        setNpcMerchantOverrides((current) => ({
          ...current,
          [npcId]: { is_merchant: true, shop_id: trimmedShopId },
        }));

        updateLiveState({
          active_shop_id: trimmedShopId,
          active_merchant_npc_id: npcId,
        });
        writeSystemLog("shop", `${npc.name} öffnet den Shop für die Gruppe.`);
      } catch (err: unknown) {
        console.error("[LiveSessionBoard] assignMerchantAndOpenShop:", err);
        alert((err as Error)?.message || "Händler konnte nicht zugewiesen werden.");
      }
    });
  }

  function assignScribe(nextScribeId: string | null) {
    if (!isGM) return;
    updateLiveState({ scribe_id: nextScribeId });
  }

  function commitTemperatureValue(value = temperatureDraft) {
    const nextValue = normalizeTemperatureValue(value);
    const previousValue = normalizeTemperatureValue(liveStateRef.current?.temperature_value);
    updateLiveState({ temperature_value: nextValue });

    if (nextValue !== previousValue) {
      if (previousValue >= 0 && nextValue < 0) {
        writeSystemLog(
          "temperature_cold",
          "Eine klirrende Kälte zieht auf, die euch den Atem gefrieren lässt.",
        );
      } else if (previousValue < 35 && nextValue >= 35) {
        writeSystemLog(
          "temperature_hot",
          "Die Hitze wird drückend und flimmert über dem Boden.",
        );
      } else {
        writeSystemLog(
          "temperature",
          `Temperatur am Tisch auf ${nextValue}° gesetzt.`,
        );
      }
    }
  }

  function getLocationBackground(option: LoreLocationOption | undefined) {
    return option?.default_image_url || option?.image_url || null;
  }

  function clearStageOnLocationChange(base: LiveState): Partial<LiveState> | null {
    const hadNpcs = (base.visible_npc_ids || []).length > 0;
    const hadFactions = (base.visible_faction_ids || []).length > 0;
    const hadScene = !!base.active_scene_media_id;
    if (!hadNpcs && !hadFactions && !hadScene) return null;

    if (hadScene) {
      const scene = allSceneMedia.find(
        (entry) => String(entry.id) === String(base.active_scene_media_id),
      );
      writeSystemLog(
        "scene_remove",
        `Die Szene „${scene?.title ?? "Unbekannt"}“ verlässt die Bühne – der Ort wechselt.`,
      );
    }
    if (hadNpcs || hadFactions) {
      writeSystemLog(
        "stage_clear",
        "NSCs und Fraktionen verlassen die Bühne – ein neuer Ort beginnt.",
      );
    }

    return {
      visible_npc_ids: [],
      visible_faction_ids: [],
      active_scene_media_id: null,
    };
  }

  function changeSessionLocation(locationId: string) {
    const base = liveStateRef.current;
    if (!base) return;

    const nextLocationId = locationId || null;
    const currentLocationId = base.current_location_lore_id ?? null;
    const locationChanged =
      String(nextLocationId ?? "") !== String(currentLocationId ?? "");

    if (!locationId) {
      const stagePatch = locationChanged ? clearStageOnLocationChange(base) : null;
      updateLiveState({
        current_location_lore_id: null,
        ...(stagePatch ?? {}),
      });
      return;
    }

    const option = loreLocationOptions.find((entry) => entry.id === locationId);
    const locationName = option?.name ?? liveState?.current_location ?? "Unbekannter Ort";
    const autoBackground = getLocationBackground(option);
    const manualOverride = liveStateRef.current?.is_background_manual_override === true;
    const patch: Partial<LiveState> = {
      current_location_lore_id: locationId,
      current_location: locationName,
    };

    if (!manualOverride && autoBackground) {
      patch.background_url = autoBackground;
    }

    if (locationChanged) {
      const stagePatch = clearStageOnLocationChange(base);
      if (stagePatch) Object.assign(patch, stagePatch);
    }

    updateLiveState(patch);
    writeSystemLog(
      "location_change",
      !manualOverride && autoBackground
        ? `Die Umgebung verändert sich und ${locationName} breitet sich vor euch aus.`
        : `Die Gruppe erreicht: ${locationName}.`,
    );
  }

  function resetBackgroundToLocationDefault() {
    const locationId = liveStateRef.current?.current_location_lore_id;
    const option = loreLocationOptions.find((entry) => entry.id === locationId);
    const autoBackground = getLocationBackground(option);
    updateLiveState({
      is_background_manual_override: false,
      background_url: autoBackground,
    });
    writeSystemLog(
      "background_reset",
      option?.name
        ? `Die Umgebung verändert sich und ${option.name} breitet sich vor euch aus.`
        : "Der Bühnenhintergrund folgt wieder dem Orts-Standard.",
    );
  }

  async function addCombatToken(token: CombatTokenPayload) {
    if (!isGM) return;
    if (isCombatTokenUsed(token, combatParticipantNames, combatParticipantNpcIds)) return;
    const { error } = await ((supabase as any).from("combat_participants") as any).insert({
      session_id: sessionId,
      name: token.name,
      type: token.type,
      npc_id: token.npc_id ?? null,
      side: token.side ?? null,
      initiative_value: 0,
      initiative_label: null,
      sort_order: combatParticipants.length,
      image_url: token.image_url,
      is_active: true,
      conditions: [],
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${token.name} nimmt am Kampf teil.`);
  }

  function battlemapTokenToCombatPayload(
    token: SessionBattlemapToken,
  ): CombatTokenPayload | null {
    // Party-/PC-Tokens: character_id zählt — auch wenn der Tray-Eintrag fehlt (Label-Fallback).
    if (token.character_id) {
      const pc = partyCharacters.find((c) => c.id === token.character_id);
      if (pc?.isSessionDummy) return null;
      const name = (pc?.name || token.label || "").trim();
      if (!name) return null;
      return {
        type: "player",
        name,
        image_url: token.image_url || pc?.avatar_url || null,
      };
    }
    if (token.npc_id) {
      const npc =
        campaignNpcs.find((n) => String(n.id) === String(token.npc_id)) ?? null;
      return {
        type: "npc",
        name: token.label || npc?.name || "NPC",
        image_url: token.image_url || npc?.image_url || null,
        npc_id: String(token.npc_id),
        side: token.token_side === "hostile" ? "nemesis" : token.token_side === "friendly" || token.token_side === "party" ? "friend" : null,
      };
    }
    const label = (token.label || "Kreatur").trim();
    if (!label) return null;
    return {
      type: "monster",
      name: label,
      image_url: token.image_url,
      side: token.token_side === "hostile" ? "nemesis" : null,
    };
  }

  async function seedCombatParticipantsFromBattlemap() {
    if (!isGM) return;

    const payloads: CombatTokenPayload[] = [];
    const seenNames = new Set<string>();
    const seenNpcIds = new Set<string>();

    // Immer voller Token-State (nicht visibleBattlemapTokens / Pointer-Filter).
    for (const token of battlemapTokens) {
      const payload = battlemapTokenToCombatPayload(token);
      if (!payload) continue;
      if (isCombatTokenUsed(payload, seenNames, seenNpcIds)) continue;
      payloads.push(payload);
      if (payload.type === "npc" && payload.npc_id) seenNpcIds.add(payload.npc_id);
      else seenNames.add(payload.name);
    }

    // Vorherige Runde zurücksetzen — frische Initiative
    await ((supabase as any).from("combat_participants") as any)
      .update({ is_active: false })
      .eq("session_id", sessionId);

    // Realtime-Reload vom Deactivate darf die neue Liste nicht wieder leeren.
    combatParticipantsLoadGenRef.current += 1;

    if (payloads.length === 0) {
      setCombatParticipants([]);
      toast.error(
        "Keine aktiven Spieler-/NSC-Tokens auf der Battlemap. Platziere zuerst Tokens, dann Combat starten.",
      );
      return;
    }

    const rows = payloads.map((token, index) => ({
      session_id: sessionId,
      name: token.name,
      type: token.type,
      npc_id: token.npc_id ?? null,
      side: token.side ?? null,
      initiative_value: 0,
      initiative_label: null,
      sort_order: index,
      image_url: token.image_url,
      is_active: true,
      conditions: [],
    }));

    const { data, error } = await ((supabase as any).from("combat_participants") as any)
      .insert(rows)
      .select("*");

    if (error) {
      toast.error(error.message);
      return;
    }

    combatParticipantsLoadGenRef.current += 1;
    setCombatParticipants(normalizeCombatParticipants(data ?? []));
  }

  function dragCombatToken(e: DragEvent<HTMLElement>, token: CombatTokenPayload) {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/x-combat-token", JSON.stringify(token));
  }

  function dropCombatToken(e: DragEvent<HTMLElement>) {
    if (!isGM) return;
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData("application/x-combat-token");
    if (!raw) return;
    try {
      const token = JSON.parse(raw) as CombatTokenPayload;
      if (token.type !== "player" && token.type !== "monster" && token.type !== "npc") return;
      void addCombatToken({
        type: token.type,
        name: String(token.name ?? "").trim(),
        image_url: token.image_url != null ? String(token.image_url) : null,
        npc_id: token.npc_id != null ? String(token.npc_id) : null,
        side: token.side ?? null,
      });
    } catch {
      /* ignore invalid token payload */
    }
  }

  async function updateCombatParticipant(
    participantId: string,
    patch: Partial<
      Pick<
        CombatParticipant,
        "initiative_value" | "initiative_label" | "is_active" | "conditions" | "side"
      >
    >,
  ) {
    if (!isGM) return;
    const { error } = await ((supabase as any).from("combat_participants") as any)
      .update(patch)
      .eq("id", participantId);
    if (error) toast.error(error.message);
  }

  async function handleRollInitiative(participantId: string) {
    setRollingInitiativeId(participantId);
    try {
      const result = await rollCombatInitiative({ sessionId, participantId });
      setCombatParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId
            ? {
                ...p,
                initiative_value: result.total,
                initiative_label: result.display,
              }
            : p,
        ),
      );
      // Toast + HUD-Freigabe erst wenn der Würfel liegt.
      pendingInitiativeToastRef.current = {
        participantId,
        display: result.display,
      };
      // Fallback falls keine Animation (z. B. ohne Faces)
      window.setTimeout(() => {
        const pending = pendingInitiativeToastRef.current;
        if (!pending || pending.participantId !== participantId) return;
        pendingInitiativeToastRef.current = null;
        toast.success(`Initiative: ${pending.display}`);
        setRollingInitiativeId((cur) => (cur === participantId ? null : cur));
      }, 7000);
    } catch (e) {
      setRollingInitiativeId((cur) => (cur === participantId ? null : cur));
      toast.error(e instanceof Error ? e.message : "Initiative-Wurf fehlgeschlagen.");
    }
  }

  function beginCombatEncounter() {
    if (!isGM) return;
    const allRolled =
      sortedCombatParticipants.length > 0 &&
      sortedCombatParticipants.every((p) => hasRolledCombatInitiative(p));
    if (!allRolled) {
      toast.error("Alle Teilnehmer müssen zuerst Initiative würfeln.");
      return;
    }
    updateLiveState({
      combat_started: true,
      current_turn_index: 0,
      combat_round: 1,
    });
    writeSystemLog("combat_start", "Der Kampf beginnt — Initiative steht.");
  }

  function endCombatEncounter() {
    if (!isGM) return;
    updateLiveState({
      is_combat_mode: false,
      combat_started: false,
      current_turn_index: 0,
    });
    writeSystemLog("combat_end", "Der Kampfmodus wird beendet.");
  }

  function nextCombatTurn() {
    if (!isGM || sortedCombatParticipants.length === 0) return;
    const current = Math.max(0, Number(liveStateRef.current?.current_turn_index ?? 0) || 0);
    const length = sortedCombatParticipants.length;
    const nextIndex = (current + 1) % length;
    const patch: Partial<LiveState> = { current_turn_index: nextIndex };
    if (nextIndex === 0) {
      patch.combat_round =
        Math.max(1, Number(liveStateRef.current?.combat_round ?? 1) || 1) + 1;
    }
    updateLiveState(patch);
  }

  function prevCombatTurn() {
    if (!isGM || sortedCombatParticipants.length === 0) return;
    const current = Math.max(0, Number(liveStateRef.current?.current_turn_index ?? 0) || 0);
    const length = sortedCombatParticipants.length;
    const prevIndex = (current - 1 + length) % length;
    const patch: Partial<LiveState> = { current_turn_index: prevIndex };
    if (current === 0 && prevIndex === length - 1) {
      patch.combat_round = Math.max(
        1,
        Math.max(1, Number(liveStateRef.current?.combat_round ?? 1) || 1) - 1,
      );
    }
    updateLiveState(patch);
  }

  async function handlePlayerEndTurn() {
    try {
      const result = await advanceCombatTurn({
        sessionId,
        expectedParticipantId: activeCombatParticipant?.id,
      });
      setLiveState((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          current_turn_index: result.current_turn_index,
          combat_round: result.combat_round,
        };
        liveStateRef.current = next;
        return next;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Zug konnte nicht beendet werden.");
    }
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  return (
    <div
      className={`relative flex min-h-screen min-h-0 flex-col bg-background-dark text-white ${
        isGM && !forcePlayerView ? "pl-11" : "pl-20"
      } ${isGuest ? "" : "pr-11"}`}
    >
      {showLoadingScreen ? (
        <LiveSessionLoadingScreen
          steps={preload.steps}
          progress={preload.progress}
          message={isGM ? "Spielwelt wird vorbereitet…" : "Der Spielleiter bereitet die Welt vor…"}
        />
      ) : null}
      <AnimatePresence>
        {combatStartFxActive && !showLoadingScreen ? (
          <CombatStartVideoModal key={combatStartFxKey} onComplete={dismissCombatStartFx} />
        ) : null}
      </AnimatePresence>
      {/* Dark overlay for readability */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-background-dark via-emerald-950/90 to-black" />

      {showChronistHealthBanner && chronistHealthBannerVariant ? (
        <ChronicleRecordingReminderBanner
          variant={chronistHealthBannerVariant}
          onReconnect={() => void chronicleRecorder.reconnectLocalCapture()}
          error={chronicleRecorder.error}
          uploadedChunkCount={chronicleRecorder.serverUploadedChunkCount}
        />
      ) : null}

      {showChronistNotRecordingReminder ? (
        <ChronicleRecordingReminderBanner
          variant="not-recording"
          onStartRecording={() => chronistStartFlowRef.current?.()}
          onDismiss={dismissChronistRecordingReminder}
          error={chronicleRecorder.error}
        />
      ) : null}

      {showJitsiChronistReminder ? (
        <ChronicleRecordingReminderBanner
          variant="jitsi-mode"
          onDismiss={dismissJitsiChronistReminder}
        />
      ) : null}

      {recordingNoticeStatus && recordingNoticeModalOpen ? (
        <ChronicleRecordingNoticeModal
          open={recordingNoticeModalOpen}
          onClose={dismissRecordingNotice}
          status={recordingNoticeStatus}
        />
      ) : null}

      {liveStateLoadError && (
        <div className="relative z-10 border-b border-red-800/60 bg-red-950/45 px-6 py-2">
          <div className="flex flex-wrap items-center gap-2 font-libre text-xs text-red-200">
            <span>{liveStateLoadError}</span>
            {isGM && (
              <button
                type="button"
                onClick={() => void resolveLiveStateBase()}
                className="rounded border border-red-700 px-2 py-1 font-barlow font-bold uppercase text-[10px] text-red-100 hover:bg-red-900/60"
              >
                Erneut initialisieren
              </button>
            )}
          </div>
        </div>
      )}

      {/* Picture Frame Layout */}
      <div
        className={`relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-3 pt-3 md:px-5 md:pt-5 ${
          showGmDeckHand
            ? stageDeckHandOpen
              ? "pb-64"
              : "pb-20"
            : "pb-3 md:pb-5"
        }`}
      >
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-visible rounded-2xl border border-amber-900/60 bg-linear-to-b from-background-card/95 via-emerald-950/90 to-background-dark/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm">
          <LiveSessionTopToolbar
            isGM={isGM && !forcePlayerView}
            panel={topPanel}
            onToggle={toggleTopPanel}
            onClose={closeTopPanel}
            locationLabel={liveState?.current_location || "Unbekannter Ort"}
            locationLoreHref={
              sessionLocationLoreReadable && liveState?.current_location_lore_id
                ? `/dashboard/campaigns/${campaignId}/lore/${liveState.current_location_lore_id}`
                : null
            }
            locationContent={
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1">
                  <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
                    Ort aus Lore
                  </span>
                  <select
                    value={liveState?.current_location_lore_id || ""}
                    onChange={(e) => changeSessionLocation(e.target.value)}
                    className="w-full rounded border border-amber-900/60 bg-background-dark px-2 py-1.5 text-sm text-white outline-none focus:border-accent-gold"
                  >
                    <option value="" className="bg-white text-slate-950">
                      — Kein Lore-Ort —
                    </option>
                    {loreLocationOptions.map((o) => (
                      <option
                        key={o.id}
                        value={o.id}
                        className="bg-white text-slate-950"
                      >
                        {o.name}
                        {o.type ? ` (${o.type})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
                    Anzeigename
                  </span>
                  <input
                    type="text"
                    value={locationDraft}
                    onChange={(e) => setLocationDraft(e.target.value)}
                    onBlur={() =>
                      updateLiveState({
                        current_location: locationDraft.trim() || null,
                      })
                    }
                    placeholder="z. B. Hinterraum der Taverne"
                    className="w-full rounded border border-amber-900/60 bg-background-dark px-2 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-accent-gold"
                  />
                </label>
                {liveState?.current_location_lore_id ? (
                  <a
                    href={`/dashboard/campaigns/${campaignId}/lore/${liveState.current_location_lore_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:text-accent-gold"
                  >
                    <ScrollText className="h-3.5 w-3.5" />
                    Lore-Eintrag öffnen
                    <ExternalLink className="h-3 w-3 opacity-80" />
                  </a>
                ) : null}

              </div>
            }
            fateCount={(liveState?.fate_coins ?? []).length}
            fateContent={
              <FateCoinsPool
                sessionId={sessionId}
                coins={liveState?.fate_coins ?? []}
                destroyedCount={liveState?.destroyed_fate_coins ?? 0}
                isGM
                showControls
                compact
                inlineHeader
                collapsibleGmSettings
                gmSettingsOpen={fateGmSettingsOpen}
                onGmSettingsToggle={() => setFateGmSettingsOpen((v) => !v)}
              />
            }
            playerFateHud={
              <FateCoinsPool
                sessionId={sessionId}
                coins={liveState?.fate_coins ?? []}
                destroyedCount={liveState?.destroyed_fate_coins ?? 0}
                variant="hud"
              />
            }
            combatActive={!!liveState?.is_combat_mode}
            onToggleCombat={() => {
              const starting = !liveState?.is_combat_mode;
              if (starting) {
                updateLiveState({
                  is_combat_mode: true,
                  combat_started: false,
                  current_turn_index: 0,
                  combat_round: 1,
                });
                writeSystemLog(
                  "combat_start",
                  "Der Spielleiter leitet einen Kampf ein — Initiative würfeln!",
                );
                void seedCombatParticipantsFromBattlemap();
              } else {
                endCombatEncounter();
              }
            }}
            onOpenNpcs={() => setNpcSearchModalOpen(true)}
            onOpenBeasts={() => setBeastSearchModalOpen(true)}
            stageRosterOpen={stageDeckHandOpen}
            stageRosterCount={
              inHandNpcs.length + inHandFactions.length + inHandScenes.length
            }
            onToggleStageRoster={() => setStageDeckHandOpen((v) => !v)}
            onOpenStageLive={() => setIsStageManagerOpen(true)}
            stagePrepHref={stagePrepHref}
            loreHref={`/dashboard/campaigns/${campaignId}?tab=lore`}
            onOpenPlayerMonitor={
              actualUserIsGM && !forcePlayerView
                ? () =>
                    window.open(`${window.location.pathname}?mode=player`, "_blank")
                : undefined
            }
            onOpenGuestLink={
              actualUserIsGM && !forcePlayerView && guestJoinUrl
                ? () => {
                    void navigator.clipboard?.writeText(guestJoinUrl);
                    window.open(guestJoinUrl, "_blank", "noopener,noreferrer");
                  }
                : undefined
            }
            questCount={activeQuests.length}
            questsOpen={showQuests}
            onToggleQuests={
              activeQuests.length > 0 ? () => setShowQuests((prev) => !prev) : undefined
            }
            onEndSession={
              isGM && !isPrepMode ? () => setWrapUpOpen(true) : undefined
            }
            sessionEnding={isEnding}
            onExit={() =>
              router.push(
                isPrepMode
                  ? `/dashboard/campaigns/${campaignId}?tab=sessions`
                  : "/dashboard",
              )
            }
            exitLabel={isPrepMode ? "Zurück zur Kampagne" : "Session verlassen"}
            isPrepMode={isPrepMode}
            initializing={isLiveStateInitializing}
            statusLabel={
              isGuest
                ? `Gast · ${guestDisplayName ?? "Zuschauer"}`
                : forcePlayerView
                  ? "Spieler-Monitor"
                  : !(isGM && !forcePlayerView)
                    ? "Live Session"
                    : null
            }
            statusHint={
              isGuest
                ? `Platzhalter-Slot ${guestSlotIndex ?? "—"} — nur Anschauen`
                : null
            }
            playerExtra={
              !isGM && sessionStatus === "Live" && chronistTableMode ? (
                <ChronicleRecordingTopBar
                  role="player"
                  transcriptionStatus={topBarTranscriptionStatus}
                />
              ) : null
            }
          />

          <div className="relative min-h-0 h-full overflow-visible">
            <div
              className={`relative h-full min-h-0 overflow-x-hidden bg-slate-950 bg-cover bg-center transition-shadow duration-200 ${
                battlemapActive ? "overflow-hidden" : "overflow-y-auto"
              } ${
                stageDropHighlight
                  ? "ring-2 ring-accent-gold ring-inset"
                  : ""
              }`}
              style={
                !battlemapActive && backgroundUrl
                  ? { backgroundImage: `url(${backgroundUrl})` }
                  : undefined
              }
              onDragOver={(e) => {
                if (!isGM) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setStageDropHighlight(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setStageDropHighlight(false);
                }
              }}
              onDrop={(e) => {
                if (!isGM) return;
                e.preventDefault();
                setStageDropHighlight(false);
                try {
                  const raw = e.dataTransfer.getData("application/json");
                  if (!raw) return;
                  const data = JSON.parse(raw) as { kind?: string; id?: string };
                  if (data.kind === "npc" && data.id) placeOnStage("npc", data.id);
                  if (data.kind === "faction" && data.id) placeOnStage("faction", data.id);
                  if (data.kind === "scene" && data.id) placeOnStage("scene", data.id);
                } catch {
                  /* ignore invalid payload */
                }
              }}
            >
            {activeBattlemap ? (
              <BattlemapStage
                battlemap={activeBattlemap}
                tokens={visibleBattlemapTokens}
                props={visibleBattlemapProps}
                fogShapes={battlemapFogShapes}
                effectTemplates={battlemapEffectTemplates}
                markers={battlemapMarkers}
                traps={battlemapTraps}
                isGm={isGM}
                characterPlacement={tokenPlacement}
                gmTokenPlacement={gmTokenPlacement}
                gmMoveTokenId={gmMoveTokenId}
                selectedTokenId={selectedBattlemapTokenId}
                selectedPropId={selectedBattlemapPropId}
                selectedFogShapeId={selectedFogShapeId}
                fogTool={isGM ? fogTool : null}
                effectTool={isGM ? effectTool : null}
                markerTool={isGM ? markerTool : null}
                trapTool={isGM ? trapTool : null}
                disableSpacePan={Boolean(trapWizardCell)}
                selectedEffectTemplateId={selectedEffectTemplateId}
                selectedMarkerId={selectedMarkerId}
                selectedTrapId={selectedTrapId}
                onCancelPlacement={() => {
                  setTokenPlacement(null);
                  setGmTokenPlacement(null);
                  setGmMoveTokenId(null);
                }}
                onToggleDash={() => {
                  setTokenPlacement((prev) =>
                    prev ? { ...prev, useDash: !prev.useDash } : prev,
                  );
                }}
                onCellClick={handleBattlemapCellClick}
                onSelectToken={(id) => {
                  setSelectedBattlemapTokenId(id);
                  setSelectedBattlemapPropId(null);
                  setSelectedFogShapeId(null);
                  setSelectedEffectTemplateId(null);
                  setSelectedMarkerId(null);
                  setSelectedTrapId(null);
                  if (id && isGM) {
                    const token = battlemapTokens.find((t) => t.id === id);
                    if (token && !token.character_id) {
                      setGmMoveTokenId(id);
                      setGmTokenPlacement(null);
                      setTokenPlacement(null);
                    }
                  } else {
                    setGmMoveTokenId(null);
                  }
                }}
                onSelectProp={(id) => {
                  setSelectedBattlemapPropId(id);
                  setSelectedBattlemapTokenId(null);
                  setSelectedFogShapeId(null);
                  setSelectedEffectTemplateId(null);
                  setSelectedMarkerId(null);
                  setSelectedTrapId(null);
                  setGmMoveTokenId(null);
                  setGmTokenPlacement(null);
                }}
                onSelectFogShape={(id) => {
                  setSelectedFogShapeId(id);
                  setSelectedBattlemapTokenId(null);
                  setSelectedBattlemapPropId(null);
                  setSelectedEffectTemplateId(null);
                  setSelectedMarkerId(null);
                  setSelectedTrapId(null);
                  setGmMoveTokenId(null);
                }}
                onSelectEffectTemplate={(id) => {
                  setSelectedEffectTemplateId(id);
                  setSelectedBattlemapTokenId(null);
                  setSelectedBattlemapPropId(null);
                  setSelectedFogShapeId(null);
                  setSelectedMarkerId(null);
                  setSelectedTrapId(null);
                  setGmMoveTokenId(null);
                }}
                onSelectMarker={(id) => {
                  setSelectedMarkerId(id);
                  setSelectedBattlemapTokenId(null);
                  setSelectedBattlemapPropId(null);
                  setSelectedFogShapeId(null);
                  setSelectedEffectTemplateId(null);
                  setSelectedTrapId(null);
                  setGmMoveTokenId(null);
                }}
                onFogShapeCreate={(input) => {
                  if (!activeBattlemapId || !isGM) return;
                  startTransition(async () => {
                    try {
                      const created = await createBattlemapFogShape({
                        sessionId,
                        battlemapId: activeBattlemapId,
                        shape: input.shape,
                        gridX: input.gridX,
                        gridY: input.gridY,
                        gridW: input.gridW,
                        gridH: input.gridH,
                      });
                      setBattlemapFogShapes((prev) => {
                        if (prev.some((s) => s.id === created.id)) return prev;
                        return [...prev, created];
                      });
                      setSelectedFogShapeId(created.id);
                      notifyBattlemapFogChanged({ op: "upsert", shape: created });
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Fog-Fläche konnte nicht erstellt werden.",
                      );
                    }
                  });
                }}
                onFogShapeMove={(shapeId, gridX, gridY) => {
                  if (!isGM) return;
                  const prev = battlemapFogShapes.find((s) => s.id === shapeId);
                  if (!prev || (prev.grid_x === gridX && prev.grid_y === gridY)) return;
                  setBattlemapFogShapes((list) =>
                    list.map((s) =>
                      s.id === shapeId ? { ...s, grid_x: gridX, grid_y: gridY } : s,
                    ),
                  );
                  startTransition(async () => {
                    try {
                      const updated = await updateBattlemapFogShape({
                        sessionId,
                        shapeId,
                        gridX,
                        gridY,
                      });
                      setBattlemapFogShapes((list) =>
                        list.map((s) => (s.id === updated.id ? updated : s)),
                      );
                      notifyBattlemapFogChanged({ op: "upsert", shape: updated });
                    } catch (e) {
                      if (prev) {
                        setBattlemapFogShapes((list) =>
                          list.map((s) => (s.id === shapeId ? prev : s)),
                        );
                      }
                      toast.error(
                        e instanceof Error ? e.message : "Fog-Fläche konnte nicht verschoben werden.",
                      );
                    }
                  });
                }}
                onFogShapeDelete={handleFogShapeDelete}
                onFogToolCancel={() => {
                  setFogTool(null);
                  setSelectedFogShapeId(null);
                }}
                onEffectTemplateCreate={(input) => {
                  if (!activeBattlemapId || !isGM) return;
                  startTransition(async () => {
                    try {
                      const created = await createBattlemapEffectTemplate({
                        sessionId,
                        battlemapId: activeBattlemapId,
                        shape: input.shape,
                        gridX: input.gridX,
                        gridY: input.gridY,
                        gridW: input.gridW,
                        gridH: input.gridH,
                        directionDeg: input.directionDeg,
                      });
                      setBattlemapEffectTemplates((prev) => {
                        if (prev.some((t) => t.id === created.id)) return prev;
                        return [...prev, created];
                      });
                      setSelectedEffectTemplateId(created.id);
                      notifyBattlemapEffectChanged({ op: "upsert", template: created });
                    } catch (e) {
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : "Effekt-Schablone konnte nicht erstellt werden.",
                      );
                    }
                  });
                }}
                onEffectTemplateMove={(templateId, gridX, gridY) => {
                  if (!isGM) return;
                  const prev = battlemapEffectTemplates.find((t) => t.id === templateId);
                  if (!prev || (prev.grid_x === gridX && prev.grid_y === gridY)) return;
                  setBattlemapEffectTemplates((list) =>
                    list.map((t) =>
                      t.id === templateId ? { ...t, grid_x: gridX, grid_y: gridY } : t,
                    ),
                  );
                  startTransition(async () => {
                    try {
                      const updated = await updateBattlemapEffectTemplate({
                        sessionId,
                        templateId,
                        gridX,
                        gridY,
                      });
                      setBattlemapEffectTemplates((list) =>
                        list.map((t) => (t.id === updated.id ? updated : t)),
                      );
                      notifyBattlemapEffectChanged({ op: "upsert", template: updated });
                    } catch (e) {
                      if (prev) {
                        setBattlemapEffectTemplates((list) =>
                          list.map((t) => (t.id === templateId ? prev : t)),
                        );
                      }
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : "Effekt-Schablone konnte nicht verschoben werden.",
                      );
                    }
                  });
                }}
                onEffectTemplateDelete={handleEffectTemplateDelete}
                onEffectToolCancel={() => {
                  setEffectTool(null);
                  setSelectedEffectTemplateId(null);
                }}
                onMarkerCreate={(input) => {
                  if (!activeBattlemapId || !isGM) return;
                  startTransition(async () => {
                    try {
                      const created = await createBattlemapMarker({
                        sessionId,
                        battlemapId: activeBattlemapId,
                        kind: input.kind,
                        gridX: input.gridX,
                        gridY: input.gridY,
                      });
                      setBattlemapMarkers((prev) => {
                        if (prev.some((m) => m.id === created.id)) return prev;
                        return [...prev, created];
                      });
                      setSelectedMarkerId(created.id);
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Marker konnte nicht gesetzt werden.",
                      );
                    }
                  });
                }}
                onMarkerMove={(markerId, gridX, gridY) => {
                  if (!isGM) return;
                  const prev = battlemapMarkers.find((m) => m.id === markerId);
                  if (!prev || (prev.grid_x === gridX && prev.grid_y === gridY)) return;
                  setBattlemapMarkers((list) =>
                    list.map((m) =>
                      m.id === markerId ? { ...m, grid_x: gridX, grid_y: gridY } : m,
                    ),
                  );
                  startTransition(async () => {
                    try {
                      const updated = await updateBattlemapMarker({
                        sessionId,
                        markerId,
                        gridX,
                        gridY,
                      });
                      setBattlemapMarkers((list) =>
                        list.map((m) => (m.id === updated.id ? updated : m)),
                      );
                    } catch (e) {
                      if (prev) {
                        setBattlemapMarkers((list) =>
                          list.map((m) => (m.id === markerId ? prev : m)),
                        );
                      }
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : "Marker konnte nicht verschoben werden.",
                      );
                    }
                  });
                }}
                onMarkerDelete={handleMarkerDelete}
                onMarkerToolCancel={() => {
                  setMarkerTool(null);
                  setSelectedMarkerId(null);
                }}
                onSelectTrap={(id) => {
                  setSelectedTrapId(id);
                  setSelectedBattlemapTokenId(null);
                  setSelectedBattlemapPropId(null);
                  setSelectedFogShapeId(null);
                  setSelectedEffectTemplateId(null);
                  setSelectedMarkerId(null);
                  setGmMoveTokenId(null);
                }}
                onTrapPlaceCell={(gridX, gridY) => {
                  setTrapWizardCell({ gridX, gridY });
                }}
                onTrapToolCancel={() => {
                  setTrapTool(null);
                  setSelectedTrapId(null);
                  setTrapWizardCell(null);
                }}
                onTokenMove={handleBattlemapTokenMove}
                onPropDrop={handleBattlemapPropDrop}
                onPropResize={handleBattlemapPropResize}
                onToggleTokenVisibility={(tokenId, visible) => {
                  startTransition(async () => {
                    try {
                      const updated = await toggleBattlemapTokenVisibility(
                        tokenId,
                        sessionId,
                        visible,
                      );
                      setBattlemapTokens((prev) =>
                        prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
                      );
                      notifyBattlemapTokensChanged({ op: "upsert", token: updated });
                      toast.success(visible ? "Token sichtbar." : "Token verborgen.");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Sichtbarkeit konnte nicht geändert werden.");
                    }
                  });
                }}
                onTogglePropVisibility={(propId, visible) => {
                  startTransition(async () => {
                    try {
                      await updateBattlemapProp({
                        propId,
                        sessionId,
                        isVisibleToPlayers: visible,
                      });
                      toast.success(visible ? "Prop sichtbar." : "Prop verborgen.");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Sichtbarkeit konnte nicht geändert werden.");
                    }
                  });
                }}
                onRemoveToken={(tokenId) => {
                  startTransition(async () => {
                    try {
                      await removeBattlemapToken(tokenId, sessionId);
                      setBattlemapTokens((prev) => prev.filter((t) => t.id !== tokenId));
                      setSelectedBattlemapTokenId(null);
                      setGmMoveTokenId(null);
                      notifyBattlemapTokensChanged({ op: "delete", tokenId });
                      toast.success("Token entfernt.");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Token konnte nicht entfernt werden.");
                    }
                  });
                }}
                onRemoveProp={(propId) => {
                  startTransition(async () => {
                    try {
                      await removeBattlemapProp(propId, sessionId);
                      setSelectedBattlemapPropId(null);
                      toast.success("Prop entfernt.");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Prop konnte nicht entfernt werden.");
                    }
                  });
                }}
                hpByRef={battlemapTokenHpByRef}
                activeTurnHighlight={activeTurnHighlight}
                ownCharacterId={currentPlayerCharacter?.id ?? null}
                characterDisplayUrlById={characterDisplayUrlById}
                characterConditionsById={characterConditionsById}
                onTokenContextMenu={(token, clientX, clientY) => {
                  setSelectedBattlemapTokenId(token.id);
                  if (token.character_id) {
                    setTokenRadial(null);
                    dispatchOpenCharacterRadial({
                      characterId: token.character_id,
                      clientX,
                      clientY,
                      battlemapToken: {
                        tokenId: token.id,
                        showHpBar: token.show_hp_bar === true,
                        sizeCells: token.size_cells,
                      },
                    });
                    return;
                  }
                  setTokenRadial({ token, x: clientX, y: clientY });
                }}
              />
            ) : null}
            {activeWorldMapId && worldId ? (
              <LiveWorldMapOverlay
                worldMapId={activeWorldMapId}
                worldId={worldId}
                campaignId={campaignId}
                isGm={isGM}
                onClose={
                  isGM
                    ? () => {
                        startTransition(async () => {
                          try {
                            await setActiveWorldMap(sessionId, null);
                            setLiveState((prev) => {
                              if (!prev) return prev;
                              const next = normalizeLiveRow({
                                ...prev,
                                active_world_map_id: null,
                              });
                              liveStateRef.current = next;
                              return next;
                            });
                          } catch (e) {
                            toast.error(
                              e instanceof Error
                                ? e.message
                                : "Weltkarte konnte nicht geschlossen werden.",
                            );
                          }
                        });
                      }
                    : undefined
                }
              />
            ) : null}
            {isGM && battlemapActive ? (
              <div className="pointer-events-none absolute bottom-3 right-3 z-[35] max-w-[min(100%-1.5rem,28rem)]">
                <BattlemapTokenTray
                  npcs={[]}
                  creatures={[]}
                  scenes={battlemapTrayScenes}
                  onStartTokenPlacement={() => undefined}
                  onStartPropDrag={(draft) => {
                    if (!activeBattlemapId) return;
                    startTransition(async () => {
                      try {
                        await createBattlemapProp({
                          sessionId,
                          battlemapId: activeBattlemapId,
                          kind: draft.kind,
                          npcId: draft.npcId ?? null,
                          sceneMediaId: draft.sceneMediaId ?? null,
                          imageUrl: draft.imageUrl,
                          posX: 0.35,
                          posY: 0.35,
                          width: draft.width,
                          height: draft.height,
                        });
                        toast.success(`${draft.label} auf die Map gelegt.`);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Prop konnte nicht erstellt werden.");
                      }
                    });
                  }}
                />
              </div>
            ) : null}
            <div className="pointer-events-none absolute inset-0 bg-radial-[ellipse_at_center] from-black/10 via-black/30 to-black/70" />
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
              {weatherCondition === "sun" ? (
                <div className="absolute right-0 top-0 h-64 w-72">
                  {[0, 1, 2, 3].map((idx) => (
                    <motion.div
                      key={idx}
                      className="absolute rounded-full bg-amber-100/20 blur-2xl mix-blend-screen"
                      style={{
                        width: 90 + idx * 28,
                        height: 90 + idx * 28,
                        right: `${idx * 12}%`,
                        top: `${idx * 10}%`,
                      }}
                      animate={{
                        rotate: [0, 12, 0],
                        scale: [1, 1.08, 1],
                        x: [0, -8 + idx * 2, 0],
                        y: [0, 6 - idx * 2, 0],
                      }}
                      transition={{
                        duration: 18 + idx * 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              ) : null}
              {weatherCondition === "rain" || weatherCondition === "storm" ? (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  {RAIN_DROPS.map((drop) => (
                    <motion.span
                      key={drop.id}
                      aria-hidden="true"
                      className="absolute top-[-12%] block w-0.5 rounded-full bg-sky-100/70 shadow-[0_0_5px_rgba(186,230,253,0.65)]"
                      style={
                        {
                          left: drop.left,
                          height: drop.height,
                          opacity: drop.opacity,
                        } as CSSProperties
                      }
                      animate={{
                        x: [0, drop.drift],
                        y: ["0vh", "118vh"],
                      }}
                      transition={{
                        duration: drop.duration,
                        delay: drop.delay,
                        ease: "linear",
                        repeat: Infinity,
                      }}
                    />
                  ))}
                </div>
              ) : null}
              {weatherCondition === "snow" ? <div className="th-weather-snow" /> : null}
              {weatherCondition === "storm" ? (
                <motion.div
                  key={lightningPulseKey}
                  aria-hidden="true"
                  className="absolute inset-0 bg-white mix-blend-screen"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.42, 0] }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                />
              ) : null}
            </div>
            {liveState?.is_combat_mode ? (
              <div className="absolute inset-x-0 top-3 z-20 flex justify-center px-3">
                <CombatInitiativeHud
                  participants={sortedCombatParticipants}
                  combatStarted={combatStarted}
                  combatRound={Math.max(1, Number(liveState?.combat_round ?? 1) || 1)}
                  currentTurnIndex={Math.max(
                    0,
                    Number(liveState?.current_turn_index ?? 0) || 0,
                  )}
                  activeParticipantId={activeCombatParticipant?.id ?? null}
                  isGM={isGM}
                  ownCharacterName={currentPlayerCharacter?.name ?? null}
                  rollingParticipantId={rollingInitiativeId}
                  onRollInitiative={handleRollInitiative}
                  onStartCombat={beginCombatEncounter}
                  onEndCombat={endCombatEncounter}
                  onEndTurn={handlePlayerEndTurn}
                  onPrevTurn={prevCombatTurn}
                  onNextTurn={nextCombatTurn}
                  onUpdateInitiative={async (participantId, label) => {
                    try {
                      await setCombatInitiative({
                        sessionId,
                        participantId,
                        initiativeLabel: label,
                      });
                      const parsed = parseInitiativeLabel(label);
                      setCombatParticipants((prev) =>
                        prev.map((p) =>
                          p.id === participantId
                            ? {
                                ...p,
                                initiative_value: parsed.base,
                                initiative_label: parsed.display,
                              }
                            : p,
                        ),
                      );
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Initiative konnte nicht gespeichert werden.",
                      );
                    }
                  }}
                />
              </div>
            ) : null}
            {!stageHasDeckContent ? (
              <div className="pointer-events-none relative z-[1] flex h-full min-h-[calc(48vh+120px)] items-center justify-center px-4 text-center">
                <p className="max-w-md rounded-lg border border-white/10 bg-black/45 px-5 py-4 font-libre text-sm text-gray-300 backdrop-blur-sm">
                  {isGM
                    ? "Noch nichts auf der Bühne. Ziehe Karten aus dem Deck unten hierher oder nutze Stage live."
                    : "Noch nichts auf der Bühne. Der Spielleiter kann NPCs und Fraktionen aktivieren."}
                </p>
              </div>
            ) : (
              <div
                className={`relative z-10 flex min-h-full flex-col justify-start gap-8 px-5 md:px-8 ${
                  partyTrayMode === "hidden"
                    ? "pb-10 md:pb-12"
                    : partyTrayMode === "compact"
                      ? "pb-40 md:pb-44"
                      : "pb-72 md:pb-80"
                } ${
                  liveState?.is_combat_mode ? "pt-44" : "pt-[60px]"
                }`}
              >
                {!isGuest && liveState?.active_shop_id ? (
                  <LiveStageShopOverlay
                    campaignId={campaignId}
                    shopId={liveState.active_shop_id}
                    merchantNpcId={liveState.active_merchant_npc_id ?? null}
                    characterId={currentPlayerCharacter?.id ?? null}
                    isGM={isGM}
                    partyCharacters={displayPartyCharacters
                      .filter((pc) => !pc.isSessionDummy && pc.id)
                      .map((pc) => ({
                        id: pc.id,
                        name: pc.name,
                        playerUserId: pc.playerUserId ?? null,
                      }))}
                    onClose={
                      isGM
                        ? () =>
                            updateLiveState({
                              active_shop_id: null,
                              active_merchant_npc_id: null,
                            })
                        : undefined
                    }
                  />
                ) : null}
                {liveState?.current_loot_id ? (
                  <div className="relative z-20 w-full shrink-0 overflow-x-visible overflow-y-visible py-1">
                    <StageLootItemCards
                      sessionId={sessionId}
                      campaignId={campaignId}
                      containerId={liveState.current_loot_id}
                      characterId={currentPlayerCharacter?.id ?? null}
                      isGM={isGM}
                      isCombatMode={!!liveState?.is_combat_mode}
                    />
                  </div>
                ) : null}
                {activeSceneMedia ? (
                  <div className="mb-6 flex justify-center px-2">
                    <StageSceneCard
                      scene={activeSceneMedia}
                      isGM={isGM}
                      onPortrait={setStagePortrait}
                      onRemove={
                        isGM
                          ? () => removeFromStage("scene", String(activeSceneMedia.id))
                          : undefined
                      }
                    />
                  </div>
                ) : null}
                <StageRosterCollapse
                  open={stageRosterOpen}
                  onToggle={() => setStageRosterOpen((v) => !v)}
                  npcCount={liveState?.loot_hide_npcs ? 0 : sortedActiveNpcs.length}
                  creatureCount={activeCreatures.length}
                  factionCount={activeFactions.length}
                  previewItems={stageRosterPreview}
                >
                {sortedActiveNpcs.length > 0 && !liveState?.loot_hide_npcs ? (
                  <div
                    className={
                      sortedActiveNpcs.length === 1
                        ? "flex justify-center"
                        : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                    }
                  >
                    <AnimatePresence mode="popLayout">
                      {sortedActiveNpcs.map((npc) => {
                        const reactionsForNpc = npcReactions.filter(
                          (reaction) => reaction.npcId === String(npc.id),
                        );
                        return (
                          <StageNpcCard
                            key={npc.id}
                            npc={npc}
                            isSingle={sortedActiveNpcs.length === 1}
                            isGM={isGM}
                            isCombatMode={!!liveState?.is_combat_mode}
                            isInInitiative={combatParticipantNpcIds.has(String(npc.id))}
                            isActiveTurn={isNpcActiveCombatTurn(String(npc.id), activeTurnHighlight)}
                            isUpdating={isUpdating}
                            reputationScore={npcReputationScores[String(npc.id)] ?? 0}
                            reactions={reactionsForNpc}
                            onPortrait={setStagePortrait}
                            onReaction={handleNpcReaction}
                            onRemove={(npcId) => removeFromStage("npc", npcId)}
                            onToggleShop={toggleShopForNpc}
                            onAssignMerchantAndOpen={assignMerchantAndOpenShop}
                            onDragCombatToken={dragCombatToken}
                            campaignShops={campaignShops}
                            isShopOpen={
                              liveState?.active_shop_id === npc.shop_id &&
                              liveState?.active_merchant_npc_id === String(npc.id)
                            }
                            isShopBusy={isShopBusy}
                            linkedToStageFaction={
                              Boolean(npc.faction_id) && activeFactionIds.has(String(npc.faction_id))
                            }
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : null}

                {activeCreatures.length > 0 ? (
                  <div
                    className={
                      activeCreatures.length === 1
                        ? "flex justify-center mb-6"
                        : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 mb-6"
                    }
                  >
                    <AnimatePresence mode="popLayout">
                      {activeCreatures.map((creature) => {
                        const state = creatureStates[String(creature.id)];
                        const discoveries = state?.discoveries ?? {};
                        return (
                          <StageBeastCard
                            key={creature.id}
                            creature={creature}
                            isSingle={activeCreatures.length === 1}
                            isGM={isGM}
                            isActiveTurn={isCreatureActiveCombatTurn(creature.name, activeTurnHighlight)}
                            isUpdating={isUpdating}
                            discoveries={isGM ? discoveries : discoveries}
                            creatureState={state}
                            onPortrait={setStagePortrait}
                            onRemove={(creatureId) => removeFromStage("creature", creatureId)}
                            onToggleDiscovery={
                              isGM
                                ? (key: BeastDiscoveryKey, value: boolean) => {
                                    void (async () => {
                                      try {
                                        await setCreatureDiscovery(
                                          campaignId,
                                          String(creature.id),
                                          key,
                                          value,
                                        );
                                        setCreatureStates((prev) => ({
                                          ...prev,
                                          [String(creature.id)]: {
                                            creature_id: String(creature.id),
                                            discoveries: {
                                              ...(prev[String(creature.id)]?.discoveries ?? {}),
                                              [key]: value,
                                            },
                                            is_defeated:
                                              prev[String(creature.id)]?.is_defeated ?? false,
                                            defeated_at:
                                              prev[String(creature.id)]?.defeated_at ?? null,
                                          },
                                        }));
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    })();
                                  }
                                : undefined
                            }
                            onMarkDefeated={
                              isGM
                                ? () => {
                                    void (async () => {
                                      try {
                                        await setCreatureDefeated(
                                          campaignId,
                                          String(creature.id),
                                          sessionId,
                                          true,
                                        );
                                        setCreatureStates((prev) => ({
                                          ...prev,
                                          [String(creature.id)]: {
                                            creature_id: String(creature.id),
                                            discoveries: prev[String(creature.id)]?.discoveries ?? {},
                                            is_defeated: true,
                                            defeated_at: new Date().toISOString(),
                                          },
                                        }));
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    })();
                                  }
                                : undefined
                            }
                            onSuggestLoot={
                              isGM && state?.is_defeated
                                ? () => setBeastLootCreatureId(String(creature.id))
                                : undefined
                            }
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : null}

                {activeFactions.length > 0 && (
                  <div className="rounded-xl border border-amber-900/40 bg-black/35 p-4 backdrop-blur-sm">
                    <h3 className="font-barlow font-bold text-xs uppercase text-gray-300 mb-3 flex items-center gap-2">
                      <Flag className="h-3.5 w-3.5 text-accent-gold" />
                      Aktive Fraktionen
                    </h3>
                    <div
                      className={
                        activeFactions.length === 1
                          ? "flex justify-center"
                          : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                      }
                    >
                      <AnimatePresence mode="popLayout">
                        {activeFactions.map((fac) => {
                          return (
                            <StageFactionCard
                              key={fac.id}
                              faction={fac}
                              isSingle={activeFactions.length === 1}
                              isGM={isGM}
                              isCombatMode={!!liveState?.is_combat_mode}
                              campaignId={campaignId}
                              onPortrait={setStagePortrait}
                              onRemove={(factionId) => removeFromStage("faction", factionId)}
                            />
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
                </StageRosterCollapse>

              </div>
            )}
            </div>

          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-50 overflow-visible bg-transparent px-4 ${
              partyTrayMode === "hidden" ? "pb-1.5 pt-1.5" : "pb-1"
            }`}
          >
            <div className="pointer-events-auto mb-1 flex items-center justify-end gap-1">
              <span className="mr-1 hidden font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-500 sm:inline">
                Helden
              </span>
              <button
                type="button"
                onClick={() => setPartyTrayMode("full")}
                title="Volle Avatar-Leiste"
                aria-label="Volle Avatar-Leiste"
                aria-pressed={partyTrayMode === "full"}
                className={`grid h-7 w-7 place-items-center rounded border transition-colors ${
                  partyTrayMode === "full"
                    ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                    : "border-amber-900/50 bg-background-dark/70 text-gray-400 hover:border-hero-vibrant/60 hover:text-hero-vibrant"
                }`}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPartyTrayMode("compact")}
                title="Kompakte Avatar-Leiste"
                aria-label="Kompakte Avatar-Leiste"
                aria-pressed={partyTrayMode === "compact"}
                className={`grid h-7 w-7 place-items-center rounded border transition-colors ${
                  partyTrayMode === "compact"
                    ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                    : "border-amber-900/50 bg-background-dark/70 text-gray-400 hover:border-hero-vibrant/60 hover:text-hero-vibrant"
                }`}
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPartyTrayMode("hidden")}
                title="Avatar-Leiste ausblenden"
                aria-label="Avatar-Leiste ausblenden"
                aria-pressed={partyTrayMode === "hidden"}
                className={`grid h-7 w-7 place-items-center rounded border transition-colors ${
                  partyTrayMode === "hidden"
                    ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                    : "border-amber-900/50 bg-background-dark/70 text-gray-400 hover:border-hero-vibrant/60 hover:text-hero-vibrant"
                }`}
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>
            </div>

            {partyTrayMode === "hidden" ? null : displayPartyCharacters.length === 0 ? (
              <div className="pointer-events-auto space-y-1 py-3">
                <p className="font-libre text-xs text-gray-400">
                  Hier erscheinen Charaktere von Spielern, die für diesen Termin zugesagt haben
                  oder vom GM freigegeben wurden.
                </p>
                <p className="font-libre text-[10px] text-gray-500">
                  Wenn die Liste leer bleibt: In Supabase die Funktion{" "}
                  <code className="text-gray-400">get_session_party_tray</code>{" "}
                  aus der Migration ausführen.
                </p>
              </div>
            ) : (
              <div className="pointer-events-auto relative z-[60] flex justify-center px-1">
                <div className="w-fit max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div
                    className={`flex justify-center ${
                      partyTrayMode === "compact" ? "gap-3 px-4 py-1" : "gap-5 px-6 py-1"
                    }`}
                  >
                {displayPartyCharacters.map((pc) => {
                  const pid = pc.playerUserId ? String(pc.playerUserId) : "";
                  const isGuestSelf =
                    isGuest && pc.isSessionDummy && pc.guestId === userId;
                  const self = pid === userId || isGuestSelf;
                  const onDeck =
                    Boolean(pc.isSessionDummy) ||
                    !pid ||
                    self ||
                    presentUserIds.has(pid) ||
                    physicallyPresentIdSet.has(pid);
                  const isScribe = !!pid && liveState?.scribe_id === pid;
                  const canOpenInventory =
                    !isGuest &&
                    ((actualUserIsGM && !forcePlayerView) || pid === userId) &&
                    !pc.isSessionDummy;
                  const canInteractAvatar =
                    canOpenInventory && showDnd5eSheet;
                  const isActiveTurn =
                    combatStarted &&
                    activeCombatParticipant?.type === "player" &&
                    activeCombatParticipant.name === pc.name &&
                    !pc.isSessionDummy;
                  const handRaise =
                    handRaises.find(
                      (r) =>
                        (pid && r.userId === pid) ||
                        (r.characterId != null && r.characterId === pc.id),
                    ) ?? null;
                  const playerColor = playerColorByCharacterId[pc.id] ?? FALLBACK_PLAYER_COLOR;
                  const compact = partyTrayMode === "compact";
                  return (
                    <motion.div
                      key={pc.id}
                      className={`relative flex shrink-0 flex-col items-center pt-2 transition-[opacity,filter,transform] duration-200 ${
                        compact ? "w-[118px]" : "w-[272px] pt-4"
                      } ${onDeck ? "" : "opacity-50 grayscale"}`}
                      animate={
                        isActiveTurn
                          ? {
                              y: [0, compact ? -3 : -6, 0],
                              filter: [
                                "drop-shadow(0 0 0 rgba(202,185,38,0))",
                                "drop-shadow(0 0 18px rgba(202,185,38,0.85))",
                                "drop-shadow(0 0 0 rgba(202,185,38,0))",
                              ],
                            }
                          : { y: 0 }
                      }
                      transition={
                        isActiveTurn
                          ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                          : { duration: 0.2 }
                      }
                    >
                      {isActiveTurn ? (
                        <span
                          className={`mb-1 rounded-full border border-accent-gold bg-accent-gold/20 font-barlow font-extrabold uppercase tracking-wide text-accent-gold shadow-[0_0_18px_rgba(202,185,38,0.65)] ${
                            compact
                              ? "px-2 py-0.5 text-[8px]"
                              : "mb-2 px-4 py-1 text-xs"
                          }`}
                        >
                          {activeCombatParticipant?.name === pc.name && currentPlayerCharacter?.id === pc.id
                            ? "Du bist am Zug"
                            : "Am Zug"}
                        </span>
                      ) : null}
                      <div
                        className={`relative drop-shadow-2xl ${
                          compact ? "h-32 w-28" : "h-64 w-56"
                        }`}
                      >
                        <Image
                          src="/images/Session_ui/player-frame.png?v=20260429-freigestellt"
                          alt=""
                          fill
                          sizes={compact ? "112px" : "224px"}
                          className="pointer-events-none object-contain object-bottom"
                          priority={false}
                          unoptimized
                        />
                        <div
                          className={`absolute z-30 flex flex-col items-center justify-end text-center ${
                            compact
                              ? "inset-x-2 bottom-5 top-5"
                              : "inset-x-3 bottom-7 top-8"
                          }`}
                        >
                          <LiveSessionCharacterAvatar
                            sessionId={sessionId}
                            campaignId={campaignId}
                            characterId={pc.id}
                            characterName={pc.name}
                            className={pc.class}
                            fallbackAvatarUrl={pc.avatar_url}
                            avatarDisplay={pc.avatar_display}
                            isDummy={pc.isSessionDummy}
                            isGm={isGM}
                            density={compact ? "compact" : "full"}
                            canInteract={
                              canInteractAvatar &&
                              (pid === userId || isGM)
                            }
                            showDnd5eSheet={showDnd5eSheet}
                            battlemapActive={battlemapActive}
                            onStartTokenPlacement={
                              battlemapActive &&
                              !pc.isSessionDummy &&
                              (isGM || !liveState?.battlemap_movement_paused)
                                ? () => startCharacterTokenPlacement(pc.id, pc.name)
                                : undefined
                            }
                            battlemapToken={(() => {
                              const t = battlemapTokens.find(
                                (tok) => tok.character_id === pc.id,
                              );
                              if (!t) return null;
                              return {
                                id: t.id,
                                showHpBar: t.show_hp_bar === true,
                                sizeCells: t.size_cells,
                              };
                            })()}
                            onBattlemapTokenSaved={(updated) => {
                              setBattlemapTokens((prev) =>
                                prev.map((tok) =>
                                  tok.id === updated.id ? { ...tok, ...updated } : tok,
                                ),
                              );
                              notifyBattlemapTokensChanged({ op: "upsert", token: updated });
                            }}
                            combatMode={!!liveState?.is_combat_mode}
                            canJoinCombat={
                              !pc.isSessionDummy &&
                              !combatParticipantNames.has(pc.name)
                            }
                            onJoinCombat={
                              isGM && liveState?.is_combat_mode && !pc.isSessionDummy
                                ? () => {
                                    void addCombatToken({
                                      type: "player",
                                      name: pc.name,
                                      image_url: pc.avatar_url,
                                    });
                                  }
                                : undefined
                            }
                          />
                        </div>
                        {handRaise ? (
                          <span
                            title={handRaise.urgent ? "Dringend gemeldet" : "Meldet sich"}
                            className={`absolute left-1/2 z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-full border shadow-lg ${
                              compact ? "top-2 px-1.5 py-0.5" : "top-4 px-2 py-1"
                            } ${
                              handRaise.urgent
                                ? "border-accent-gold bg-accent-blood/90 text-accent-gold"
                                : "bg-background-dark/90"
                            }`}
                            style={
                              handRaise.urgent
                                ? undefined
                                : {
                                    borderColor: playerColor,
                                    color: playerColor,
                                  }
                            }
                          >
                            <Hand className={compact ? "h-3 w-3" : "h-4 w-4"} />
                            {handRaise.urgent ? (
                              <span className="font-barlow text-[10px] font-bold">!</span>
                            ) : null}
                          </span>
                        ) : null}
                        {isScribe && (
                          <span
                            title="Chronist"
                            className={`absolute z-20 text-accent-gold drop-shadow-[0_0_6px_rgba(202,185,38,0.9)] ${
                              compact
                                ? "right-3 top-3 text-sm"
                                : "right-7 top-6 text-xl"
                            }`}
                          >
                            🪶
                          </span>
                        )}
                        {isGM && pid ? (
                          <button
                            type="button"
                            onClick={() => assignScribe(isScribe ? null : pid)}
                            className={`absolute z-30 rounded-full border transition-colors ${
                              compact ? "right-2 top-2 p-1 text-[10px]" : "right-6 top-6 p-2 text-sm"
                            } ${
                              isScribe
                                ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                                : "border-amber-900/60 bg-background-dark/85 text-gray-300 hover:text-accent-gold"
                            }`}
                            title={isScribe ? "Chronist entfernen" : "Als Chronist setzen"}
                            aria-label={isScribe ? "Chronist entfernen" : "Als Chronist setzen"}
                          >
                            <Feather className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                          </button>
                        ) : null}
                        {canOpenInventory ? (
                          <button
                            type="button"
                            onClick={() => setInventoryCharacter(pc)}
                            className={`absolute z-20 cursor-pointer transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent-gold ${
                              compact
                                ? "-left-3 top-[38px]"
                                : "-left-8 top-[70px]"
                            }`}
                            title={`Rucksack von ${pc.name} öffnen`}
                            aria-label={`Rucksack von ${pc.name} öffnen`}
                          >
                            <Image
                              src="/images/Session_ui/rucksack.png"
                              alt=""
                              width={compact ? 40 : 88}
                              height={compact ? 40 : 88}
                              className="drop-shadow-[0_3px_5px_rgba(0,0,0,0.85)]"
                            />
                          </button>
                        ) : null}
                        <div
                          className={`absolute inset-x-1 z-40 px-1 text-center leading-none ${
                            compact ? "bottom-0.5" : "bottom-1"
                          }`}
                        >
                          <p
                            className={`truncate font-barlow font-bold uppercase tracking-wide drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)] ${
                              compact ? "text-[9px]" : "text-[11px]"
                            }`}
                            style={{ color: playerColor }}
                            title={`${pc.name} ( ${pc.level || 1} )`}
                          >
                            {pc.name}{" "}
                            <span className="font-semibold text-accent-gold">
                              ( {pc.level || 1} )
                            </span>
                          </p>
                          {!compact && pc.isSessionDummy ? (
                            <p className="mt-0.5 font-libre text-[9px] leading-none text-gray-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.85)]">
                              Platzhalter
                            </p>
                          ) : null}
                          {!compact && pid && !self && !onDeck ? (
                            <p className="mt-0.5 font-libre text-[9px] leading-none text-amber-300/90">
                              Nicht online
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        {showGmDeckHand ? (
          <StageDeckHand
            open={stageDeckHandOpen}
            onToggle={() => setStageDeckHandOpen((v) => !v)}
            npcs={inHandNpcs}
            factions={inHandFactions}
            scenes={inHandScenes}
            onPlace={placeOnStage}
          />
        ) : null}
      </div>

      {isGM ? (
        <GmNpcSearchModal
          open={npcSearchModalOpen}
          onClose={() => setNpcSearchModalOpen(false)}
          npcs={gmNpcSearchRows}
          stageDeckNpcIds={stageDeckNpcIds}
          currentLocationLoreId={liveState?.current_location_lore_id ?? null}
          activeNpcIds={activeNpcIds}
          onPlaceOnStage={(id) => {
            placeOnStage("npc", id);
          }}
        />
      ) : null}

      {isGM ? (
        <GmBeastSearchModal
          open={beastSearchModalOpen}
          onClose={() => setBeastSearchModalOpen(false)}
          creatures={gmBeastSearchRows}
          stageDeckCreatureIds={stageDeckCreatureIds}
          activeCreatureIds={activeCreatureIds}
          onPlaceOnStage={(id) => {
            placeOnStage("creature", id);
            setBeastSearchModalOpen(false);
          }}
        />
      ) : null}

      {isGM && beastLootCreatureId ? (
        <BeastDefeatLootModal
          open
          creatureName={
            allCampaignCreatures.find((c) => String(c.id) === beastLootCreatureId)?.name ??
            "Kreatur"
          }
          onClose={() => setBeastLootCreatureId(null)}
          onAccept={(suggestion) => {
            writeSystemLog(
              "loot_suggestion",
              `Loot-Vorschlag für besiegte Kreatur: ${suggestion.name} (${suggestion.items.length} Gegenstände).`,
            );
            setBeastLootCreatureId(null);
          }}
        />
      ) : null}

      {inventoryCharacter ? (
        <PrivateInventoryModal
          character={{
            id: inventoryCharacter.id,
            name: inventoryCharacter.name,
            class: inventoryCharacter.class,
            level: inventoryCharacter.level,
            avatar_url: inventoryCharacter.avatar_url,
          }}
          onClose={() => setInventoryCharacter(null)}
          gmRationsDistribution={
            isGM
              ? {
                  sessionId,
                  partyCharacters: partyCharacters.map((pc) => ({
                    id: pc.id,
                    name: pc.name,
                    rations_count: pc.rations_count ?? 0,
                    starvation_days: pc.starvation_days ?? 0,
                  })),
                  onDistributed: async () => {
                    await refreshLiveState();
                    router.refresh();
                  },
                }
              : undefined
          }
        />
      ) : null}

      {sheetCharacter && showDnd5eSheet ? (
        <Dnd5eCharacterSheetModalWithLocale
          campaignId={campaignId}
          character={{
            id: sheetCharacter.id,
            name: sheetCharacter.name,
            class: sheetCharacter.class,
            level: sheetCharacter.level,
          }}
          liveSessionMode
          onSaved={() => {
            void refreshLiveState();
            router.refresh();
          }}
          onClose={() => setSheetCharacter(null)}
        />
      ) : null}



      <DiceRollOverlay
        logs={systemLogs as import("@/src/lib/actions/session-activity-actions").SessionActivityEntry[]}
      />

      {tokenRadial && !tokenRadial.token.character_id ? (
        <BattlemapTokenRadialMenu
          token={tokenRadial.token}
          anchor={{ x: tokenRadial.x, y: tokenRadial.y }}
          isGm={isGM}
          hpCurrent={
            tokenRadial.token.character_id
              ? battlemapTokenHpByRef[`char:${tokenRadial.token.character_id}`]?.current
              : tokenRadial.token.npc_id
                ? battlemapTokenHpByRef[`npc:${tokenRadial.token.npc_id}`]?.current
                : null
          }
          hpMax={
            tokenRadial.token.character_id
              ? battlemapTokenHpByRef[`char:${tokenRadial.token.character_id}`]?.max
              : tokenRadial.token.npc_id
                ? battlemapTokenHpByRef[`npc:${tokenRadial.token.npc_id}`]?.max
                : null
          }
          onClose={() => setTokenRadial(null)}
          onMove={
            isGM && !tokenRadial.token.character_id
              ? () => {
                  setGmMoveTokenId(tokenRadial.token.id);
                  setGmTokenPlacement(null);
                  setTokenPlacement(null);
                }
              : isGM && tokenRadial.token.character_id
                ? () => {
                    const ch = partyCharacters.find(
                      (p) => p.id === tokenRadial.token.character_id,
                    );
                    if (ch) startCharacterTokenPlacement(ch.id, ch.name);
                  }
                : undefined
          }
          onToggleVisibility={
            isGM
              ? (visible) => {
                  startTransition(async () => {
                    try {
                      const updated = await toggleBattlemapTokenVisibility(
                        tokenRadial.token.id,
                        sessionId,
                        visible,
                      );
                      setBattlemapTokens((prev) =>
                        prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
                      );
                      notifyBattlemapTokensChanged({ op: "upsert", token: updated });
                      toast.success(visible ? "Token sichtbar." : "Token verborgen.");
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Sichtbarkeit fehlgeschlagen.",
                      );
                    }
                  });
                }
              : undefined
          }
          onRemove={
            isGM
              ? () => {
                  startTransition(async () => {
                    try {
                      const tokenId = tokenRadial.token.id;
                      await removeBattlemapToken(tokenId, sessionId);
                      setBattlemapTokens((prev) => prev.filter((t) => t.id !== tokenId));
                      setSelectedBattlemapTokenId(null);
                      notifyBattlemapTokensChanged({ op: "delete", tokenId });
                      toast.success("Token entfernt.");
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Entfernen fehlgeschlagen.",
                      );
                    }
                  });
                }
              : undefined
          }
          canJoinCombat={(() => {
            if (!liveState?.is_combat_mode || !isGM) return false;
            const payload = battlemapTokenToCombatPayload(tokenRadial.token);
            if (!payload) return false;
            return !isCombatTokenUsed(
              payload,
              combatParticipantNames,
              combatParticipantNpcIds,
            );
          })()}
          onJoinCombat={
            isGM && liveState?.is_combat_mode
              ? () => {
                  const payload = battlemapTokenToCombatPayload(tokenRadial.token);
                  if (payload) void addCombatToken(payload);
                }
              : undefined
          }
          onSaveSettings={(settings) => {
            startTransition(async () => {
              try {
                const updated = await updateBattlemapTokenSettings({
                  tokenId: tokenRadial.token.id,
                  sessionId,
                  showHpBar: settings.showHpBar,
                  sizeCells: settings.sizeCells,
                });
                setBattlemapTokens((prev) =>
                  prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
                );
                notifyBattlemapTokensChanged({ op: "upsert", token: updated });
                toast.success("Token-Einstellungen gespeichert.");
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : "Einstellungen fehlgeschlagen.",
                );
              }
            });
          }}
        />
      ) : null}

      <LiveSessionLeftDock
        panel={leftPanel}
        onToggle={toggleLeftPanel}
        onClose={closeLeftPanel}
        isGM={isGM && !forcePlayerView}
        showDice={!isGuest}
        diceOpen={isDiceOpen}
        onToggleDice={() => {
          setIsDiceOpen((v) => !v);
          setLeftPanel(null);
          setTopPanel(null);
        }}
        diceContent={
          !isGuest ? (
            <LiveSessionDicePanel
              embedded
              sessionId={sessionId}
              campaignId={campaignId}
              open={isDiceOpen}
              onClose={() => setIsDiceOpen(false)}
              currentCharacter={activityCharacter}
              userId={userId}
              isGM={isGM && !forcePlayerView}
              isPrepMode={isPrepMode}
              prepTestCharacters={
                isPrepMode && isGM && !forcePlayerView && !currentPlayerCharacter
                  ? partyCharacters
                      .filter((pc) => !pc.isSessionDummy)
                      .map((pc) => ({ id: pc.id, name: pc.name }))
                  : undefined
              }
              prepTestCharacterId={prepTestCharacterId}
              onPrepTestCharacterChange={setPrepTestCharacterId}
              onActivityPosted={(entry) => {
                setLiveState((prev) => {
                  if (!prev) return prev;
                  const logs = Array.isArray(prev.system_logs) ? prev.system_logs : [];
                  if (logs.some((l) => l.id === entry.id)) return prev;
                  const next = {
                    ...prev,
                    system_logs: [...logs, entry].slice(-120),
                  };
                  liveStateRef.current = next;
                  return next;
                });
              }}
            />
          ) : null
        }
        weatherIcon={
          <WeatherPngIcon option={weatherVisual} sizeClassName="h-full w-full" />
        }
        weatherLabel={weatherVisual.label}
        dayPhase={dayPhase}
        temperatureValue={temperatureValue}
        chronistRecording={chronicleRecorder.phase === "recording"}
        tableMarked={physicallyPresentIdSet.size > 0 || dummyPlayerCountLive > 0}
        battlemapActive={battlemapActive}
        fogTool={fogTool}
        selectedFogShapeId={selectedFogShapeId}
        onFogToolChange={(tool) => {
          setFogTool(tool);
          if (tool) {
            setEffectTool(null);
            setSelectedEffectTemplateId(null);
            setMarkerTool(null);
            setSelectedMarkerId(null);
            setTrapTool(null);
            setSelectedTrapId(null);
            setLeftPanel(null);
            setTokenPlacement(null);
            setGmTokenPlacement(null);
            setGmMoveTokenId(null);
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
          }
          if (tool !== "select") setSelectedFogShapeId(null);
        }}
        effectTool={effectTool}
        selectedEffectTemplateId={selectedEffectTemplateId}
        onEffectToolChange={(tool) => {
          setEffectTool(tool);
          if (tool) {
            setFogTool(null);
            setSelectedFogShapeId(null);
            setMarkerTool(null);
            setSelectedMarkerId(null);
            setTrapTool(null);
            setSelectedTrapId(null);
            setLeftPanel(null);
            setTokenPlacement(null);
            setGmTokenPlacement(null);
            setGmMoveTokenId(null);
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
          }
          if (tool !== "select") setSelectedEffectTemplateId(null);
        }}
        markerTool={markerTool}
        selectedMarkerId={selectedMarkerId}
        onMarkerToolChange={(tool) => {
          setMarkerTool(tool);
          if (tool) {
            setFogTool(null);
            setSelectedFogShapeId(null);
            setEffectTool(null);
            setSelectedEffectTemplateId(null);
            setTrapTool(null);
            setSelectedTrapId(null);
            setLeftPanel(null);
            setTokenPlacement(null);
            setGmTokenPlacement(null);
            setGmMoveTokenId(null);
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
          }
          if (tool !== "select") setSelectedMarkerId(null);
        }}
        onMarkerDelete={() => {
          const fallbackId =
            selectedMarkerId ??
            (battlemapMarkers.length > 0
              ? battlemapMarkers[battlemapMarkers.length - 1]?.id
              : null);
          if (!fallbackId) {
            toast.message("Marker auf der Karte anklicken, dann löschen — oder Entf.");
            return;
          }
          handleMarkerDelete(fallbackId);
        }}
        onMarkerClearAll={handleMarkerClearAll}
        markerCount={battlemapMarkers.length}
        trapTool={trapTool}
        selectedTrapId={selectedTrapId}
        onTrapToolChange={(tool) => {
          setTrapTool(tool);
          if (tool) {
            setFogTool(null);
            setSelectedFogShapeId(null);
            setEffectTool(null);
            setSelectedEffectTemplateId(null);
            setMarkerTool(null);
            setSelectedMarkerId(null);
            setLeftPanel(null);
            setTokenPlacement(null);
            setGmTokenPlacement(null);
            setGmMoveTokenId(null);
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
          }
          if (tool !== "select") setSelectedTrapId(null);
        }}
        onTrapDelete={() => {
          const fallbackId =
            selectedTrapId ??
            (battlemapTraps.length > 0
              ? battlemapTraps[battlemapTraps.length - 1]?.id
              : null);
          if (!fallbackId) {
            toast.message("Falle auf der Karte auswählen, dann löschen.");
            return;
          }
          handleTrapDelete(fallbackId);
        }}
        onTrapClearAll={handleTrapClearAll}
        trapCount={battlemapTraps.length}
        onEffectDelete={() => {
          const fallbackId =
            selectedEffectTemplateId ??
            (battlemapEffectTemplates.length > 0
              ? battlemapEffectTemplates[battlemapEffectTemplates.length - 1]?.id
              : null);
          if (!fallbackId) {
            toast.message("Effekt-Schablone auf der Karte anklicken, dann löschen — oder Entf.");
            return;
          }
          handleEffectTemplateDelete(fallbackId);
        }}
        onEffectClearAll={handleEffectClearAll}
        effectCount={battlemapEffectTemplates.length}
        onFogDelete={() => {
          const fallbackShapeId =
            selectedFogShapeId ??
            (battlemapFogShapes.length > 0
              ? battlemapFogShapes[battlemapFogShapes.length - 1]?.id
              : null);
          if (!fallbackShapeId) {
            toast.message("Fog-Fläche auf der Karte anklicken, dann löschen — oder Entf.");
            return;
          }
          handleFogShapeDelete(fallbackShapeId);
        }}
        onFogClearAll={handleFogClearAll}
        fogCount={battlemapFogShapes.length}
        atmosphereContent={
          <div className="space-y-6">
            <section>
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">
                Wetter
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {WEATHER_ICON_OPTIONS.map((option) => {
                  const active = weatherVisual.id === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        const intensity =
                          normalizeIntensity(liveState?.weather_intensity) ?? 2;
                        const summary = formatWeatherSummary(
                          option.id,
                          intensity,
                          liveState?.weather_temperature ?? null,
                          null,
                        );
                        updateLiveState({
                          weather_preset: option.id,
                          weather_intensity: intensity,
                          weather: summary,
                        });
                        const logByWeather: Partial<Record<WeatherPresetId, string>> = {
                          sun: "Die Wolken reißen auf und goldene Sonnenstrahlen brechen hervor.",
                          rain: "Ein feiner Nieselregen beginnt, die Welt in Grau zu hüllen.",
                          storm: "Ein heftiger Sturm peitscht auf und das Heulen des Windes wird ohrenbetäubend.",
                        };
                        if (logByWeather[option.id]) {
                          writeSystemLog("weather_change", logByWeather[option.id]!);
                        }
                      }}
                      className={`flex items-center justify-center bg-transparent p-0 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent-gold ${
                        active
                          ? "scale-110 drop-shadow-[0_0_10px_rgba(202,185,38,0.8)]"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      title={option.label}
                      aria-label={`Wetter auf ${option.label} setzen`}
                    >
                      <WeatherPngIcon option={option} sizeClassName="h-14 w-14" />
                    </button>
                  );
                })}
              </div>
            </section>
            <section>
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">
                Tageszeit
              </h3>
              <div className="flex justify-center py-2">
                <SessionDayPhaseIndicator phase={dayPhase} />
              </div>
              <label className="mt-2 flex flex-col gap-1">
                <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
                  Phase setzen
                </span>
                <select
                  value={dayPhase}
                  onChange={(e) =>
                    updateLiveState({
                      current_time: sessionDayPhaseLabel(
                        e.target.value as SessionDayPhase,
                      ),
                    })
                  }
                  className="w-full rounded border border-amber-900/60 bg-[#0a1f10] px-2 py-1.5 text-sm text-white outline-none focus:border-accent-gold"
                >
                  {SESSION_DAY_PHASE_ORDER.map((phase) => (
                    <option
                      key={phase}
                      value={phase}
                      className="bg-white text-slate-950"
                    >
                      {sessionDayPhaseLabel(phase)}
                    </option>
                  ))}
                </select>
              </label>
            </section>
            <section>
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">
                Temperatur
              </h3>
              <div className="flex flex-col items-center gap-4">
                <div
                  className="relative h-64 w-28 overflow-hidden"
                  title={`Temperatur: ${temperatureValue} °C`}
                  aria-label={`Temperatur: ${temperatureValue} Grad Celsius`}
                >
                  <div className="absolute bottom-[29%] left-1/2 z-0 h-[49%] w-[12%] -translate-x-1/2 overflow-hidden rounded-full">
                    <motion.div
                      className="absolute bottom-0 left-0 h-full w-full origin-bottom rounded-full shadow-[0_0_18px_rgba(239,68,68,0.65)]"
                      initial={false}
                      animate={{
                        scaleY: getTemperatureFillPercent(temperatureValue) / 100,
                      }}
                      transition={{ type: "spring", damping: 28, stiffness: 180 }}
                      style={{
                        background: getThermometerFillColor(temperatureValue),
                      }}
                    />
                  </div>
                  <Image
                    src="/images/Session_ui/thermometer_frei.png"
                    alt=""
                    fill
                    sizes="96px"
                    className="pointer-events-none absolute inset-0 z-10 object-contain"
                    priority={false}
                  />
                  <span className="absolute inset-x-0 bottom-[10%] z-20 text-center font-barlow text-lg font-extrabold uppercase tracking-wide text-accent-gold drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]">
                    {temperatureValue} °C
                  </span>
                </div>
                <div className="flex w-full min-w-0 flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-barlow text-[10px] font-bold uppercase text-gray-500">
                      Regler
                    </span>
                    <span className="font-barlow text-sm font-extrabold text-accent-gold">
                      {temperatureDraft} °C
                    </span>
                  </div>
                  <input
                    type="range"
                    min={TEMPERATURE_MIN}
                    max={TEMPERATURE_MAX}
                    value={temperatureDraft}
                    onChange={(e) =>
                      setTemperatureDraft(normalizeTemperatureValue(e.target.value))
                    }
                    onMouseUp={() => commitTemperatureValue()}
                    onTouchEnd={() => commitTemperatureValue()}
                    onKeyUp={() => commitTemperatureValue()}
                    onBlur={() => commitTemperatureValue()}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-background-dark/80 accent-accent-gold outline-none"
                  />
                </div>
              </div>
            </section>
          </div>
        }
        chronistContent={
          <div className="space-y-3">
            {isPrepMode ? (
              <>
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full items-center justify-center gap-2 rounded border border-red-500/40 bg-red-950/30 px-3 py-2.5 font-barlow text-xs font-bold uppercase text-red-200/80 disabled:cursor-not-allowed"
                >
                  <Mic className="h-4 w-4" />
                  Aufnahme starten
                </button>
                <p className="font-libre text-[11px] leading-relaxed text-gray-500">
                  Die Aufnahme startest du, sobald die Session live läuft. Hier kannst du
                  Modus und Mikrofon schon testen.
                </p>
                <SessionChronistModeControl
                  sessionId={sessionId}
                  initialMode={activeTranscriptionMode}
                  variant="sidebar"
                  onModeChange={setActiveTranscriptionMode}
                />
                {chronistTableMode ? (
                  <ChronicleMicTestPanel variant="sidebar" monitor={prepMicTest} />
                ) : null}
              </>
            ) : null}
            {sessionStatus === "Live" && !chronistTableMode ? (
              <div className="space-y-2 rounded border border-amber-900/50 bg-amber-950/30 p-3">
                <p className="font-libre text-xs text-amber-100/90">
                  Chronist-Aufnahme ist nur im <strong>Tisch-Modus</strong> verfügbar
                  (Jitsi folgt später). Bitte Modus wechseln:
                </p>
                <SessionChronistModeControl
                  sessionId={sessionId}
                  initialMode={activeTranscriptionMode}
                  variant="sidebar"
                  onModeChange={setActiveTranscriptionMode}
                />
              </div>
            ) : null}
            {sessionStatus === "Live" && chronistTableMode ? (
              <ChronicleRecorderPanel
                sessionId={sessionId}
                plannedMode={activeTranscriptionMode}
                recorder={chronicleRecorder}
                panelOpen={chronistPanelOpen}
                onPanelOpenChange={setChronistPanelOpen}
                layout="inline"
                registerStartFlow={(fn) => {
                  chronistStartFlowRef.current = fn;
                }}
                registerStopFlow={(fn) => {
                  chronistStopFlowRef.current = fn;
                }}
                registerSettingsFlow={(fn) => {
                  chronistSettingsFlowRef.current = fn;
                }}
              />
            ) : null}
            {sessionStatus === "Live" && chronistTableMode ? (
              <ChronicleInboxFeed
                campaignId={campaignId}
                sessionId={sessionId}
                worldId={worldId}
                variant="compact"
                npcNames={allCampaignNpcs.map((n) => ({
                  id: n.id,
                  name: n.name,
                }))}
              />
            ) : null}
          </div>
        }
        tableContent={
          <div className="space-y-4">
            <p className="font-libre text-xs leading-relaxed text-gray-300">
              Bei Hybridrunden: Wenn jemand physisch am Tisch sitzt, aber keinen Browser offen hat,
              markiere den Charakter hier — das Portrait wird dann nicht mehr ausgegraut.
            </p>
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {partyCharacters
                .filter((pc) => pc.playerUserId)
                .map((pc) => {
                  const uid = String(pc.playerUserId);
                  const marked = physicallyPresentIdSet.has(uid);
                  return (
                    <li
                      key={pc.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-background-dark/60 px-3 py-2"
                    >
                      <span className="min-w-0 truncate font-barlow text-sm font-bold text-gray-200">
                        {pc.name}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={marked}
                        aria-label={
                          marked
                            ? `Markierung „Am Tisch“ für ${pc.name} aufheben`
                            : `${pc.name} als physisch am Tisch anwesend markieren`
                        }
                        onClick={() => {
                          const cur = new Set(
                            normalizePhysicallyPresentUserIds(
                              liveStateRef.current?.physically_present_user_ids,
                            ),
                          );
                          if (cur.has(uid)) cur.delete(uid);
                          else cur.add(uid);
                          updateLiveState({
                            physically_present_user_ids: Array.from(cur),
                          });
                        }}
                        className={`shrink-0 rounded-md border px-2.5 py-1.5 font-barlow text-[10px] font-bold uppercase transition-colors ${
                          marked
                            ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                            : "border-white/20 text-gray-400 hover:border-accent-gold hover:text-accent-gold"
                        }`}
                      >
                        {marked ? "Markierung aufheben" : "Am Tisch anwesend"}
                      </button>
                    </li>
                  );
                })}
            </ul>
            {partyCharacters.filter((pc) => pc.playerUserId).length === 0 ? (
              <p className="font-libre text-xs text-gray-500">
                Keine Charaktere mit verknüpftem Spieler-Account in der Gruppe.
              </p>
            ) : null}
            <div className="rounded-xl border border-white/15 bg-white/5 p-3 backdrop-blur-md">
              <div className="mb-2 flex items-start gap-2">
                <UserRound className="h-8 w-8 shrink-0 text-accent-gold" aria-hidden />
                <div className="min-w-0">
                  <p className="font-barlow text-[10px] font-extrabold uppercase text-accent-gold">
                    Platzhalter-Spieler
                  </p>
                  <p className="font-libre text-[10px] leading-snug text-gray-500">
                    Bis zu drei zusätzliche Portraits (Spieler 1–3) ohne Registrierung — nur
                    Anzeige, kein Rucksack, kein Chronik-Eintrag.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={dummyPlayerCountLive <= 0 || isUpdating}
                  onClick={() =>
                    updateLiveState({
                      dummy_player_count: Math.max(0, dummyPlayerCountLive - 1),
                    })
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/25 bg-background-dark/80 font-barlow text-lg font-bold text-gray-200 hover:border-accent-gold hover:text-accent-gold disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Platzhalter entfernen"
                >
                  −
                </button>
                <span className="min-w-[3.5rem] text-center font-barlow text-sm font-extrabold text-accent-gold">
                  {dummyPlayerCountLive} / 3
                </span>
                <button
                  type="button"
                  disabled={dummyPlayerCountLive >= 3 || isUpdating}
                  onClick={() =>
                    updateLiveState({
                      dummy_player_count: Math.min(3, dummyPlayerCountLive + 1),
                    })
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/25 bg-background-dark/80 font-barlow text-lg font-bold text-gray-200 hover:border-accent-gold hover:text-accent-gold disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Platzhalter hinzufügen"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        }
      />

      {!isGuest ? (
        <LiveSessionSidePanels
          sessionId={sessionId}
          campaignId={campaignId}
          isGM={isGM && !forcePlayerView}
          isPrepMode={isPrepMode}
          mainPanel={mainSidePanel}
          onToggleMain={toggleMainSidePanel}
          onCloseMain={closeMainSidePanel}
          handRaises={handRaises}
          downtimeActive={!!liveState?.downtime_active}
          lootActive={Boolean(liveState?.current_loot_id)}
          logs={systemLogs as import("@/src/lib/actions/session-activity-actions").SessionActivityEntry[]}
          currentCharacter={activityCharacter}
          prepTestCharacters={
            isPrepMode && isGM && !forcePlayerView && !currentPlayerCharacter
              ? partyCharacters
                  .filter((pc) => !pc.isSessionDummy)
                  .map((pc) => ({ id: pc.id, name: pc.name }))
              : undefined
          }
          prepTestCharacterId={prepTestCharacterId}
          onPrepTestCharacterChange={setPrepTestCharacterId}
          onActivityPosted={(entry) => {
            setLiveState((prev) => {
              if (!prev) return prev;
              const logs = Array.isArray(prev.system_logs) ? prev.system_logs : [];
              if (logs.some((l) => l.id === entry.id)) return prev;
              const next = {
                ...prev,
                system_logs: [...logs, entry].slice(-120),
              };
              liveStateRef.current = next;
              return next;
            });
          }}
          onActivityCleared={() => {
            setLiveState((prev) => {
              if (!prev) return prev;
              const next = { ...prev, system_logs: [] };
              liveStateRef.current = next;
              return next;
            });
          }}
          onActivityDeleted={(entryId) => {
            setLiveState((prev) => {
              if (!prev) return prev;
              const logs = Array.isArray(prev.system_logs) ? prev.system_logs : [];
              const next = {
                ...prev,
                system_logs: logs.filter((l) => l.id !== entryId),
              };
              liveStateRef.current = next;
              return next;
            });
          }}
          currentUserId={userId}
          playerColorByCharacterId={playerColorByCharacterId}
          onHandRaisesChanged={(next) => {
            if (next === "refresh") {
              void refreshLiveState();
              return;
            }
            setLiveState((prev) => {
              if (!prev) return prev;
              const updated = {
                ...prev,
                hand_raises: next,
              };
              liveStateRef.current = updated;
              return updated;
            });
          }}
          systemLogs={systemLogs as import("@/src/lib/actions/session-activity-actions").SessionActivityEntry[]}
          journalText={liveState?.journal_text ?? null}
          canEditJournal={canEditJournal}
          scribeId={liveState?.scribe_id ?? null}
          onJournalChange={(text) => updateLiveState({ journal_text: text })}
          scenes={allSceneMedia}
          activeSceneId={liveState?.active_scene_media_id ?? null}
          onShowScene={(id) => placeOnStage("scene", id)}
          onRemoveScene={
            isGM && !forcePlayerView
              ? (id) => removeFromStage("scene", id)
              : undefined
          }
          battlemaps={sessionBattlemaps}
          activeBattlemapId={activeBattlemapId}
          battlemapMovementPaused={liveState?.battlemap_movement_paused === true}
          onBattlemapActiveChange={(id) => {
            setLiveState((prev) => {
              if (!prev) return prev;
              const next = normalizeLiveRow({ ...prev, active_battlemap_id: id });
              liveStateRef.current = next;
              return next;
            });
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
          }}
          onBattlemapMovementPausedChange={(paused) => {
            setLiveState((prev) => {
              if (!prev) return prev;
              const next = normalizeLiveRow({
                ...prev,
                battlemap_movement_paused: paused,
              });
              liveStateRef.current = next;
              return next;
            });
          }}
          availableWorldMaps={availableWorldMaps}
          sessionWorldMaps={sessionWorldMapLinks}
          activeWorldMapId={activeWorldMapId}
          onWorldMapActiveChange={(id) => {
            setLiveState((prev) => {
              if (!prev) return prev;
              const next = normalizeLiveRow({
                ...prev,
                active_world_map_id: id,
              });
              liveStateRef.current = next;
              return next;
            });
            void getSessionWorldMaps(sessionId)
              .then(setSessionWorldMapLinks)
              .catch(() => undefined);
          }}
          battlemapActive={battlemapActive}
          tokenPlayers={displayPartyCharacters
            .filter((pc) => !pc.isSessionDummy)
            .map((pc) => ({
              id: pc.id,
              name: pc.name,
              imageUrl: pc.avatar_url,
              tokenUrl: null,
              canPlace:
                isGM ||
                (!!currentPlayerCharacter && currentPlayerCharacter.id === pc.id),
            }))}
          tokenNpcs={battlemapTrayNpcs.map((n) => ({
            id: String(n.id),
            name: n.name,
            title: n.title ?? null,
            imageUrl: n.image_url,
            tokenUrl: n.token_url ?? null,
            sizeCategory: n.token_size_category ?? "medium",
          }))}
          tokenCreatures={battlemapTrayCreatures.map((c) => ({
            id: String(c.id),
            name: c.name,
            creatureType: c.creature_type,
            imageUrl: c.image_url,
          }))}
          onStartPlayerTokenPlacement={(player) => {
            if (!battlemapActive) {
              toast.error("Zuerst eine Battlemap aktivieren.");
              return;
            }
            startCharacterTokenPlacement(player.id, player.name);
            closeMainSidePanel();
          }}
          onStartNpcTokenPlacement={(npc) => {
            if (!isGM || !battlemapActive) return;
            setGmTokenPlacement(npcPlacementDraft(npc));
            setGmMoveTokenId(null);
            setTokenPlacement(null);
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
            closeMainSidePanel();
          }}
          onStartCreatureTokenPlacement={(creature) => {
            if (!isGM || !battlemapActive) return;
            setGmTokenPlacement(creaturePlacementDraft(creature));
            setGmMoveTokenId(null);
            setTokenPlacement(null);
            setSelectedBattlemapTokenId(null);
            setSelectedBattlemapPropId(null);
            closeMainSidePanel();
          }}
          partyCharacters={partyCharacters.map((pc) => ({
            id: pc.id,
            name: pc.name,
            rations_count: pc.rations_count ?? 0,
            starvation_days: pc.starvation_days ?? 0,
          }))}
          downtimeCurrentDay={liveState?.downtime_current_day ?? 1}
          downtimeTotalDays={liveState?.downtime_total_days ?? 1}
          fapAllocations={liveState?.fap_allocations ?? {}}
          onTravelReload={async () => {
            await refreshLiveState();
            router.refresh();
          }}
          activeLootId={liveState?.current_loot_id ?? null}
          onClearStageLoot={() => {
            updateLiveState({ current_loot_id: null, loot_hide_npcs: false });
            writeSystemLog("loot_clear", "Die Beute-Truhe verschwindet von der Bühne.");
          }}
          onLootPublished={async () => {
            await refreshLiveState();
            router.refresh();
          }}
        />
      ) : null}

      {isGM && !forcePlayerView ? (
        <>
          <LiveSessionHandRaiseQueue
            raises={handRaises}
            playerColorByCharacterId={playerColorByCharacterId}
            playerColorByUserId={playerColorByUserId}
            pending={isUpdating}
            onDismiss={(raiseId) => {
              startTransition(async () => {
                try {
                  await dismissSessionHand(sessionId, raiseId);
                  setLiveState((prev) => {
                    if (!prev) return prev;
                    const next = {
                      ...prev,
                      hand_raises: (prev.hand_raises ?? []).filter((r) => r.id !== raiseId),
                    };
                    liveStateRef.current = next;
                    return next;
                  });
                } catch (err) {
                  console.error("[LiveSessionBoard] dismissSessionHand", err);
                  alert(err instanceof Error ? err.message : "Meldung konnte nicht entfernt werden.");
                }
              });
            }}
          />
          <LiveSessionUrgentHandBanner
            raise={urgentHandRaise}
            playerColorByCharacterId={playerColorByCharacterId}
            playerColorByUserId={playerColorByUserId}
            pending={isUpdating}
            onDismiss={(raiseId) => {
              startTransition(async () => {
                try {
                  await dismissSessionHand(sessionId, raiseId);
                  setLiveState((prev) => {
                    if (!prev) return prev;
                    const next = {
                      ...prev,
                      hand_raises: (prev.hand_raises ?? []).filter((r) => r.id !== raiseId),
                    };
                    liveStateRef.current = next;
                    return next;
                  });
                } catch (err) {
                  console.error("[LiveSessionBoard] dismissSessionHand urgent", err);
                  alert(err instanceof Error ? err.message : "Meldung konnte nicht entfernt werden.");
                }
              });
            }}
          />
        </>
      ) : null}

      {/* Stage Manager: Schnellzugriff (breit, ein Scrollbereich) */}
      {isGM && isStageManagerOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
            aria-label="Stage Manager schließen"
            onClick={() => setIsStageManagerOpen(false)}
          />
          <div
            className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-full flex-col border-l border-hero-border/40 min-h-0 sm:max-w-2xl lg:max-w-4xl"
            style={{
              background: `
              radial-gradient(ellipse 110% 55% at -5% 5%, rgba(58, 66, 72, 0.55) 0%, transparent 58%),
              radial-gradient(ellipse 90% 45% at 105% 25%, rgba(48, 56, 62, 0.5) 0%, transparent 52%),
              radial-gradient(ellipse 70% 50% at 40% 100%, rgba(42, 50, 56, 0.45) 0%, transparent 48%),
              radial-gradient(ellipse 50% 35% at 75% 60%, rgba(255, 255, 255, 0.06) 0%, transparent 45%),
              linear-gradient(158deg, #151a1d 0%, #0b0e11 38%, #0f1316 72%, #12161a 100%),
              repeating-linear-gradient(
                -18deg,
                transparent 0px,
                transparent 4px,
                rgba(255, 255, 255, 0.025) 4px,
                rgba(255, 255, 255, 0.025) 5px
              )
            `,
              boxShadow:
                "inset 0 0 72px rgba(0,0,0,0.42), -12px 0 48px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-hero-dark px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="h-4 w-4 shrink-0 text-accent-gold" />
                <h2 className="font-barlow font-bold text-sm uppercase text-gray-200 truncate">
                  Stage (live)
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setNpcSearchModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-background-dark px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:border-accent-gold transition-colors"
                  title="NPCs suchen und auf die Bühne legen"
                >
                  <Search className="h-3.5 w-3.5" />
                  NPCs
                </button>
                <button
                  type="button"
                  onClick={() => setIsStageManagerOpen(false)}
                  className="rounded p-1 text-gray-400 hover:text-white hover:bg-background-dark transition-colors"
                  aria-label="Schließen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="shrink-0 space-y-2 border-b border-hero-dark px-4 py-3">
              <Link
                href={stagePrepHref}
                onClick={() => setIsStageManagerOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-2.5 font-barlow font-bold uppercase text-xs text-accent-gold hover:bg-accent-gold/20 transition-colors"
              >
                <LayoutGrid className="h-4 w-4" />
                Bühnendeck &amp; Vorbereitung (Vollansicht)
              </Link>
              <p className="font-libre text-[11px] text-gray-500">
                Deck einschränken, Hintergrund und weitere Einstellungen erledigst du in der
                Vollansicht. Hier nur schnell NPCs/Fraktionen auf die Bühne schalten.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="px-4 py-3 border-b border-hero-dark flex items-center gap-2 min-w-0">
                <Search className="h-4 w-4 shrink-0 text-gray-500" />
                <input
                  type="search"
                  value={stageSearch}
                  onChange={(e) => setStageSearch(e.target.value)}
                  placeholder="NPCs suchen…"
                  className="min-w-0 flex-1 rounded bg-slate-900 border border-hero-dark px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                />
              </div>
              <div className="space-y-2 px-4 py-3">
                {filteredNpcsForStageManager.length === 0 ? (
                  <p className="font-libre text-xs text-gray-500">
                    Keine NPCs gefunden.
                  </p>
                ) : (
                  filteredNpcsForStageManager.map((npc) => {
                    const isOnStage = activeNpcIds.has(String(npc.id));
                    return (
                      <label
                        key={npc.id}
                        className="flex items-center gap-3 rounded border border-hero-border/30 bg-background-dark px-3 py-2 cursor-pointer hover:border-hero-vibrant transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isOnStage}
                          onChange={(e) => {
                            const currentIds = new Set(
                              liveState?.visible_npc_ids || [],
                            );
                            if (e.target.checked) {
                              currentIds.add(npc.id);
                              updateLiveState({
                                visible_npc_ids: Array.from(currentIds),
                              });
                              void revealNpcOnCampaignIfNeeded(String(npc.id));
                            } else {
                              currentIds.delete(npc.id);
                              updateLiveState({
                                visible_npc_ids: Array.from(currentIds),
                              });
                            }
                          }}
                          className="h-4 w-4 shrink-0 rounded border-hero-border text-hero-vibrant focus:ring-hero-vibrant"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-barlow font-bold text-xs text-white wrap-break-word">
                            {npc.name}
                          </p>
                          {npc.title && (
                            <p className="font-libre text-[10px] text-gray-400 wrap-break-word">
                              {npc.title}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="px-4 py-2 border-y border-hero-dark flex items-center gap-2 min-w-0">
                <Flag className="h-4 w-4 shrink-0 text-gray-500" />
                <input
                  type="search"
                  value={stageFactionSearch}
                  onChange={(e) => setStageFactionSearch(e.target.value)}
                  placeholder="Fraktionen suchen…"
                  className="min-w-0 flex-1 rounded bg-slate-900 border border-hero-dark px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                />
              </div>
              <div className="space-y-2 px-4 py-3 pb-6">
                {filteredFactionsForStageManager.length === 0 ? (
                  <p className="font-libre text-xs text-gray-500">
                    Keine Fraktionen im Deck oder keine Treffer.
                  </p>
                ) : (
                  filteredFactionsForStageManager.map((fac) => {
                    const isOnStage = activeFactionIds.has(String(fac.id));
                    return (
                      <label
                        key={fac.id}
                        className="flex items-center gap-3 rounded border border-amber-900/30 bg-background-dark px-3 py-2 cursor-pointer hover:border-amber-700/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isOnStage}
                          onChange={(e) => {
                            const currentIds = new Set(
                              liveState?.visible_faction_ids || [],
                            );
                            if (e.target.checked) {
                              currentIds.add(fac.id);
                            } else {
                              currentIds.delete(fac.id);
                            }
                            updateLiveState({
                              visible_faction_ids: Array.from(currentIds),
                            });
                          }}
                          className="h-4 w-4 shrink-0 rounded border-hero-border text-hero-vibrant focus:ring-hero-vibrant"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-barlow font-bold text-xs text-white wrap-break-word">
                            {fac.name}
                          </p>
                          {fac.type && (
                            <p className="font-libre text-[10px] text-gray-400 wrap-break-word">
                              {fac.type}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="border-t border-hero-dark px-4 py-3 space-y-2">
                <a
                  href={`/dashboard/campaigns/${campaignId}/npcs/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-barlow font-bold uppercase text-[10px] text-hero-vibrant hover:border-hero-vibrant transition-colors"
                >
                  <PlusCircle className="h-4 w-4" />
                  Neuen NPC anlegen
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </a>
              </div>

              <div className="border-t border-hero-dark px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="h-4 w-4 text-accent-gold" />
                  <p className="font-barlow font-bold text-xs uppercase text-gray-300">
                    Hintergrund (Kurz)
                  </p>
                </div>
                <p className="font-libre text-[10px] text-gray-500">
                  Ausführliche Vorschau und Pflege: Vollansicht „Bühne vorbereiten“.
                </p>
                <input
                  type="url"
                  defaultValue={liveState?.background_url || ""}
                  placeholder="https://…"
                  onBlur={(e) => {
                    const nextBackground = e.target.value.trim() || null;
                    updateLiveState({
                      background_url: nextBackground,
                      is_background_manual_override: !!nextBackground,
                    });
                    if (nextBackground) {
                      writeSystemLog(
                        "background_manual",
                        `Die Gruppe erreicht einen neuen Ort: ${liveState?.current_location || "eine neue Szene"}.`,
                      );
                    }
                  }}
                  className="w-full rounded bg-slate-900 border border-hero-dark px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
                />
                <button
                  type="button"
                  onClick={resetBackgroundToLocationDefault}
                  className="w-full rounded border border-amber-900/60 bg-background-dark px-3 py-2 font-barlow text-[10px] font-bold uppercase text-gray-300 transition-colors hover:border-accent-gold hover:text-accent-gold"
                >
                  Hintergrund auf Orts-Standard zurücksetzen
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quest Journal Overlay (Player-Toggleable) */}
      {!isGM &&
        liveState?.downtime_active &&
        currentPlayerCharacter &&
        liveState.fap_allocations?.[currentPlayerCharacter.id]?.status === "planning" &&
        downtimePlayerDismissed && (
          <button
            type="button"
            onClick={() => setDowntimePlayerDismissed(false)}
            className="fixed bottom-6 left-1/2 z-95 -translate-x-1/2 rounded-full border border-accent-gold bg-background-card/95 px-5 py-2.5 font-barlow text-xs font-extrabold uppercase text-accent-gold shadow-xl backdrop-blur hover:bg-accent-gold/20"
          >
            FAP / Reisetag planen
          </button>
        )}

      {!isGM &&
        liveState?.downtime_active &&
        currentPlayerCharacter &&
        liveState.fap_allocations?.[currentPlayerCharacter.id]?.status === "planning" &&
        !downtimePlayerDismissed && (
          <DowntimePlayerOverlay
            sessionId={sessionId}
            characterId={currentPlayerCharacter.id}
            characterName={currentPlayerCharacter.name}
            downtimeActive={!!liveState.downtime_active}
            planningStatus={liveState.fap_allocations[currentPlayerCharacter.id]?.status ?? null}
            onClose={() => setDowntimePlayerDismissed(true)}
            onSubmitted={async () => {
              await refreshLiveState();
              setDowntimePlayerDismissed(true);
            }}
          />
        )}

      {showQuests && activeQuests.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-40 flex justify-end">
          <div className="pointer-events-auto mt-[64px] mb-4 mr-4 w-full max-w-md rounded-xl bg-black/80 backdrop-blur-md border border-hero-dark shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-hero-dark">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent-gold" />
                <h2 className="font-barlow font-bold text-sm uppercase text-gray-200">
                  Aktive Aufgaben
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowQuests(false)}
                className="rounded p-1 text-gray-400 hover:text-white hover:bg-background-dark transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quest List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {activeQuests.map((quest) => (
                <div
                  key={quest.id}
                  className="rounded border border-hero-border/40 bg-background-dark/80 p-3"
                >
                  <h3 className="font-cinzel font-bold text-sm text-accent-gold mb-1">
                    {quest.title}
                  </h3>
                  <div className="space-y-1 mb-2">
                    {quest.quest_giver?.name && (
                      <p className="font-libre text-[11px] text-gray-300">
                        <span className="font-barlow font-bold uppercase text-[10px] text-gray-400">
                          Auftraggeber:
                        </span>{" "}
                        {quest.quest_giver.name}
                      </p>
                    )}
                    {quest.location?.name && (
                      <p className="font-libre text-[11px] text-gray-300">
                        <span className="font-barlow font-bold uppercase text-[10px] text-gray-400">
                          Ort:
                        </span>{" "}
                        {quest.location.name}
                      </p>
                    )}
                    {quest.type && (
                      <p className="font-libre text-[11px] text-gray-400">
                        <span className="font-barlow font-bold uppercase text-[10px] text-gray-500">
                          Typ:
                        </span>{" "}
                        {quest.type}
                      </p>
                    )}
                  </div>
                  {quest.description && (
                    <div className="max-h-24 overflow-y-auto mb-2">
                      <p className="font-libre text-xs text-gray-200 whitespace-pre-wrap">
                        {quest.description}
                      </p>
                    </div>
                  )}
                  {quest.rewards && (
                    <div className="rounded border border-hero-border/40 bg-hero-dark/40 px-2 py-1">
                      <p className="font-barlow font-bold text-[10px] uppercase text-accent-gold mb-0.5">
                        Belohnung
                      </p>
                      <p className="font-libre text-[11px] text-gray-200">
                        {quest.rewards}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {stagePortrait && (
        <div
          className="fixed inset-0 z-90 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stage-portrait-title"
          onClick={() => setStagePortrait(null)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-[min(96vw,52rem)] rounded-lg border border-hero-border bg-background-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setStagePortrait(null)}
              className="absolute right-2 top-2 z-10 rounded-full border border-hero-border bg-background-dark/95 p-2 text-gray-300 hover:border-accent-gold hover:text-white transition-colors"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center gap-3 p-4 pt-12 sm:p-6 sm:pt-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stagePortrait.imageUrl}
                alt={stagePortrait.name}
                className="max-h-[min(78vh,720px)] w-auto max-w-full rounded-md object-contain shadow-lg"
              />
              <div className="max-w-full px-2 text-center">
                <p
                  id="stage-portrait-title"
                  className="font-cinzel text-lg font-bold text-white"
                >
                  {stagePortrait.name}
                </p>
                {stagePortrait.subtitle ? (
                  <p className="mt-1 font-libre text-sm text-accent-gold">
                    {stagePortrait.subtitle}
                  </p>
                ) : null}
                <p className="mt-2 font-libre text-xs text-gray-500">
                  Klick außerhalb oder Esc zum Schließen
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {isGM && sessionStatus === "Live" && chronistTableMode ? (
        <ChronicleMicMonitor
          recorder={chronicleRecorder}
          onOpenSettings={() => chronistSettingsFlowRef.current?.()}
        />
      ) : null}
      {isGM && sessionStatus === "Live" && chronistTableMode ? (
        <ChronicleLiveMarkerBar recorder={chronicleRecorder} />
      ) : null}

      <TrapWizardModal
        open={Boolean(isGM && trapWizardCell && activeBattlemapId)}
        onClose={() => {
          setTrapWizardCell(null);
          setTrapTool(null);
        }}
        sessionId={sessionId}
        campaignId={campaignId}
        battlemapId={activeBattlemapId ?? ""}
        gridX={trapWizardCell?.gridX ?? 0}
        gridY={trapWizardCell?.gridY ?? 0}
        locationLoreContext={
          liveState?.current_location
            ? `Aktueller Ort: ${liveState.current_location}`
            : ""
        }
        targetLevel={3}
        onCreated={(trapId) => {
          setSelectedTrapId(trapId);
          setTrapTool("select");
          void listBattlemapTraps(activeBattlemapId!, sessionId)
            .then((list) => setBattlemapTraps(list))
            .catch(() => undefined);
        }}
      />

      <TrapTriggerModal
        open={Boolean(trapTriggerEvent)}
        trap={trapTriggerEvent?.trap ?? null}
        characterName={trapTriggerEvent?.characterName ?? ""}
        characterId={trapTriggerEvent?.characterId ?? ""}
        campaignId={campaignId}
        passivePerception={trapTriggerEvent?.passivePerception ?? 10}
        isGm={isGM}
        sessionId={sessionId}
        onClose={() => setTrapTriggerEvent(null)}
        onRequestSaveRoll={(ability, dc) => {
          toast.message(
            `Rettungswurf ${ability.toUpperCase()} gegen DC ${dc} — bitte über das Würfelpanel würfeln.`,
          );
        }}
        onRequestDamageRoll={(formula, damageType) => {
          toast.message(`Schaden: ${formula} ${damageType} — bitte über das Würfelpanel würfeln.`);
        }}
      />

      <SessionEndWrapUpModal
        open={wrapUpOpen}
        onClose={() => setWrapUpOpen(false)}
        sessionId={sessionId}
        campaignId={campaignId}
        isRecordingActive={
          chronicleRecorder.phase === "recording" ||
          chronicleRecorder.phase === "paused" ||
          liveTranscriptionStatus === "recording" ||
          liveTranscriptionStatus === "paused"
        }
        onStopRecording={() => chronicleRecorder.stopRecording()}
        onComplete={(path) => {
          setWrapUpOpen(false);
          startEndTransition(() => {
            router.push(path);
          });
        }}
      />
      <style>{`
        @keyframes npc-reaction-float {
          0% {
            opacity: 0;
            transform: translate(-50%, 18px) scale(0.78);
          }
          14% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1.08);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -72px) scale(1);
          }
        }
      `}</style>
    </div>
  );
}


