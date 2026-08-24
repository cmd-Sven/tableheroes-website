/**
 * live-session-types — Shared types for live session board state, stage entities, and props.
 */
import type { LucideIcon } from "lucide-react";
import type { WeatherPresetId } from "@/src/lib/session-weather";
import type {
  CombatConditionId,
  CombatParticipantSide,
} from "@/src/lib/combat-initiative";
import type { FateCoin } from "@/src/components/session/FateCoinsPool";
import type { SessionHandRaise } from "@/src/lib/session/hand-raises";
import type { FapAllocationsMap } from "@/src/lib/downtime-fap-types";
import type { StageSceneMediaItem } from "@/src/components/session/StageSceneCard";
import type { CampaignCreatureStateRow } from "@/src/app/dashboard/campaigns/[id]/creature-state-actions";
import type { LiveCampaignShopOption } from "@/src/app/session/[sessionId]/StageNpcShopControls";

export type TemperatureState = "cold" | "normal" | "hot";

export type SystemLogEntry = {
  id: string;
  at: string;
  text: string;
  type?: string;
  author_name?: string;
  author_user_id?: string;
  character_id?: string;
  meta?: Record<string, unknown>;
};

export type LiveState = {
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
  combat_started?: boolean | null;
  current_turn_index?: number | null;
  combat_round?: number | null;
  active_shop_id?: string | null;
  active_merchant_npc_id?: string | null;
  current_loot_id?: string | null;
  loot_hide_npcs?: boolean | null;
  fate_coins?: FateCoin[] | null;
  destroyed_fate_coins?: number | null;
  dummy_player_count?: number | null;
  guest_slots?: unknown;
  downtime_active?: boolean | null;
  downtime_type?: string | null;
  downtime_current_day?: number | null;
  downtime_total_days?: number | null;
  fap_allocations?: FapAllocationsMap;
};

export type StageVisibilityPatch = Pick<
  LiveState,
  "visible_npc_ids" | "visible_faction_ids" | "visible_creature_ids"
>;

export type PartyCharacter = {
  id: string;
  name: string;
  class: string | null;
  race: string | null;
  level: number | null;
  avatar_url: string | null;
  avatar_display?: unknown | null;
  playerUserId?: string | null;
  rations_count: number;
  starvation_days: number;
  isSessionDummy?: boolean;
  guestId?: string | null;
};

export type CampaignNpc = {
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
  current_location_id?: string | null;
  home_location_id?: string | null;
};

export type CampaignCreature = {
  id: string;
  name: string;
  creature_type: string | null;
  image_url: string | null;
  physical_description: string | null;
  challenge_rating: number | null;
  known_loot: string | null;
  is_revealed?: boolean | null;
};

export type CampaignFaction = {
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

export type StagePortraitModal = {
  name: string;
  subtitle: string | null;
  imageUrl: string;
};

export type ActiveNpcReaction = {
  id: string;
  npcId: string;
  emoji: string;
};

export type WeatherIconOption = {
  id: WeatherPresetId;
  label: string;
  src: string;
  FallbackIcon: LucideIcon;
  className: string;
  keywords: string[];
};

export type CombatParticipant = {
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

export type CombatTokenPayload = {
  type: "player" | "monster" | "npc";
  name: string;
  image_url: string | null;
  npc_id?: string | null;
  side?: CombatParticipantSide | null;
};

export type StageCardGlowStyle = import("react").CSSProperties & {
  "--glow-color": string;
};

export type LoreLocationOption = {
  id: string;
  name: string;
  type: string | null;
  image_url?: string | null;
  default_image_url?: string | null;
};

export type ActiveQuest = {
  id: string;
  title: string;
  description: string | null;
  rewards: string | null;
  type: string | null;
  quest_giver?: { id: string; name: string | null } | null;
  location?: { id: string; name: string | null } | null;
};

export type LiveSessionBoardProps = {
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
  stageDeckNpcIds: string[] | null;
  stageDeckCreatureIds?: string[] | null;
  stageDeckFactionIds: string[] | null;
  allSceneMedia?: StageSceneMediaItem[];
  stageDeckSceneMediaIds?: string[] | null;
  initialCreatureStates?: Record<string, CampaignCreatureStateRow>;
  activeQuests: ActiveQuest[];
  loreLocationOptions?: LoreLocationOption[];
  sessionLocationLoreReadable?: boolean;
  campaignShops?: LiveCampaignShopOption[];
  transcriptionMode?: "table" | "jitsi" | null;
  guestJoinUrl?: string | null;
  campaignSystem?: string | null;
};
