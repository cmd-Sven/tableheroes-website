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
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient as createBrowserSupabase } from "@/src/lib/supabase/client";
import {
  LogOut,
  MapPin,
  Map,
  Clock,
  Users,
  BookOpen,
  PenSquare,
  Feather,
  Search,
  X,
  Power,
  Monitor,
  Flag,
  Cloud,
  CloudLightning,
  CloudRain,
  ScrollText,
  ExternalLink,
  PlusCircle,
  LayoutGrid,
  Snowflake,
  ShoppingBag,
  Sun,
  Swords,
  Gift,
  Armchair,
  UserRound,
} from "lucide-react";
import {
  endSession,
  ensureSessionPrepLiveState,
} from "@/src/app/dashboard/campaigns/[id]/session-actions";
import { adjustNpcReputation } from "@/src/lib/actions/npc-reputation-actions";
import { setCampaignVisibility } from "@/src/app/dashboard/campaigns/[id]/campaign-visibility-actions";
import { createSystemLog } from "@/src/lib/actions/session-system-log-actions";
import { StageDeckHand } from "./StageDeckHand";
import {
  formatWeatherSummary,
  normalizeIntensity,
  WEATHER_PRESET_ORDER,
  WEATHER_PRESETS,
  type WeatherPresetId,
} from "@/src/lib/session-weather";
import { PrivateInventoryModal } from "@/src/components/inventory/PrivateInventoryModal";
import { LiveStageShopOverlay } from "./LiveStageShopOverlay";
import { FateCoinsPool, type FateCoin } from "@/src/components/session/FateCoinsPool";
import { GmSlideSettingsPanel } from "@/src/components/session/GmSlideSettingsPanel";
import { TravelDowntimeGmModal } from "@/src/components/session/TravelDowntimeGmModal";
import { LootGmModal } from "@/src/components/session/LootGmModal";
import { StageLootItemCards } from "@/src/components/session/StageLootItemCards";
import { DowntimePlayerOverlay } from "@/src/components/session/DowntimePlayerOverlay";
import { GmNpcSearchModal } from "@/src/components/session/GmNpcSearchModal";
import {
  parseFapAllocations,
  type FapAllocationsMap,
} from "@/src/lib/downtime-fap-types";
import { npcReputationSmileyFromScore } from "@/src/lib/npc-reputation-smiley";
import { sortNpcsByLocationPriority } from "@/src/lib/npc-stage-display";

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
  visible_npc_ids: string[] | null;
  visible_faction_ids?: string[] | null;
  background_url?: string | null;
  is_background_manual_override?: boolean | null;
  is_combat_mode?: boolean | null;
  current_turn_index?: number | null;
  active_shop_id?: string | null;
  active_merchant_npc_id?: string | null;
  current_loot_id?: string | null;
  /** True: NPC-Karten ausblenden (geschlossene Beute-Truhe). */
  loot_hide_npcs?: boolean | null;
  fate_coins?: FateCoin[] | null;
  destroyed_fate_coins?: number | null;
  /** GM: 0–3 reine UI-Platzhalter „Spieler 1–3“ (kein Account / kein Log). */
  dummy_player_count?: number | null;
  downtime_active?: boolean | null;
  downtime_type?: string | null;
  downtime_current_day?: number | null;
  downtime_total_days?: number | null;
  fap_allocations?: FapAllocationsMap;
};

type StageVisibilityPatch = Pick<
  LiveState,
  "visible_npc_ids" | "visible_faction_ids"
>;

function normalizePhysicallyPresentUserIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x)).filter((id) => id.length > 0);
}

function normalizeLiveRow(row: unknown): LiveState {
  const r = row as Record<string, unknown>;
  const npcRaw = r.visible_npc_ids;
  const facRaw = r.visible_faction_ids;
  const logsRaw = r.system_logs;
  const fateCoinsRaw = r.fate_coins;
  return {
    ...(r as unknown as LiveState),
    visible_npc_ids: Array.isArray(npcRaw) ? npcRaw.map(String) : [],
    visible_faction_ids: Array.isArray(facRaw) ? facRaw.map(String) : [],
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
    dummy_player_count: Math.min(
      3,
      Math.max(0, Math.round(Number(r.dummy_player_count ?? 0)) || 0),
    ),
    loot_hide_npcs: Boolean(r.loot_hide_npcs ?? false),
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

  return patch;
}

/** Ohne passende session_id ist React-State wirkungslos (Updates/Stage) — nicht als „geladen“ zählen. */
function isViableLiveState(row: unknown, expectedSessionId: string): boolean {
  if (row == null || typeof row !== "object") return false;
  const sid = String((row as Record<string, unknown>).session_id ?? "");
  return sid.length > 0 && sid === expectedSessionId;
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
      const type: CombatParticipant["type"] = r.type === "player" ? "player" : "monster";
      return {
        id: String(r.id),
        session_id: String(r.session_id),
        name: String(r.name ?? ""),
        type,
        initiative_value: Number(r.initiative_value ?? 0),
        sort_order: Number(r.sort_order ?? 0),
        image_url: r.image_url != null ? String(r.image_url) : null,
        is_active: r.is_active !== false,
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
  /** Spieler-Account (für Presence: ausgegraut bis Tab offen) */
  playerUserId?: string | null;
  rations_count: number;
  starvation_days: number;
  /** Nur Client: GM-Platzhalter ohne echten Charakter */
  isSessionDummy?: boolean;
};

type CampaignNpc = {
  id: string;
  name: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  is_revealed?: boolean | null;
  is_merchant?: boolean | null;
  shop_id?: string | null;
  /** world_lore.id – gleiche Semantik wie Session-Ort */
  current_location_id?: string | null;
  home_location_id?: string | null;
};

type CampaignFaction = {
  id: string;
  name: string;
  image_url: string | null;
  type: string | null;
  description: string | null;
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
};

type CombatParticipant = {
  id: string;
  session_id: string;
  name: string;
  type: "player" | "monster";
  initiative_value: number;
  sort_order: number;
  image_url: string | null;
  is_active: boolean;
};

type CombatTokenPayload = {
  type: "player" | "monster";
  name: string;
  image_url: string | null;
};

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

function StageNpcCard({
  npc,
  isSingle,
  isGM,
  isCombatMode,
  isUpdating,
  reputationScore,
  reactions,
  onPortrait,
  onReaction,
  onRemove,
  onToggleShop,
}: {
  npc: CampaignNpc;
  isSingle: boolean;
  isGM: boolean;
  isCombatMode: boolean;
  isUpdating: boolean;
  reputationScore: number;
  reactions: ActiveNpcReaction[];
  onPortrait: (portrait: StagePortraitModal) => void;
  onReaction: (npcId: string, amount: number) => void;
  onRemove: (npcId: string) => void;
  onToggleShop: (npc: CampaignNpc) => void;
}) {
  const showGlow = useTemporaryStageGlow();
  const cardTitle = [npc.name, npc.title].filter(Boolean).join(" — ");
  const glowColor = getStageCardGlowColor("npc");

  return (
    <motion.div
      className={`group relative isolate aspect-3/4 w-full max-h-[min(48vh,380px)] overflow-visible rounded-lg transition-transform duration-200 hover:z-10 hover:scale-[1.02] ${
        isSingle ? "max-w-xs" : ""
      } ${npc.image_url ? "cursor-zoom-in" : "cursor-default"}`}
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
                className="flex min-w-[2.5rem] items-center justify-center px-1 text-2xl leading-none"
                title={isGM ? `Ruf ${reputationScore > 0 ? "+" : ""}${reputationScore} (nur SL)` : undefined}
                aria-hidden={!isGM}
              >
                {npcReputationSmileyFromScore(reputationScore)}
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
            {npc.is_merchant && npc.shop_id ? (
              <button
                type="button"
                aria-label={`Shop von ${npc.name} für Spieler öffnen oder schließen`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleShop(npc);
                }}
                className="absolute left-0 top-10 inline-flex items-center gap-1 rounded-full border border-accent-gold/70 bg-background-dark/95 px-2.5 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold shadow-lg backdrop-blur transition-colors hover:bg-accent-gold hover:text-black"
                title="Shop für Spieler öffnen/schließen"
              >
                <ShoppingBag className="h-3 w-3" />
                Shop
              </button>
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
  onPortrait,
  onRemove,
}: {
  faction: CampaignFaction;
  isSingle: boolean;
  isGM: boolean;
  isCombatMode: boolean;
  onPortrait: (portrait: StagePortraitModal) => void;
  onRemove: (factionId: string) => void;
}) {
  const showGlow = useTemporaryStageGlow();
  const cardTitle = [faction.name, faction.type].filter(Boolean).join(" — ");
  const glowColor = getStageCardGlowColor("faction");

  return (
    <motion.div
      className={`group relative isolate aspect-3/4 w-full max-h-[min(42vh,320px)] overflow-visible rounded-lg transition-transform duration-200 hover:z-10 hover:scale-[1.02] ${
        isSingle ? "max-w-xs" : ""
      } ${faction.image_url ? "cursor-zoom-in" : "cursor-default"}`}
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
          if (faction.image_url) {
            onPortrait({
              name: faction.name,
              subtitle: faction.type,
              imageUrl: faction.image_url,
            });
          }
        }}
        className="relative h-full w-full overflow-hidden rounded-lg border-2 border-amber-800/70 bg-amber-950/40 shadow-lg hover:border-amber-500/80"
      >
        {faction.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- Session-Bühnen-Karte
          <img
            src={faction.image_url}
            alt=""
            className="pointer-events-none h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-amber-950/50">
            <Flag className="h-14 w-14 text-accent-gold/90" />
          </div>
        )}
      </button>
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
  sessionStatus: string;
  isGM: boolean;
  forcePlayerView?: boolean;
  userId: string;
  initialLiveState: LiveState | null;
  partyCharacters: PartyCharacter[];
  allCampaignNpcs: CampaignNpc[];
  allCampaignFactions: CampaignFaction[];
  /** null = alle NPCs im Stage Manager */
  stageDeckNpcIds: string[] | null;
  /** null = alle Fraktionen im Stage Manager */
  stageDeckFactionIds: string[] | null;
  activeQuests: ActiveQuest[];
  /** Nur GM: Orte aus Lore (isLocationType) für Dropdown */
  loreLocationOptions?: LoreLocationOption[];
  /** Spieler dürfen Lore-Link nur sehen, wenn Eintrag für sie revealed ist */
  sessionLocationLoreReadable?: boolean;
};

export function LiveSessionBoard({
  sessionId,
  campaignId,
  sessionStatus,
  isGM: actualUserIsGM,
  forcePlayerView = false,
  userId,
  initialLiveState,
  partyCharacters,
  allCampaignNpcs,
  allCampaignFactions,
  stageDeckNpcIds,
  stageDeckFactionIds,
  activeQuests,
  loreLocationOptions = [],
  sessionLocationLoreReadable = false,
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
  const [fateGmSettingsOpen, setFateGmSettingsOpen] = useState(false);
  const [weatherGmSettingsOpen, setWeatherGmSettingsOpen] = useState(false);
  const [tempGmSettingsOpen, setTempGmSettingsOpen] = useState(false);
  const [travelGmModalOpen, setTravelGmModalOpen] = useState(false);
  const [tablePresenceGmSettingsOpen, setTablePresenceGmSettingsOpen] =
    useState(false);
  const [lootGmModalOpen, setLootGmModalOpen] = useState(false);

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
  const [isStageManagerOpen, setIsStageManagerOpen] = useState(false);
  const [stageSearch, setStageSearch] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(
    viableInitial ? initialLiveState?.background_url || null : null,
  );
  const [showQuests, setShowQuests] = useState(false);
  const [downtimePlayerDismissed, setDowntimePlayerDismissed] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isEnding, startEndTransition] = useTransition();
  const [stageFactionSearch, setStageFactionSearch] = useState("");
  const [npcSearchModalOpen, setNpcSearchModalOpen] = useState(false);
  const [stageDropHighlight, setStageDropHighlight] = useState(false);
  const [stagePortrait, setStagePortrait] = useState<StagePortraitModal | null>(
    null,
  );
  const [npcReactions, setNpcReactions] = useState<ActiveNpcReaction[]>([]);
  const [npcReputationScores, setNpcReputationScores] = useState<Record<string, number>>({});
  const [combatParticipants, setCombatParticipants] = useState<CombatParticipant[]>([]);
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

  const isPrepMode = sessionStatus === "Scheduled";
  const weatherCondition = getWeatherCondition(liveState);

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
  const physicallyPresentIdSet = new Set(
    normalizePhysicallyPresentUserIds(liveState?.physically_present_user_ids),
  );
  const dummyPlayerCountLive = Math.min(
    3,
    Math.max(0, Math.round(Number(liveState?.dummy_player_count ?? 0)) || 0),
  );
  const displayPartyCharacters = useMemo((): PartyCharacter[] => {
    const dummies: PartyCharacter[] = [];
    for (let i = 1; i <= dummyPlayerCountLive; i += 1) {
      dummies.push({
        id: `session-dummy-${i}`,
        name: `Spieler ${i}`,
        class: "Platzhalter",
        race: null,
        level: null,
        avatar_url: "/images/icon-empty.svg",
        playerUserId: null,
        rations_count: 0,
        starvation_days: 0,
        isSessionDummy: true,
      });
    }
    return [...partyCharacters, ...dummies];
  }, [partyCharacters, dummyPlayerCountLive]);
  const temperatureValue = isGM
    ? temperatureDraft
    : normalizeTemperatureValue(liveState?.temperature_value);
  const weatherVisual = getWeatherVisual(liveState);
  const currentPlayerCharacter = useMemo(() => {
    return partyCharacters.find((pc) => pc.playerUserId === userId) ?? null;
  }, [partyCharacters, userId]);

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
  // Realtime Subscription
  // ---------------------------------------------------------------------------
  useEffect(() => {
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
      .on("presence", { event: "sync" }, () => {
        const st = channel.presenceState();
        setPresentUserIds(new Set(Object.keys(st)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId });
        }
      });

    liveChannelRef.current = channel;

    return () => {
      if (liveChannelRef.current === channel) {
        liveChannelRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [sessionId, showNpcReaction, supabase, userId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCombatParticipants() {
      const { data, error } = await ((supabase as any).from("combat_participants") as any)
        .select("*")
        .eq("session_id", sessionId)
        .eq("is_active", true);

      if (!cancelled && !error) {
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
            "Session-Zustand konnte nicht geladen werden. Bitte Seite neu laden. In Supabase: Migration session_live_states (Spalten + Realtime) ausführen.",
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
    () => allCampaignNpcs.filter((npc) => activeNpcIds.has(String(npc.id))),
    [allCampaignNpcs, activeNpcIds],
  );

  const sortedActiveNpcs = useMemo(
    () =>
      sortNpcsByLocationPriority(
        activeNpcs,
        liveState?.current_location_lore_id ?? null,
      ),
    [activeNpcs, liveState?.current_location_lore_id],
  );

  const gmNpcSearchRows = useMemo(
    () =>
      allCampaignNpcs.map((n) => ({
        id: String(n.id),
        name: n.name,
        title: n.title ?? null,
        image_url: n.image_url ?? null,
        is_revealed: n.is_revealed,
        current_location_id: n.current_location_id ?? null,
        home_location_id: n.home_location_id ?? null,
      })),
    [allCampaignNpcs],
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
      return allCampaignNpcs.map((n) => ({ ...n, id: String(n.id) }));
    }
    const deck = stageDeckNpcIds.map((id) => String(id)).filter(Boolean);
    if (deck.length === 0) {
      return allCampaignNpcs.map((n) => ({ ...n, id: String(n.id) }));
    }
    const allowed = new Set(deck);
    return allCampaignNpcs.filter((n) => allowed.has(String(n.id)));
  }, [allCampaignNpcs, stageDeckNpcIds]);

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

  const activeFactionIds = useMemo(() => {
    return new Set((liveState?.visible_faction_ids || []).map(String));
  }, [liveState?.visible_faction_ids]);

  const activeFactions = useMemo(
    () => allCampaignFactions.filter((f) => activeFactionIds.has(String(f.id))),
    [allCampaignFactions, activeFactionIds],
  );

  const stageHasDeckContent =
    sortedActiveNpcs.length > 0 ||
    activeFactions.length > 0 ||
    Boolean(liveState?.current_loot_id);

  const sortedCombatParticipants = useMemo(
    () =>
      [...combatParticipants]
        .filter((participant) => participant.is_active)
        .sort(
          (a, b) =>
            b.initiative_value - a.initiative_value ||
            a.sort_order - b.sort_order ||
            a.name.localeCompare(b.name),
        ),
    [combatParticipants],
  );
  const activeCombatParticipant =
    sortedCombatParticipants.length > 0
      ? sortedCombatParticipants[
          Math.min(
            Math.max(0, Number(liveState?.current_turn_index ?? 0) || 0),
            sortedCombatParticipants.length - 1,
          )
        ]
      : null;
  const combatParticipantNames = useMemo(
    () => new Set(combatParticipants.filter((p) => p.is_active).map((p) => p.name)),
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

  function placeOnStage(kind: "npc" | "faction", id: string) {
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

  function removeFromStage(kind: "npc" | "faction", id: string) {
    if (!isGM) return;
    const sid = String(id);
    const base = liveStateRef.current;
    if (!base) return;

    if (kind === "npc") {
      updateLiveState({
        visible_npc_ids: (base.visible_npc_ids || [])
          .map(String)
          .filter((npcId) => npcId !== sid),
      });
    } else {
      updateLiveState({
        visible_faction_ids: (base.visible_faction_ids || [])
          .map(String)
          .filter((factionId) => factionId !== sid),
      });
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

  function assignScribe(nextScribeId: string | null) {
    if (!isGM) return;
    updateLiveState({ scribe_id: nextScribeId });
  }

  function commitTemperatureValue(value = temperatureDraft) {
    const nextValue = normalizeTemperatureValue(value);
    const previousValue = normalizeTemperatureValue(liveStateRef.current?.temperature_value);
    updateLiveState({ temperature_value: nextValue });

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
    }
  }

  function getLocationBackground(option: LoreLocationOption | undefined) {
    return option?.default_image_url || option?.image_url || null;
  }

  function changeSessionLocation(locationId: string) {
    if (!locationId) {
      updateLiveState({ current_location_lore_id: null });
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
    if (combatParticipantNames.has(token.name)) return;
    const { error } = await ((supabase as any).from("combat_participants") as any).insert({
      session_id: sessionId,
      name: token.name,
      type: token.type,
      initiative_value: 10,
      sort_order: combatParticipants.length,
      image_url: token.image_url,
      is_active: true,
    });
    if (error) alert(error.message);
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
      if (token.type !== "player" && token.type !== "monster") return;
      void addCombatToken({
        type: token.type,
        name: String(token.name ?? "").trim(),
        image_url: token.image_url != null ? String(token.image_url) : null,
      });
    } catch {
      /* ignore invalid token payload */
    }
  }

  async function updateCombatParticipant(
    participantId: string,
    patch: Partial<Pick<CombatParticipant, "initiative_value" | "is_active">>,
  ) {
    if (!isGM) return;
    const { error } = await ((supabase as any).from("combat_participants") as any)
      .update(patch)
      .eq("id", participantId);
    if (error) alert(error.message);
  }

  function nextCombatTurn() {
    if (!isGM || sortedCombatParticipants.length === 0) return;
    const current = Math.max(0, Number(liveStateRef.current?.current_turn_index ?? 0) || 0);
    updateLiveState({
      current_turn_index: (current + 1) % sortedCombatParticipants.length,
    });
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  return (
    <div className="relative isolate flex min-h-screen min-h-0 flex-col overflow-x-hidden bg-background-dark text-white">
      {/* Dark overlay for readability */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-background-dark via-emerald-950/90 to-black" />
      {/* Top Bar: Exit Button */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-amber-900/50 bg-linear-to-r from-background-card/95 via-emerald-950/85 to-background-dark/95 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-1">
          <div className="font-barlow text-sm uppercase text-gray-400">
            {forcePlayerView
              ? "Spieler-Monitor"
              : isPrepMode
                ? "Session – Vorbereitung"
                : "Live Session Dashboard"}
          </div>
          {isPrepMode && (
            <p className="font-libre text-xs text-accent-gold/90 max-w-xl">
              Du gestaltest und testest den Tisch vor dem Start. Spieler sehen diese Ansicht erst,
              wenn die Session live geht – unabhängig von Zu- oder Absagen.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isGM ? (
            <button
              type="button"
              onClick={() =>
                updateLiveState({
                  is_combat_mode: !liveState?.is_combat_mode,
                  current_turn_index: 0,
                })
              }
              className={`inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 font-barlow text-xs font-extrabold uppercase tracking-wide transition-colors ${
                liveState?.is_combat_mode
                  ? "border-red-600 bg-red-950/70 text-red-100 shadow-[0_0_20px_rgba(127,29,29,0.45)] hover:bg-red-900/80"
                  : "border-hero-vibrant/80 bg-emerald-950/90 text-hero-vibrant shadow-[0_0_18px_rgba(55,152,6,0.25)] hover:bg-emerald-900/95"
              }`}
            >
              <Swords className="h-5 w-5 shrink-0" />
              {liveState?.is_combat_mode ? "Combat beenden" : "Combat starten"}
            </button>
          ) : null}
          {actualUserIsGM && !forcePlayerView && (
            <button
              type="button"
              onClick={() =>
                window.open(`${window.location.pathname}?mode=player`, "_blank")
              }
              className="inline-flex items-center gap-1 rounded border border-accent-gold/60 bg-accent-gold/15 px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-accent-gold hover:bg-accent-gold/25 transition-colors"
            >
              <Monitor className="h-4 w-4" />
              Spieler-Monitor öffnen
            </button>
          )}
          <a
            href={`/dashboard/campaigns/${campaignId}?tab=lore`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded border border-amber-900/60 bg-background-dark px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors"
          >
            <ScrollText className="h-4 w-4" />
            Lore
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
          {/* Quest Journal Toggle */}
          {activeQuests.length > 0 && (
            <button
              type="button"
              onClick={() => setShowQuests((prev) => !prev)}
              className={`hidden sm:inline-flex items-center gap-1 rounded border px-3 py-1.5 font-barlow font-bold uppercase text-[10px] transition-colors ${
                showQuests
                  ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                  : "border-amber-900/60 bg-background-dark text-gray-200 hover:border-accent-gold hover:text-accent-gold"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Quests
            </button>
          )}

          {/* Session beenden (GM Only, nicht in Vorbereitung) */}
          {isGM && !isPrepMode && (
            <button
              type="button"
              onClick={() => {
                if (
                  !window.confirm(
                    "Session wirklich beenden? Das Journal wird gespeichert.",
                  )
                ) {
                  return;
                }
                if (isEnding) return;
                startEndTransition(async () => {
                  try {
                    const result = await endSession(sessionId);
                    const targetCampaignId =
                      (result as any)?.campaignId || campaignId;
                    router.push(`/dashboard/campaigns/${targetCampaignId}`);
                  } catch (err: any) {
                    alert(
                      err?.message ||
                        "Fehler beim Beenden der Session. Bitte erneut versuchen.",
                    );
                  }
                });
              }}
              disabled={isEnding}
              className="inline-flex items-center gap-1 rounded border border-red-700 bg-red-900/60 px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-red-200 hover:bg-red-800/80 transition-colors disabled:opacity-50"
            >
              <Power className="h-4 w-4" />
              Session beenden
            </button>
          )}

          {/* Exit Button */}
          <button
            type="button"
            onClick={() =>
              router.push(
                isPrepMode
                  ? `/dashboard/campaigns/${campaignId}?tab=sessions`
                  : "/dashboard",
              )
            }
            className="inline-flex items-center gap-2 rounded border border-red-700 bg-red-900/40 px-3 py-1.5 font-barlow font-bold uppercase text-xs text-red-200 hover:bg-red-800/70 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {isPrepMode ? "Zur Kampagne" : "Session verlassen"}
          </button>
        </div>
      </div>

      {isPrepMode && isGM && (
        <div className="relative z-10 border-b border-accent-gold/30 bg-accent-gold/10 px-6 py-2">
          <div className="flex flex-wrap items-center gap-2 font-libre text-xs text-accent-gold">
            <span className="rounded border border-accent-gold/40 bg-background-dark/70 px-2 py-0.5 font-barlow font-bold uppercase tracking-wide">
              Vorbereitungs-Modus
            </span>
            <span>Spieler haben noch keinen Zugriff. Änderungen an Wetter, Bühne und Journal werden bereits gespeichert.</span>
            {isLiveStateInitializing && (
              <span className="text-gray-300">Session-Zustand wird initialisiert...</span>
            )}
          </div>
        </div>
      )}

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
      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-3 md:p-5">
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-visible rounded-2xl border border-amber-900/60 bg-linear-to-b from-background-card/95 via-emerald-950/90 to-background-dark/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm">
          <div className="border-b border-amber-900/50 bg-linear-to-r from-background-card/90 via-emerald-950/80 to-background-dark/90 px-4 py-3">
            <div className="grid gap-3 xl:grid-cols-[minmax(260px,1.2fr)_minmax(160px,0.5fr)_minmax(280px,1.1fr)_auto] xl:items-start">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:gap-4">
                <div className="flex min-w-0 flex-1 gap-2">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-accent-gold" />
                  {isGM ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex min-w-[200px] flex-1 flex-col gap-1">
                        <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
                          Ort aus Lore
                        </span>
                        <select
                          value={liveState?.current_location_lore_id || ""}
                          onChange={(e) => changeSessionLocation(e.target.value)}
                          className="w-full rounded border border-amber-900/60 bg-background-dark px-2 py-1.5 text-sm text-white focus:border-accent-gold outline-none"
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
                      <label className="flex min-w-[180px] flex-1 flex-col gap-1">
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
                          className="w-full rounded border border-amber-900/60 bg-background-dark px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:border-accent-gold outline-none"
                        />
                      </label>
                    </div>
                    {liveState?.current_location_lore_id ? (
                      <a
                        href={`/dashboard/campaigns/${campaignId}/lore/${liveState.current_location_lore_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-fit items-center gap-1.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:text-accent-gold transition-colors"
                      >
                        <ScrollText className="h-3.5 w-3.5" />
                        Lore-Eintrag öffnen
                        <ExternalLink className="h-3 w-3 opacity-80" />
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
                      Ort
                    </span>
                    <span className="font-libre text-sm text-gray-200 wrap-break-word">
                      {liveState?.current_location || "Unbekannter Ort"}
                    </span>
                    {sessionLocationLoreReadable &&
                    liveState?.current_location_lore_id ? (
                      <a
                        href={`/dashboard/campaigns/${campaignId}/lore/${liveState.current_location_lore_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-fit items-center gap-1.5 rounded border border-amber-900/60 bg-background-dark/80 px-2 py-1.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:border-accent-gold hover:text-accent-gold transition-colors"
                      >
                        <ScrollText className="h-3.5 w-3.5" />
                        Ort in der Lore lesen
                        <ExternalLink className="h-3 w-3 opacity-80" />
                      </a>
                    ) : null}
                  </div>
                )}
                </div>
                <div className="min-w-0 shrink-0 border-t border-amber-900/40 pt-3 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0 xl:max-w-[min(100%,28rem)]">
                  <FateCoinsPool
                    sessionId={sessionId}
                    coins={liveState?.fate_coins ?? []}
                    destroyedCount={liveState?.destroyed_fate_coins ?? 0}
                    isGM={isGM}
                    showControls={isGM}
                    compact
                    inlineHeader
                    collapsibleGmSettings={isGM}
                    gmSettingsOpen={fateGmSettingsOpen}
                    onGmSettingsToggle={
                      isGM ? () => setFateGmSettingsOpen((v) => !v) : undefined
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 rounded border border-amber-900/60 bg-background-dark/80 px-3 py-2">
                <Clock className="h-4 w-4 text-accent-gold" />
                {isGM ? (
                  <input
                    type="text"
                    defaultValue={liveState?.current_time || ""}
                    placeholder="Zeit"
                    onBlur={(e) =>
                      updateLiveState({ current_time: e.target.value || null })
                    }
                    className="min-w-[120px] flex-1 bg-transparent text-sm text-white focus:outline-none"
                  />
                ) : (
                  <span className="font-libre text-sm text-gray-200">
                    {liveState?.current_time || "Zeit unbekannt"}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {isUpdating && (
                  <span className="self-center font-libre text-xs text-gray-500">
                    Änderungen werden übertragen...
                  </span>
                )}
                {isGM && (
                  <>
                    <Link
                      href={stagePrepHref}
                      className="inline-flex items-center gap-1 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-2 font-barlow font-bold uppercase text-[10px] text-accent-gold hover:bg-accent-gold/20 transition-colors"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Bühne vorbereiten
                    </Link>
                    <button
                      type="button"
                      onClick={() => setIsStageManagerOpen(true)}
                      className="inline-flex items-center gap-1 rounded border border-amber-900/60 bg-background-dark px-3 py-2 font-barlow font-bold uppercase text-[10px] text-gray-200 hover:border-accent-gold hover:text-white transition-colors"
                    >
                      Stage live
                    </button>
                    <button
                      type="button"
                      onClick={() => setNpcSearchModalOpen(true)}
                      className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-background-dark px-3 py-2 font-barlow font-bold uppercase text-[10px] text-accent-gold hover:border-accent-gold transition-colors"
                      title="NPCs suchen und auf die Bühne legen"
                    >
                      <Search className="h-3.5 w-3.5" />
                      NPCs
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid min-h-0 grid-cols-1 overflow-visible lg:grid-cols-[13rem_minmax(0,1fr)]">
            <aside className="relative z-10 flex flex-col gap-4 overflow-y-auto border-b border-amber-900/50 bg-linear-to-b from-background-card/90 via-emerald-950/85 to-background-dark/95 p-4 pb-44 lg:border-b-0 lg:border-r">
              <GmSlideSettingsPanel
                isGM={isGM}
                open={weatherGmSettingsOpen}
                onToggle={() => setWeatherGmSettingsOpen((v) => !v)}
                settingsLabel="Wetter auswählen"
                preview={
                  <div
                    className="flex min-h-36 items-center justify-center p-2"
                    title={weatherVisual.label}
                    aria-label={`Wetter: ${weatherVisual.label}`}
                  >
                    <WeatherPngIcon
                      option={weatherVisual}
                      sizeClassName="h-28 w-28 md:h-36 md:w-36"
                    />
                  </div>
                }
                previewClassName="w-full"
              >
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
              </GmSlideSettingsPanel>

              {isGM ? (
                <GmSlideSettingsPanel
                  variant="beside"
                  isGM
                  open={tempGmSettingsOpen}
                  onToggle={() => setTempGmSettingsOpen((v) => !v)}
                  settingsLabel="Temperatur anpassen"
                  preview={
                    <div
                      className="relative h-72 w-32 shrink-0 overflow-hidden"
                      title="Thermometer"
                      aria-label="Thermometer"
                    >
                      <div className="absolute bottom-[29%] left-1/2 z-0 h-[49%] w-[12%] -translate-x-1/2 overflow-hidden rounded-full">
                        <motion.div
                          className="absolute bottom-0 left-0 w-full rounded-full shadow-[0_0_18px_rgba(239,68,68,0.65)]"
                          animate={{ height: `${getTemperatureFillPercent(temperatureValue)}%` }}
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
                    </div>
                  }
                >
                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/15 pb-2">
                      <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                        Aktuell (Live)
                      </span>
                      <span className="font-barlow text-xl font-extrabold text-accent-gold">
                        {temperatureValue} °C
                      </span>
                    </div>
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
                      className="h-2 w-full min-w-[10rem] cursor-pointer appearance-none rounded-full bg-background-dark/80 accent-accent-gold outline-none"
                    />
                  </div>
                </GmSlideSettingsPanel>
              ) : (
                <div className="flex items-center justify-center">
                  <div
                    className="relative h-72 w-32 overflow-hidden"
                    title={`Temperatur: ${temperatureValue} °C`}
                    aria-label={`Temperatur: ${temperatureValue} Grad Celsius`}
                  >
                    <div className="absolute bottom-[29%] left-1/2 z-0 h-[49%] w-[12%] -translate-x-1/2 overflow-hidden rounded-full">
                      <motion.div
                        className="absolute bottom-0 left-0 w-full rounded-full shadow-[0_0_18px_rgba(239,68,68,0.65)]"
                        animate={{ height: `${getTemperatureFillPercent(temperatureValue)}%` }}
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
                </div>
              )}

              {isGM && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setTravelGmModalOpen(true)}
                    className="flex w-full min-h-[4.5rem] items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-left backdrop-blur-md transition-colors hover:border-accent-gold/40 hover:bg-white/[0.12]"
                  >
                    <Map className="h-10 w-10 shrink-0 text-accent-gold" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-barlow text-[10px] font-extrabold uppercase tracking-wide text-accent-gold">
                        Reise &amp; FAP
                      </span>
                      <span className="mt-0.5 block font-libre text-[11px] leading-snug text-gray-400">
                        Großes Fenster: Reisetage, Gruppe, Rationen — nicht mehr in der schmalen Leiste.
                      </span>
                    </span>
                  </button>

                  <GmSlideSettingsPanel
                    isGM
                    open={tablePresenceGmSettingsOpen}
                    onToggle={() => setTablePresenceGmSettingsOpen((v) => !v)}
                    settingsLabel="Spieler physisch am Tisch"
                    preview={
                      <div className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                        <Armchair className="h-10 w-10 text-accent-gold" aria-hidden />
                        <span className="font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-400">
                          Vor Ort
                        </span>
                      </div>
                    }
                    previewClassName="w-full"
                  >
                    <p className="font-libre mb-3 text-xs leading-relaxed text-gray-300">
                      Bei Hybridrunden: Wenn jemand physisch am Tisch sitzt, aber keinen Browser offen hat
                      (z.&nbsp;B. nur der Online-Slot ist belegt), markiere den Charakter hier — das
                      Portrait wird dann nicht mehr ausgegraut.
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
                  </GmSlideSettingsPanel>

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
              )}
            </aside>

            <div
              className={`relative min-h-[calc(48vh+120px)] overflow-x-hidden overflow-y-auto bg-slate-950 bg-cover bg-center transition-shadow duration-200 ${
                stageDropHighlight
                  ? "ring-2 ring-accent-gold ring-inset"
                  : ""
              }`}
              style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
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
                } catch {
                  /* ignore invalid payload */
                }
              }}
            >
            {isGM ? (
              <div className="pointer-events-none absolute bottom-0 right-0 z-[28] flex flex-col items-end gap-2 p-3 md:p-5">
                <button
                  type="button"
                  onClick={() => setTravelGmModalOpen(true)}
                  className="pointer-events-auto flex items-center gap-2 rounded-xl border border-amber-700/60 bg-background-card/95 px-3 py-2 font-barlow text-[10px] font-extrabold uppercase tracking-wide text-amber-100 shadow-lg backdrop-blur-md transition-colors hover:bg-amber-950/50 sm:px-4 sm:py-2.5 sm:text-xs"
                >
                  <Map className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
                  <span className="hidden min-[380px]:inline">{"Reise & FAP"}</span>
                  <span className="min-[380px]:hidden">Reise</span>
                  {liveState?.downtime_active ? (
                    <span
                      className="ml-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400 ring-2 ring-amber-400/40"
                      title="Reise aktiv"
                      aria-hidden
                    />
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => setLootGmModalOpen(true)}
                  className="pointer-events-auto flex items-center gap-2 rounded-xl border border-accent-gold/60 bg-background-card/95 px-3 py-2 font-barlow text-[10px] font-extrabold uppercase tracking-wide text-accent-gold shadow-lg backdrop-blur-md transition-colors hover:bg-accent-gold/15 sm:px-4 sm:py-2.5 sm:text-xs"
                >
                  <Gift className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
                  <span className="hidden min-[380px]:inline">Loot-Gun</span>
                  <span className="min-[380px]:hidden">Loot</span>
                  {liveState?.current_loot_id ? (
                    <span
                      className="ml-0.5 h-2 w-2 shrink-0 rounded-full bg-hero-vibrant ring-2 ring-hero-vibrant/40"
                      title="Truhe auf der Bühne aktiv"
                      aria-hidden
                    />
                  ) : null}
                </button>
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
              <div className="absolute inset-x-4 top-4 z-20">
                <div
                  onDragOver={(e) => {
                    if (!isGM) return;
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = "copy";
                  }}
                  onDrop={dropCombatToken}
                  className="min-h-24 rounded-2xl border border-amber-900/70 bg-linear-to-r from-background-card/90 via-emerald-950/80 to-background-dark/90 px-4 py-3 shadow-2xl backdrop-blur-md"
                >
                  <div className="mb-2 flex items-center justify-end gap-3">
                    {isGM ? (
                      <button
                        type="button"
                        onClick={nextCombatTurn}
                        disabled={sortedCombatParticipants.length === 0}
                        className="rounded border border-accent-gold/70 bg-accent-gold/15 px-4 py-2 font-barlow text-xs font-extrabold uppercase text-accent-gold hover:bg-accent-gold/25 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Nächster Zug
                      </button>
                    ) : null}
                  </div>
                  {sortedCombatParticipants.length === 0 ? (
                    <div
                      className="min-h-12 rounded-xl border border-dashed border-amber-900/70 bg-black/20"
                      aria-label="Leere Initiative-Zeitleiste"
                    />
                  ) : (
                    <div className="flex max-w-full items-end gap-4 overflow-x-auto px-4 pb-7 pt-10">
                      {sortedCombatParticipants.map((participant) => {
                        const active = participant.id === activeCombatParticipant?.id;
                        return (
                          <motion.div
                            key={participant.id}
                            className="relative flex shrink-0 flex-col items-center gap-2"
                            animate={active ? { scale: 1.08 } : { scale: 1 }}
                            transition={{ type: "spring", damping: 18, stiffness: 220 }}
                          >
                            {active ? (
                              <motion.div
                                className="absolute -top-8 text-xl text-accent-gold drop-shadow-[0_0_8px_rgba(202,185,38,0.75)]"
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                              >
                                ▼
                              </motion.div>
                            ) : null}
                            <div
                              className={`grid h-17.5 w-17.5 place-items-center overflow-hidden rounded-full border bg-slate-950 ${
                                active
                                  ? "border-accent-gold ring-2 ring-accent-gold/45 ring-offset-2 ring-offset-background-dark shadow-[0_0_14px_rgba(202,185,38,0.55)]"
                                  : "border-amber-900/70"
                              }`}
                            >
                              {participant.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element -- Combat token
                                <img
                                  src={participant.image_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="font-barlow text-lg font-extrabold text-accent-gold">
                                  {participant.type === "monster"
                                    ? participant.name.replace("Monster ", "")
                                    : participant.name[0]}
                                </span>
                              )}
                            </div>
                            <input
                              type="number"
                              value={participant.initiative_value}
                              onChange={(e) =>
                                void updateCombatParticipant(participant.id, {
                                  initiative_value: Number(e.target.value) || 0,
                                })
                              }
                              disabled={!isGM}
                              className="w-14 rounded border border-zinc-600 bg-zinc-950 px-1 py-0.5 text-center font-barlow text-xs font-bold text-zinc-100 outline-none focus:border-accent-gold disabled:opacity-70"
                              aria-label={`Initiative für ${participant.name}`}
                            />
                            {isGM ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void updateCombatParticipant(participant.id, {
                                    is_active: false,
                                  })
                                }
                                className="absolute -right-2 top-0 grid h-6 w-6 place-items-center rounded-full border border-red-700/70 bg-red-950/90 text-red-200 hover:bg-red-800"
                                aria-label={`${participant.name} entfernen`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {isGM ? (
                  <div className="mt-2 rounded-2xl border border-amber-900/45 bg-background-dark/65 px-3 py-2 shadow-2xl backdrop-blur-md">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-barlow text-[10px] font-extrabold uppercase tracking-wide text-accent-gold">
                        Token-Bank
                      </span>
                      <span className="font-libre text-[10px] text-gray-500">
                        Kurzer Zugweg nach oben auf den Zeitstrahl
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 xl:flex-row xl:items-start">
                      <div className="min-w-0 flex-1">
                        <span className="mb-1 block font-barlow text-[9px] font-bold uppercase text-gray-500">
                          Spieler
                        </span>
                        <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                          {combatPlayerTokens.map((token) => {
                            const used = combatParticipantNames.has(token.name);
                            return (
                              <button
                                key={token.name}
                                type="button"
                                draggable={!used}
                                onDragStart={(e) => dragCombatToken(e, token)}
                                onClick={() => void addCombatToken(token)}
                                disabled={used}
                                className="flex min-w-32 shrink-0 items-center gap-2 rounded-full border border-amber-900/60 bg-black/35 px-2 py-1.5 text-left transition-colors hover:border-accent-gold hover:bg-accent-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-950">
                                  {token.image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element -- Combat token
                                    <img
                                      src={token.image_url}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="font-barlow text-xs font-bold text-accent-gold">
                                      {token.name[0]}
                                    </span>
                                  )}
                                </span>
                                <span className="min-w-0 truncate font-barlow text-[10px] font-bold uppercase text-gray-200">
                                  {token.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="min-w-0 xl:w-72">
                        <span className="mb-1 block font-barlow text-[9px] font-bold uppercase text-gray-500">
                          Monster
                        </span>
                        <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
                          {combatMonsterTokens.map((token) => {
                            const used = combatParticipantNames.has(token.name);
                            return (
                              <button
                                key={token.name}
                                type="button"
                                draggable={!used}
                                onDragStart={(e) => dragCombatToken(e, token)}
                                onClick={() => void addCombatToken(token)}
                                disabled={used}
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-red-900/60 bg-red-950/50 font-barlow text-[10px] font-extrabold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-35"
                                title={token.name}
                              >
                                {token.name.replace("Monster ", "")}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {!stageHasDeckContent ? (
              <div className="relative z-10 flex h-full min-h-[calc(48vh+120px)] items-center justify-center px-4 text-center">
                <p className="max-w-md rounded-lg border border-white/10 bg-black/45 px-5 py-4 font-libre text-sm text-gray-300 backdrop-blur-sm">
                  {isGM
                    ? "Noch nichts auf der Bühne. Ziehe Karten aus dem Deck unten hierher oder nutze Stage live."
                    : "Noch nichts auf der Bühne. Der Spielleiter kann NPCs und Fraktionen aktivieren."}
                </p>
              </div>
            ) : (
              <div
                className={`relative z-10 flex min-h-[calc(48vh+120px)] flex-col justify-start gap-8 px-5 pb-5 md:px-8 md:pb-8 ${
                  liveState?.is_combat_mode ? "pt-56" : "pt-[60px]"
                }`}
              >
                {liveState?.active_shop_id ? (
                  <LiveStageShopOverlay
                    campaignId={campaignId}
                    shopId={liveState.active_shop_id}
                    merchantNpcId={liveState.active_merchant_npc_id ?? null}
                    characterId={currentPlayerCharacter?.id ?? null}
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
                            isUpdating={isUpdating}
                            reputationScore={npcReputationScores[String(npc.id)] ?? 0}
                            reactions={reactionsForNpc}
                            onPortrait={setStagePortrait}
                            onReaction={handleNpcReaction}
                            onRemove={(npcId) => removeFromStage("npc", npcId)}
                            onToggleShop={toggleShopForNpc}
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
                              onPortrait={setStagePortrait}
                              onRemove={(factionId) => removeFromStage("faction", factionId)}
                            />
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>

          <div className="relative z-50 h-40 shrink-0 overflow-visible border-t border-amber-900/50 bg-linear-to-r from-background-card/95 via-emerald-950/90 to-background-dark/95 px-4">
            {displayPartyCharacters.length === 0 ? (
              <div className="space-y-1">
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
              <div className="absolute inset-x-0 -top-[146px] z-[60] flex justify-center px-1 pb-8 pointer-events-none">
                <div className="pointer-events-auto w-fit max-w-full overflow-x-auto overflow-y-visible">
                  <div className="flex justify-center gap-5">
                {displayPartyCharacters.map((pc) => {
                  const pid = pc.playerUserId ? String(pc.playerUserId) : "";
                  const self = pid === userId;
                  const onDeck =
                    Boolean(pc.isSessionDummy) ||
                    !pid ||
                    self ||
                    presentUserIds.has(pid) ||
                    physicallyPresentIdSet.has(pid);
                  const isScribe = !!pid && liveState?.scribe_id === pid;
                  const canOpenInventory =
                    ((actualUserIsGM && !forcePlayerView) || pid === userId) &&
                    !pc.isSessionDummy;
                  const isActiveTurn =
                    liveState?.is_combat_mode &&
                    activeCombatParticipant?.type === "player" &&
                    activeCombatParticipant.name === pc.name &&
                    !pc.isSessionDummy;
                  return (
                    <motion.div
                      key={pc.id}
                      className={`relative flex min-w-[248px] flex-col items-center pt-10 transition-[opacity,filter,transform] duration-200 ${
                        onDeck ? "" : "opacity-50 grayscale"
                      }`}
                      animate={
                        isActiveTurn
                          ? {
                              y: [0, -6, 0],
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
                      <div className="relative h-64 w-52 drop-shadow-2xl">
                        <Image
                          src="/images/Session_ui/player-frame.png?v=20260429-freigestellt"
                          alt=""
                          fill
                          sizes="248px"
                          className="pointer-events-none object-contain object-bottom"
                          priority={false}
                          unoptimized
                        />
                        <div className="absolute inset-x-5 bottom-10 top-10 z-10 flex flex-col items-center px-5 pt-0 text-center">
                          <div
                            className={`relative -mt-4 flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-hero-dark shadow-xl ${
                              pc.isSessionDummy
                                ? "border-dashed border-amber-600/90"
                                : "border-amber-800/80"
                            }`}
                          >
                            {pc.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element -- Externe Charakter-Avatare aus Userdaten
                              <img
                                src={pc.avatar_url}
                                alt={pc.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="font-barlow text-4xl text-accent-gold">
                                {pc.name[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <p className="mt-3 max-w-36 truncate font-barlow text-base font-extrabold uppercase tracking-wide text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                            {pc.name}
                          </p>
                          <p className="mt-0.5 max-w-36 truncate font-libre text-xs text-gray-200 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                            {pc.isSessionDummy
                              ? "Platzhalter · kein Account"
                              : `Lvl ${pc.level || 1} · ${pc.class || "Unbekannt"}`}
                          </p>
                          {pid && !self && !onDeck ? (
                            <p className="mt-1 font-libre text-[9px] text-amber-300/90">
                              Nicht online
                            </p>
                          ) : null}
                        </div>
                        {isScribe && (
                          <span
                            title="Chronist"
                            className="absolute right-7 top-6 z-20 text-xl text-accent-gold drop-shadow-[0_0_6px_rgba(202,185,38,0.9)]"
                          >
                            🪶
                          </span>
                        )}
                        {isGM && pid ? (
                          <button
                            type="button"
                            onClick={() => assignScribe(isScribe ? null : pid)}
                            className={`absolute right-6 top-6 z-30 rounded-full border p-2 text-sm transition-colors ${
                              isScribe
                                ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                                : "border-amber-900/60 bg-background-dark/85 text-gray-300 hover:text-accent-gold"
                            }`}
                            title={isScribe ? "Chronist entfernen" : "Als Chronist setzen"}
                            aria-label={isScribe ? "Chronist entfernen" : "Als Chronist setzen"}
                          >
                            <Feather className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        {canOpenInventory ? (
                          <button
                            type="button"
                            onClick={() => setInventoryCharacter(pc)}
                            className="absolute -left-8 top-[70px] z-50 cursor-pointer transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent-gold"
                            title={`Rucksack von ${pc.name} öffnen`}
                            aria-label={`Rucksack von ${pc.name} öffnen`}
                          >
                            <Image
                              src="/images/Session_ui/rucksack.png"
                              alt=""
                              width={88}
                              height={88}
                              className="drop-shadow-[0_3px_5px_rgba(0,0,0,0.85)]"
                            />
                          </button>
                        ) : null}
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

        {isGM && (inHandNpcs.length > 0 || inHandFactions.length > 0) && (
          <StageDeckHand
            npcs={inHandNpcs}
            factions={inHandFactions}
            onPlace={placeOnStage}
          />
        )}
      </div>

      {isGM ? (
        <LootGmModal
          open={lootGmModalOpen}
          onClose={() => setLootGmModalOpen(false)}
          sessionId={sessionId}
          campaignId={campaignId}
          activeLootId={liveState?.current_loot_id ?? null}
          onClearStageLoot={() => updateLiveState({ current_loot_id: null, loot_hide_npcs: false })}
          onPublished={async () => {
            await refreshLiveState();
            router.refresh();
            setLootGmModalOpen(false);
          }}
        />
      ) : null}

      {isGM ? (
        <TravelDowntimeGmModal
          open={travelGmModalOpen}
          onClose={() => setTravelGmModalOpen(false)}
          sessionId={sessionId}
          partyCharacters={partyCharacters}
          downtimeActive={!!liveState?.downtime_active}
          downtimeCurrentDay={liveState?.downtime_current_day ?? 1}
          downtimeTotalDays={liveState?.downtime_total_days ?? 1}
          fapAllocations={liveState?.fap_allocations ?? {}}
          onReload={async () => {
            await refreshLiveState();
            router.refresh();
          }}
        />
      ) : null}

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

      <button
        type="button"
        onClick={() => setIsJournalOpen((prev) => !prev)}
        className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-lg border border-r-0 border-amber-800/70 bg-background-card/95 px-3 py-4 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold shadow-2xl transition-colors hover:bg-emerald-950"
      >
        📜 {isJournalOpen ? "Chronik schließen" : "Chronik öffnen"}
      </button>

      <AnimatePresence>
        {isJournalOpen ? (
          <motion.div
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-amber-900/60 bg-linear-to-b from-background-card/95 via-emerald-950/95 to-background-dark/95 shadow-2xl backdrop-blur-md"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            role="dialog"
            aria-label="Chronik der Session"
          >
        <div className="flex items-center justify-between border-b border-amber-900/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent-gold" />
            <div>
              <h2 className="font-barlow text-sm font-bold uppercase text-gray-200">
                Chronik der Session
              </h2>
              <p className="font-libre text-[10px] text-gray-500">
                System-Logs und Notizen des Chronisten
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsJournalOpen(false)}
            className="rounded p-1 text-gray-400 hover:bg-background-dark hover:text-white transition-colors"
            aria-label="Chronik schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
          <section className="max-h-56 overflow-y-auto rounded border border-amber-900/50 bg-background-dark/80 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-barlow text-xs font-bold uppercase text-accent-gold">
                System-Logs
              </h3>
              <span className="font-libre text-[10px] text-gray-500">
                vorbereitet für Auto-Events
              </span>
            </div>
            {systemLogs.length > 0 ? (
              <ul className="space-y-2">
                {systemLogs.map((log) => (
                  <li
                    key={log.id}
                    className="rounded border border-accent-gold/30 bg-accent-gold/10 px-3 py-2 italic"
                  >
                    <p className="font-libre text-xs text-gray-200">{log.text}</p>
                    {log.at && (
                      <p className="mt-1 font-barlow text-[9px] uppercase text-gray-500">
                        {log.at}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-libre text-xs italic text-gray-500">
                Noch keine System-Logs. Später erscheinen hier automatisch Ereignisse wie
                Ortswechsel, NPC-Reaktionen oder Szenenwechsel.
              </p>
            )}
          </section>

          <section className="flex min-h-0 flex-1 flex-col rounded border border-hero-border/30 bg-background-dark/80 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-barlow text-xs font-bold uppercase text-gray-200">
                Manuelle Notizen
              </h3>
              {canEditJournal ? (
                <span className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-hero-dark/60 px-2 py-0.5 font-barlow text-[10px] uppercase text-hero-vibrant">
                  <PenSquare className="h-3 w-3" />
                  Schreibrecht
                </span>
              ) : (
                <span className="font-libre text-[10px] text-gray-500">
                  Nur GM / Chronist kann bearbeiten
                </span>
              )}
            </div>
            <textarea
              key={`${sessionId}-${liveState?.scribe_id ?? "none"}-${canEditJournal ? "edit" : "read"}`}
              defaultValue={liveState?.journal_text || ""}
              readOnly={!canEditJournal}
              onBlur={(e) => {
                if (!canEditJournal) return;
                updateLiveState({ journal_text: e.target.value || null });
              }}
              placeholder="Notizen zur aktuellen Szene, wichtige Ereignisse, Zitate..."
              className={`min-h-72 flex-1 resize-none rounded border border-hero-dark p-3 font-libre text-sm leading-relaxed outline-none ${
                canEditJournal
                  ? "bg-slate-900 text-white focus:border-hero-vibrant"
                  : "bg-slate-900/50 text-gray-300"
              }`}
            />
          </section>
        </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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


