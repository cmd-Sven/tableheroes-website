/**
 * Typen und Konstanten für Aurenfurt-Karten-NPCs.
 */

import type { CityDistrictId } from "./aurenfurt-districts";
import type { FactionId } from "./aurenfurt-factions";
import type {
  CityEventCard,
  CityInfluenceTier,
} from "@/src/lib/npcs/city-simulation";

export const NPC_PORTRAIT_PLACEHOLDER = "/images/npcs/npc-platzhalter.png";

/** Kartenrolle — getrennt vom Wizard-Feld `role` (Beruf/Titel). */
export type NpcMapRole = "leader" | "operator";

export type NpcDisposition =
  | "bestechlich"
  | "feindselig"
  | "neutral"
  | "opportunistisch"
  | "wohlwollend"
  | "misstrauisch";

export const DISPOSITION_LABELS: Record<NpcDisposition, string> = {
  bestechlich: "Bestechlich",
  feindselig: "Feindselig",
  neutral: "Neutral",
  opportunistisch: "Opportunistisch",
  wohlwollend: "Wohlwollend",
  misstrauisch: "Misstrauisch",
};

export type InfluenceAndLoyalty = {
  /** Einfluss im Viertel, 0–100 */
  influence: number;
  /** Tatsächliche Loyalität zur eigenen Fraktion/Agenda, 0–100 */
  loyalty: number;
  /** Kurze verborgene Agenda */
  agenda: string;
};

export type NpcNarrativeHook = {
  name?: string | null;
  role: string;
  description: string;
  is_alive: boolean;
};

export type NpcCheckResult = {
  type: string;
  dc: number;
  result: string;
  is_critical: boolean;
};

export type NpcAlignment =
  | "Lawful Good"
  | "Neutral Good"
  | "Chaotic Good"
  | "Lawful Neutral"
  | "True Neutral"
  | "Chaotic Neutral"
  | "Lawful Evil"
  | "Neutral Evil"
  | "Chaotic Evil";

export type NpcStatus = "Alive" | "Deceased" | "Missing" | "Unknown";

/**
 * Karten-NPC mit Wizard-Feldern (später als Prefill nutzbar)
 * plus map-spezifischen Verknüpfungen und Achsen.
 */
export type AurenfurtNpc = {
  id: string;
  mapRoles: NpcMapRole[];
  districtId: CityDistrictId;
  factionId: FactionId;
  /** Gesetzt, wenn Betreiber einer Key-Location */
  locationId: string | null;
  /**
   * Echte App-/DB-NPC-ID (UUID), sobald der Karten-NPC mit einem Eintrag verknüpft ist.
   * Ohne `recordId` gibt es keinen Detail-Link — lokale Map-IDs sind keine UUIDs.
   */
  recordId: string | null;

  // —— Wizard / NPCSchema ——
  name: string;
  title: string | null;
  /** Beruf / Rollentitel für den Wizard (nicht mapRoles) */
  role: string;
  race: string | null;
  status: NpcStatus;
  alignment: NpcAlignment;
  description: string;
  appearance: string | null;
  personality_traits: string | null;
  gm_notes: string | null;
  true_nature: string | null;
  hidden_agenda: string | null;
  secret_entry: string | null;
  faction_name_suggestion: string | null;
  current_location_name_suggestion: string | null;
  narrative_hooks: NpcNarrativeHook[];
  check_results: NpcCheckResult[];
  suggested_secret: { title: string; content: string } | null;

  // —— Neue Karten-Attribute ——
  influenceAndLoyalty: InfluenceAndLoyalty;
  darkSecret: string;
  /** Basis-Intel 0–100; Hook moduliert leicht an Kriminalität */
  intelValue: number;
  disposition: NpcDisposition;
  portraitUrl: string;

  // —— Stadt-Simulation (wie Wizard / DB) ——
  forCitySimulation: true;
  cityInfluenceTier: CityInfluenceTier;
  cityAxisLoyalCriminal: number;
  cityAxisGreedyAltruist: number;
  cityAxisPiousSkeptic: number;
  cityAxisSuperstitionReason: number;
  cityDeity: string | null;
  cityFactionId: FactionId | null;
  cityAgenda: string;
  cityEventDeck: CityEventCard[];
};

/** Prefill-Form für den Narrative-/KI-NPC-Wizard. */
export type AurenfurtNpcWizardPrefill = {
  name: string;
  title: string | null;
  role: string | null;
  race: string | null;
  status: string;
  alignment: string;
  description: string;
  appearance: string | null;
  personality_traits: string | null;
  gm_notes: string | null;
  narrative_hooks: NpcNarrativeHook[] | null;
  check_results: NpcCheckResult[];
  faction_name_suggestion: string | null;
  current_location_name_suggestion: string | null;
  true_nature: string | null;
  hidden_agenda: string | null;
  secret_entry: string | null;
  suggested_secret: { title: string; content: string } | null;
};

/** Internes Seed-Format für Katalog-NPCs. */
export type NpcSeed = {
  id: string;
  mapRoles: NpcMapRole[];
  districtId: CityDistrictId;
  factionId: FactionId;
  locationId: string | null;
  name: string;
  title: string | null;
  role: string;
  race: string;
  alignment: NpcAlignment;
  description: string;
  appearance: string;
  personality_traits: string;
  gm_notes: string;
  true_nature: string;
  hidden_agenda: string;
  secret_entry: string;
  hooks: NpcNarrativeHook[];
  checks: NpcCheckResult[];
  influence: number;
  loyalty: number;
  agenda: string;
  darkSecret: string;
  intelValue: number;
  disposition: NpcDisposition;
};

/**
 * Lore-logische Hauptquartiere: Anführer = Betreiber dieses Ortes (kein Klon).
 */
export const FACTION_HQ_LOCATION: Record<FactionId, string> = {
  "rotes-auge": "malanthir-umschlagplatz",
  goldkelchen: "gauklerbuehne",
  "haus-der-seide": "seidenkontor",
  stadtwachen: "hofwache",
  "haeuser-des-nordens": "98fd35d1-f789-4c91-afef-0215ed4b21e7",
  "bund-silberne-rose": "rose-hof",
  "konklave-ewige-ordnung": "konklave-saal",
  zunftbund: "zunft",
  "zirkel-observatorium": "observatorium",
};

export type NpcDetailLinkContext = {
  worldId?: string | null;
  campaignId?: string | null;
};

/**
 * Baut die Detail-URL nur aus vorhandener DB-ID + Kontext.
 * Map-lokale IDs (`npc-op-…`) erzeugen keinen Link.
 */
export function npcDetailHref(
  npc: Pick<AurenfurtNpc, "recordId">,
  ctx: NpcDetailLinkContext = {},
): string | null {
  const recordId = npc.recordId?.trim();
  if (!recordId) return null;
  if (ctx.campaignId) return `/dashboard/campaigns/${ctx.campaignId}/npcs/${recordId}`;
  if (ctx.worldId) return `/dashboard/worlds/${ctx.worldId}/npcs/${recordId}`;
  return null;
}

export type NpcCatalogStats = {
  total: number;
  leaders: number;
  operators: number;
  overlaps: number;
};
