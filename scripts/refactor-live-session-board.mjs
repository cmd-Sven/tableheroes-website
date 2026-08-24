/**
 * Refactors LiveSessionBoard.tsx by extracting modules into live-board/.
 * Run from tableheroes/: node scripts/refactor-live-session-board.mjs
 */
import fs from "fs";
import path from "path";

const boardPath = path.resolve("src/app/session/[sessionId]/LiveSessionBoard.tsx");
const outDir = path.resolve("src/components/session/live-board");

const raw = fs.readFileSync(boardPath, "utf8");
const lines = raw.split("\n");

function L(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

function count(s) {
  return s.split("\n").length;
}

function writeFile(name, content) {
  const p = path.join(outDir, name);
  fs.writeFileSync(p, content.endsWith("\n") ? content : content + "\n", "utf8");
  console.log(`  ${name}: ${count(content)} lines`);
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// ─── 1. Types ───────────────────────────────────────────────────────────────
writeFile(
  "live-session-types.ts",
  `/**
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
`,
);

// ─── 2. Normalize ───────────────────────────────────────────────────────────
writeFile(
  "live-session-normalize.ts",
  `/**
 * live-session-normalize — Parses and validates session_live_states rows for React state.
 */
import { normalizeHandRaises } from "@/src/lib/session/hand-raises";
import { parseFapAllocations } from "@/src/lib/downtime-fap-types";
import type { FateCoin } from "@/src/components/session/FateCoinsPool";
import type { LiveState, StageVisibilityPatch } from "./live-session-types";

function normalizePhysicallyPresentUserIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x)).filter((id) => id.length > 0);
}

export function normalizeLiveRow(row: unknown): LiveState {
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
            id: String(entry.id ?? \`\${entry.at ?? ""}-\${entry.text ?? ""}\`),
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

export function normalizeStageVisibilityPatch(value: unknown): Partial<StageVisibilityPatch> {
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

/** Without matching session_id, React state is useless — do not count as loaded. */
export function isViableLiveState(row: unknown, expectedSessionId: string): boolean {
  if (row == null || typeof row !== "object") return false;
  const sid = String((row as Record<string, unknown>).session_id ?? "").trim();
  const exp = String(expectedSessionId ?? "").trim();
  if (!sid || !exp) return false;
  return sid.toLowerCase() === exp.toLowerCase();
}
`,
);

// ─── 3. Weather ─────────────────────────────────────────────────────────────
writeFile(
  "live-session-weather.ts",
  `/**
 * live-session-weather — Weather icon lookup, temperature helpers, and rain particle config.
 */
import {
  Cloud,
  CloudLightning,
  CloudRain,
  Snowflake,
  Sun,
} from "lucide-react";
import {
  WEATHER_PRESET_ORDER,
  WEATHER_PRESETS,
  type WeatherPresetId,
} from "@/src/lib/session-weather";
import type { LiveState, WeatherIconOption } from "./live-session-types";

export const TEMPERATURE_MIN = -40;
export const TEMPERATURE_DEFAULT = 15;
export const TEMPERATURE_MAX = 55;

export function normalizeTemperatureValue(value: unknown): number {
  const n = Number(value ?? TEMPERATURE_DEFAULT);
  if (!Number.isFinite(n)) return TEMPERATURE_DEFAULT;
  return Math.min(TEMPERATURE_MAX, Math.max(TEMPERATURE_MIN, Math.round(n)));
}

export function getTemperatureFillPercent(value: number) {
  const tempPercentage =
    ((normalizeTemperatureValue(value) - TEMPERATURE_MIN) /
      (TEMPERATURE_MAX - TEMPERATURE_MIN)) *
    100;
  return Math.min(100, Math.max(0, tempPercentage));
}

export function getThermometerFillColor(value: number) {
  const v = normalizeTemperatureValue(value);
  if (v <= 0) return "linear-gradient(to top, #1e3a8a, #38bdf8)";
  if (v <= 15) return "linear-gradient(to top, #065f46, #34d399)";
  if (v <= 28) return "linear-gradient(to top, #854d0e, #facc15)";
  if (v <= 35) return "linear-gradient(to top, #c2410c, #fb923c)";
  return "linear-gradient(to top, #991b1b, #ef4444)";
}

export function getWeatherVisual(liveState: LiveState | null): WeatherIconOption {
  const raw = \`\${liveState?.weather_preset ?? ""} \${liveState?.weather ?? ""}\`.toLowerCase();
  const preset = liveState?.weather_preset;
  if (preset && WEATHER_ICON_OPTIONS.some((o) => o.id === preset)) {
    return WEATHER_ICON_OPTIONS.find((o) => o.id === preset)!;
  }
  const byKeyword = WEATHER_ICON_OPTIONS.find((option) =>
    option.keywords.some((kw) => raw.includes(kw)),
  );
  if (byKeyword) return byKeyword;
  return WEATHER_ICON_OPTIONS[0];
}

export function getWeatherCondition(liveState: LiveState | null) {
  const raw = \`\${liveState?.weather_preset ?? ""} \${liveState?.weather ?? ""}\`.toLowerCase();
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

export const RAIN_DROPS = Array.from({ length: 58 }, (_, index) => ({
  id: \`rain-\${index}\`,
  left: \`\${(index * 23) % 100}%\`,
  delay: (index % 14) * 0.24,
  duration: 4 + (index % 6) * 0.36,
  height: 14 + (index % 5) * 3,
  opacity: 0.34 + (index % 4) * 0.08,
  drift: -18 - (index % 5) * 4,
}));

const WEATHER_ICON_BASE_PATH = "/images/Session_ui/Wetter_icons";

export const WEATHER_ICON_OPTIONS: WeatherIconOption[] = WEATHER_PRESET_ORDER.map((id) => {
  const meta = WEATHER_PRESETS[id];
  const fallbackById: Record<WeatherPresetId, { Icon: typeof Sun; className: string; keywords: string[] }> = {
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
    src: \`\${WEATHER_ICON_BASE_PATH}/\${meta.iconFilename}\`,
    FallbackIcon: fallback.Icon,
    className: fallback.className,
    keywords: fallback.keywords,
  };
});
`,
);

// ─── 4. Combat utils ────────────────────────────────────────────────────────
writeFile(
  "live-session-combat-utils.ts",
  `/**
 * live-session-combat-utils — Combat participant normalization and initiative token helpers.
 */
import {
  normalizeCombatConditions,
  normalizeCombatParticipantSide,
} from "@/src/lib/combat-initiative";
import type {
  CampaignNpc,
  CombatParticipant,
  CombatTokenPayload,
} from "./live-session-types";

export function normalizeCombatParticipants(rows: unknown[]): CombatParticipant[] {
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

export function buildNpcCombatToken(
  npc: Pick<CampaignNpc, "id" | "name" | "image_url">,
): CombatTokenPayload {
  return {
    type: "npc",
    name: npc.name,
    image_url: npc.image_url,
    npc_id: String(npc.id),
  };
}

export function isCombatTokenUsed(
  token: CombatTokenPayload,
  names: Set<string>,
  npcIds: Set<string>,
): boolean {
  if (token.type === "npc" && token.npc_id) return npcIds.has(token.npc_id);
  return names.has(token.name);
}
`,
);

// ─── 5. Stage card utils + hook ─────────────────────────────────────────────
writeFile(
  "stage-card-utils.ts",
  `/**
 * stage-card-utils — Glow colors and faction status visuals for stage NPC/faction cards.
 */
import {
  Handshake,
  Minus,
  Shield,
  Skull,
  Swords,
  type LucideIcon,
} from "lucide-react";

export function getStageCardGlowColor(kind: "npc" | "faction") {
  return kind === "faction" ? "#cab926" : "#8b5cf6";
}

export function getFactionStatusVisual(status: string | null | undefined): {
  Icon: LucideIcon;
  color: string;
  label: string;
} | null {
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
`,
);

writeFile(
  "useTemporaryStageGlow.ts",
  `/**
 * useTemporaryStageGlow — Shows entry glow on stage cards for ~4s after mount.
 */
"use client";

import { useEffect, useState } from "react";

export function useTemporaryStageGlow() {
  const [showGlow, setShowGlow] = useState(true);

  useEffect(() => {
    setShowGlow(true);
    const timeout = window.setTimeout(() => setShowGlow(false), 4000);
    return () => window.clearTimeout(timeout);
  }, []);

  return showGlow;
}
`,
);

// Extract component bodies from original file (with export added)
const weatherPngBody = L(582, 608)
  .replace(/^function WeatherPngIcon/, "export function WeatherPngIcon");
writeFile(
  "WeatherPngIcon.tsx",
  `/**
 * WeatherPngIcon — Renders a weather preset PNG with Lucide fallback on load error.
 */
"use client";

import { useState } from "react";
import Image from "next/image";
import type { WeatherIconOption } from "./live-session-types";

${weatherPngBody}
`,
);

const factionNotesBody = L(783, 875)
  .replace(/^function StageFactionPlayerNotesButton/, "export function StageFactionPlayerNotesButton");
writeFile(
  "StageFactionPlayerNotesButton.tsx",
  `/**
 * StageFactionPlayerNotesButton — Player-only sticky-note modal for faction observations.
 */
"use client";

import { useState, useTransition } from "react";
import { StickyNote } from "lucide-react";
import {
  getCampaignNote,
  upsertCampaignNote,
} from "@/src/app/dashboard/campaigns/[id]/campaign-notes-actions";

${factionNotesBody}
`,
);

const npcCardBody = L(877, 1099)
  .replace(/^function StageNpcCard/, "export function StageNpcCard");
writeFile(
  "StageNpcCard.tsx",
  `/**
 * StageNpcCard — Animated NPC portrait card on the live stage with GM reputation controls.
 */
"use client";

import type { DragEvent } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import {
  formatNpcReputationScore,
} from "@/src/lib/npc-reputation-smiley";
import {
  StageNpcShopControls,
  type LiveCampaignShopOption,
} from "@/src/app/session/[sessionId]/StageNpcShopControls";
import type {
  ActiveNpcReaction,
  CampaignNpc,
  CombatTokenPayload,
  StageCardGlowStyle,
  StagePortraitModal,
} from "./live-session-types";
import { buildNpcCombatToken } from "./live-session-combat-utils";
import { getStageCardGlowColor } from "./stage-card-utils";
import { useTemporaryStageGlow } from "./useTemporaryStageGlow";

${npcCardBody}
`,
);

const factionCardBody = L(1101, 1246)
  .replace(/^function StageFactionCard/, "export function StageFactionCard");
writeFile(
  "StageFactionCard.tsx",
  `/**
 * StageFactionCard — Animated faction banner/emblem card on the live stage.
 */
"use client";

import { motion } from "framer-motion";
import { Flag, X } from "lucide-react";
import {
  imageDisplayBackdropStyle,
  imageDisplayObjectStyle,
  normalizeImageDisplay,
} from "@/src/lib/image-display";
import type {
  CampaignFaction,
  StageCardGlowStyle,
  StagePortraitModal,
} from "./live-session-types";
import { StageFactionPlayerNotesButton } from "./StageFactionPlayerNotesButton";
import { getFactionStatusVisual, getStageCardGlowColor } from "./stage-card-utils";
import { useTemporaryStageGlow } from "./useTemporaryStageGlow";

${factionCardBody}
`,
);

// Weather effects component
writeFile(
  "LiveSessionWeatherEffects.tsx",
  `/**
 * LiveSessionWeatherEffects — Animated sun, rain, snow, and lightning overlays on the stage.
 */
"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { RAIN_DROPS } from "./live-session-weather";

type Props = {
  weatherCondition: "storm" | "rain" | "snow" | "sun" | "none";
  lightningPulseKey: number;
};

export function LiveSessionWeatherEffects({ weatherCondition, lightningPulseKey }: Props) {
  return (
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
                right: \`\${idx * 12}%\`,
                top: \`\${idx * 10}%\`,
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
  );
}
`,
);

// ─── Patch LiveSessionBoard.tsx ─────────────────────────────────────────────
console.log("\nPatching LiveSessionBoard.tsx…");

const importBlock = `import type {
  LiveState,
  LiveSessionBoardProps,
  PartyCharacter,
  CampaignNpc,
  CampaignCreature,
  CampaignFaction,
  StagePortraitModal,
  ActiveNpcReaction,
  CombatParticipant,
  CombatTokenPayload,
  LoreLocationOption,
} from "@/src/components/session/live-board/live-session-types";
import {
  normalizeLiveRow,
  normalizeStageVisibilityPatch,
  isViableLiveState,
} from "@/src/components/session/live-board/live-session-normalize";
import {
  TEMPERATURE_MIN,
  TEMPERATURE_MAX,
  normalizeTemperatureValue,
  getTemperatureFillPercent,
  getThermometerFillColor,
  getWeatherVisual,
  getWeatherCondition,
  WEATHER_ICON_OPTIONS,
} from "@/src/components/session/live-board/live-session-weather";
import {
  normalizeCombatParticipants,
  buildNpcCombatToken,
  isCombatTokenUsed,
} from "@/src/components/session/live-board/live-session-combat-utils";
import { StageNpcCard } from "@/src/components/session/live-board/StageNpcCard";
import { StageFactionCard } from "@/src/components/session/live-board/StageFactionCard";
import { WeatherPngIcon } from "@/src/components/session/live-board/WeatherPngIcon";
import { LiveSessionWeatherEffects } from "@/src/components/session/live-board/LiveSessionWeatherEffects";
`;

// Remove lines 312-1362 (types + inline components + weather constants)
// Keep lines 1-311 (imports) and 1364-end (main component)
let head = lines.slice(0, 311).join("\n");

// Clean unused imports from head that were only needed by extracted code
const removeFromHead = [
  /^import type \{ LucideIcon \}.*$/,
  /^import \{[\s\S]*?CloudLightning,[\s\S]*?\} from "lucide-react";$/,
  /^import \{[\s\S]*?getCampaignNote,[\s\S]*?\} from.*campaign-notes-actions.*;$/,
  /^import \{[\s\S]*?formatNpcReputationScore,[\s\S]*?\} from.*npc-reputation-smiley.*;$/,
  /^import \{[\s\S]*?imageDisplayBackdropStyle,[\s\S]*?\} from.*image-display.*;$/,
  /^import \{[\s\S]*?WEATHER_PRESET_ORDER,[\s\S]*?\} from.*session-weather.*;$/,
  /^import \{[\s\S]*?normalizeCombatConditions,[\s\S]*?\} from.*combat-initiative.*;$/,
];
for (const re of removeFromHead) {
  head = head.replace(re, "");
}
// Remove individual lucide icons only used in extracted weather/stage cards if still in a trimmed import
head = head.replace(/\n{3,}/g, "\n\n");

const tail = lines.slice(1363).join("\n"); // from export function LiveSessionBoard
let patched = head + "\n" + importBlock + "\n" + tail;

// Replace Props with LiveSessionBoardProps
patched = patched.replace(
  /}: Props\) \{/,
  "}: LiveSessionBoardProps) {",
);
patched = patched.replace(/^type Props = \{[\s\S]*?^};\n\nexport function/m, "export function");

// Replace weather effects JSX block
const weatherFxOld = `<div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
              {weatherCondition === "sun" ? (`;
const weatherFxNew = `<LiveSessionWeatherEffects
              weatherCondition={weatherCondition}
              lightningPulseKey={lightningPulseKey}
            />`;
if (patched.includes(weatherFxOld)) {
  const start = patched.indexOf(weatherFxOld);
  const endMarker = `{weatherCondition === "storm" ? (
                <motion.div
                  key={lightningPulseKey}`;
  const endIdx = patched.indexOf("              ) : null}\n            </div>", start);
  if (endIdx > start) {
    const end = patched.indexOf("            </div>", endIdx) + "            </div>".length;
    patched = patched.slice(0, start) + weatherFxNew + patched.slice(end);
  }
}

fs.writeFileSync(boardPath, patched, "utf8");
const boardLines = patched.split("\n").length;
console.log(`  LiveSessionBoard.tsx: ${boardLines} lines (was ${lines.length})`);

console.log("\nDone. Run: npx tsc --noEmit");
