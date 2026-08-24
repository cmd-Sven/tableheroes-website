/**
 * live-session-character-avatar.constants — Radial menu config and heuristics.
 */
import {
  BookOpen,
  Camera,
  Heart,
  MapPin,
  Package,
  ScrollText,
  Settings2,
  Shield,
  ShieldAlert,
  Smile,
  Sparkles,
  Swords,
} from "lucide-react";
import { NPC_SIZE_CELLS, parseNpcTokenSizeCategory, type NpcTokenSizeCategory } from "@/src/lib/npcs/npc-sheet-types";
import type { SessionBattlemapToken } from "@/src/lib/session/battlemap-types";

export type RadialPanel =
  | "weapons"
  | "loadouts"
  | "spells"
  | "abilities"
  | "belt"
  | "mood"
  | "gm_state"
  | "token_settings"
  | null;

export function isCasterHeuristic(className: string | null): boolean {
  const c = (className ?? "").toLowerCase();
  return /magier|wizard|zauberer|sorcerer|kleriker|cleric|paladin|barde|bard|hexer|warlock|druide|druid|waldläufer|ranger|artificer/.test(
    c,
  );
}

export function hasClassAbilitiesHeuristic(className: string | null): boolean {
  const c = (className ?? "").toLowerCase();
  return /barbar|barbarian|kämpfer|fighter|mönch|monk|kleriker|cleric|paladin|barde|bard|hexer|warlock|zauberer|sorcerer|druide|druid/.test(
    c,
  );
}

export function sizeCategoryFromCells(sizeCells: number): NpcTokenSizeCategory {
  const fromCells = (Object.entries(NPC_SIZE_CELLS) as [NpcTokenSizeCategory, number][]).find(
    ([, cells]) => cells === sizeCells,
  )?.[0];
  return fromCells ?? "medium";
}

export function buildVisibleRadialItems(args: {
  status: import("@/src/lib/actions/live-session-avatar-actions").LiveAvatarStatus | null;
  className: string | null;
  showDnd5eSheet: boolean;
  isGm: boolean;
  battlemapActive: boolean;
  onStartTokenPlacement?: () => void;
  hasBattlemapToken: boolean;
  combatMode: boolean;
  canJoinCombat: boolean;
  onJoinCombat?: () => void;
  /** Owner or GM may toggle avatar↔webcam mode. */
  canControlWebcam?: boolean;
  webcamActive?: boolean;
}) {
  const {
    status,
    className,
    showDnd5eSheet,
    isGm,
    battlemapActive,
    onStartTokenPlacement,
    hasBattlemapToken,
    combatMode,
    canJoinCombat,
    onJoinCombat,
    canControlWebcam = false,
    webcamActive = false,
  } = args;
  const filtered = RADIAL_ITEMS.filter((item) => {
    if (item.id === "sheet") return showDnd5eSheet;
    if (item.id === "webcam") return canControlWebcam;
    if (item.moodOnly) return true;
    if (item.gmOnly) return isGm;
    if (item.joinCombatOnly) return isGm && combatMode && canJoinCombat && Boolean(onJoinCombat);
    if (item.tokenSettingsOnly) return hasBattlemapToken;
    if (item.tokenOnly) return battlemapActive && Boolean(onStartTokenPlacement);
    if (item.casterOnly) return Boolean(status?.isCaster ?? isCasterHeuristic(className));
    if (item.abilitiesOnly) {
      if ((status?.classResources?.length ?? 0) > 0) return true;
      return hasClassAbilitiesHeuristic(className);
    }
    return true;
  }).map((item) =>
    item.id === "webcam"
      ? {
          ...item,
          label: webcamActive ? "Avatarbild" : "Webcam",
        }
      : item,
  );
  const count = filtered.length;
  if (count === 0) return filtered;
  return filtered.map((item, index) => ({
    ...item,
    angle: -90 + (360 / count) * index,
  }));
}

export type LiveSessionCharacterAvatarProps = {
  sessionId: string;
  campaignId: string;
  characterId: string;
  characterName: string;
  className: string | null;
  fallbackAvatarUrl: string | null;
  avatarDisplay?: unknown | null;
  isDummy?: boolean;
  canInteract: boolean;
  /** SL darf Zustände setzen (überlagert Spieler-Gemüt). */
  isGm?: boolean;
  showDnd5eSheet: boolean;
  /** Battlemap aktiv — Rad-Menü „Token setzen“. */
  battlemapActive?: boolean;
  onStartTokenPlacement?: () => void;
  /** Platziertes Map-Token dieses Charakters (für Token-Einstellungen). */
  battlemapToken?: {
    id: string;
    showHpBar: boolean;
    sizeCells: number;
  } | null;
  onBattlemapTokenSaved?: (token: SessionBattlemapToken) => void;
  /** Kampfmodus: SL kann Charakter in Initiative aufnehmen */
  combatMode?: boolean;
  canJoinCombat?: boolean;
  onJoinCombat?: () => void;
  /** Kompakte Mini-Darstellung in der Party-Leiste */
  density?: "full" | "compact";
  /** Owner or GM may toggle avatar ↔ webcam mode. */
  canControlWebcam?: boolean;
  /** This client owns the character and captures the local camera. */
  isCameraOwner?: boolean;
};

export const RADIAL_ITEMS: {
  id: Exclude<RadialPanel, null> | "sheet" | "token" | "join_combat" | "webcam";
  label: string;
  Icon: typeof Swords;
  angle: number;
  casterOnly?: boolean;
  abilitiesOnly?: boolean;
  moodOnly?: boolean;
  gmOnly?: boolean;
  tokenOnly?: boolean;
  tokenSettingsOnly?: boolean;
  joinCombatOnly?: boolean;
  webcamOnly?: boolean;
}[] = [
  { id: "sheet", label: "Charakterblatt", Icon: ScrollText, angle: -90 },
  { id: "webcam", label: "Webcam", Icon: Camera, angle: -70, webcamOnly: true },
  { id: "mood", label: "Gemütszustand", Icon: Smile, angle: -45, moodOnly: true },
  { id: "gm_state", label: "Zustand (SL)", Icon: ShieldAlert, angle: -15, gmOnly: true },
  {
    id: "join_combat",
    label: "Am Kampf teilnehmen",
    Icon: Swords,
    angle: -5,
    joinCombatOnly: true,
  },
  {
    id: "token_settings",
    label: "Token-Einstellungen",
    Icon: Settings2,
    angle: 0,
    tokenSettingsOnly: true,
  },
  { id: "weapons", label: "Waffenset", Icon: Swords, angle: 30 },
  { id: "loadouts", label: "Ausrüstungsset", Icon: Shield, angle: 75 },
  { id: "spells", label: "Zauberbuch", Icon: BookOpen, angle: 120, casterOnly: true },
  { id: "abilities", label: "Klassenfähigkeiten", Icon: Sparkles, angle: 165, abilitiesOnly: true },
  { id: "belt", label: "Gürtel", Icon: Package, angle: 210 },
  { id: "token", label: "Token setzen", Icon: MapPin, angle: 255, tokenOnly: true },
];

export const PANEL_TITLES: Record<Exclude<RadialPanel, null>, string> = {
  weapons: "Waffenset",
  loadouts: "Ausrüstungsset",
  spells: "Zauberbuch",
  abilities: "Klassenfähigkeiten",
  belt: "Gürtel",
  mood: "Gemütszustand auswählen",
  gm_state: "Zustand zuweisen (SL)",
  token_settings: "Token-Einstellungen",
};

export type AnchorRect = { cx: number; cy: number; top: number; width: number; height: number };
