/**
 * Live-Session Lite — Bühnenzustand zwischen Spielleiter-Fenster und Spieler-Board.
 * Kein Termin, keine Spieler, keine Chronik.
 */
import type { StageSceneMediaItem } from "@/src/components/session/StageSceneCard";
import type { StageCreature } from "@/src/components/session/StageBeastCard";
import type { SessionActivityEntry } from "@/src/lib/actions/session-activity-actions";
import type {
  CampaignFaction,
  CampaignNpc,
} from "@/src/components/session/live-board/live-session-types";

export type LiteNpc = Pick<CampaignNpc, "id" | "name" | "title" | "image_url">;

export type LiteBeast = Pick<StageCreature, "id" | "name" | "creature_type" | "image_url">;

export type LiteFaction = Pick<
  CampaignFaction,
  | "id"
  | "name"
  | "image_url"
  | "banner_url"
  | "type"
  | "current_status"
  | "image_display"
  | "banner_display"
>;

export type LiteLocation = {
  id: string;
  name: string;
  type: string | null;
  image_url: string | null;
};

export type LiteCatalog = {
  npcs: LiteNpc[];
  beasts: LiteBeast[];
  scenes: StageSceneMediaItem[];
  factions: LiteFaction[];
  locations: LiteLocation[];
};

export type LiteStageItem =
  | { kind: "npc"; id: string; npc: CampaignNpc }
  | { kind: "beast"; id: string; creature: StageCreature }
  | { kind: "scene"; id: string; scene: StageSceneMediaItem }
  | { kind: "faction"; id: string; faction: CampaignFaction }
  | {
      kind: "location";
      id: string;
      location: { id: string; name: string; type: string | null; imageUrl: string | null };
    };

export type LiteBackground = {
  locationId: string;
  name: string;
  imageUrl: string | null;
} | null;

/** Letzter Wurf für die 3D-Animation plus eine Ergebniszeile. Kein Chat-Verlauf. */
export type LiteBoardState = {
  items: LiteStageItem[];
  background: LiteBackground;
  diceLogs: SessionActivityEntry[];
  resultLabel: string | null;
};

export const EMPTY_LITE_BOARD: LiteBoardState = {
  items: [],
  background: null,
  diceLogs: [],
  resultLabel: null,
};

export function liveLiteChannelName(campaignId: string): string {
  return `th-live-lite:${campaignId}`;
}

export function liveLitePlayerPath(campaignId: string): string {
  return `/live-lite/${campaignId}`;
}

export function liveLiteGmPath(campaignId: string): string {
  return `/dashboard/campaigns/${campaignId}/live-lite`;
}
