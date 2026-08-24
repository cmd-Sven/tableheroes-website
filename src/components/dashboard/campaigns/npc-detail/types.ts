/**
 * Types and constants for the campaign NPC detail page.
 */
import type { NarrativeHook } from "@/src/types/npc";
import type { SceneMediaAppearance } from "@/src/lib/scene-media-types";

export type Quest = {
  id: string;
  title: string;
  status: string;
  type: string;
  description?: string | null;
  participant_role?: string;
};

export type NPC = {
  id: string;
  name: string;
  title: string | null;
  role: string | null;
  race: string | null;
  status: string | null;
  alignment: string | null;
  description: string | null;
  appearance: string | null;
  personality_traits: string | null;
  gm_notes: string | null;
  image_url: string | null;
  image_display?: unknown;
  image_is_ai_generated?: boolean | null;
  image_upload_rights_confirmed?: boolean | null;
  is_revealed: boolean;
  is_favorite?: boolean;
  all_quests?: Quest[];
  faction_id?: string | null;
  current_location_id?: string | null;
  home_location_id?: string | null;
  factions?: {
    id: string;
    name: string;
    type: string;
  } | null;
  current_location?: {
    id: string;
    name: string;
    type: string;
  } | null;
  home_location?: {
    id: string;
    name: string;
    type: string;
  } | null;
  narrative_hooks?: NarrativeHook[] | null;
  is_secret_antagonist?: boolean;
  hidden_agenda?: string | null;
  true_nature?: string | null;
  check_results?: Array<{
    type: "Wahrnehmung" | "Motiv erkennen" | "Wissen";
    dc: number;
    result: string;
    is_critical: boolean;
  }> | null;
};

export type NPCDetailPageProps = {
  npc: NPC;
  campaignId: string;
  worldId?: string | null;
  isGM: boolean;
  canEdit: boolean;
  userId: string;
  /** Isolierte Spieler-Notiz für diese Kampagne (aus campaign_notes). */
  initialCampaignPlayerNote?: string;
  factions?: Array<{ id: string; name: string }>;
  locations?: Array<{ id: string; name: string; type: string }>;
  lastSeen?: {
    archiveId: string | null;
    sessionName: string | null;
    locationId: string | null;
    locationName: string | null;
    seenAt: string | null;
  } | null;
  sceneAppearances?: SceneMediaAppearance[];
  npcsForQuest?: Array<{ id: string; name: string; title: string | null; role: string | null }>;
  membersForQuest?: Array<{
    id: string;
    character_id: string | null;
    user?: { username: string } | null;
    character_data?: any;
    characters?: any;
  }>;
};

export type InlineEditFieldProps = {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  canEdit: boolean;
  isPending: boolean;
  children: React.ReactNode;
  editComponent: React.ReactNode;
};

export const NPC_STATUSES = [
  { value: "Alive", label: "🟢 Lebendig" },
  { value: "Deceased", label: "🔴 Verstorben" },
  { value: "Missing", label: "🟡 Vermisst" },
  { value: "Unknown", label: "⚪ Unbekannt" },
];

export const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
];
