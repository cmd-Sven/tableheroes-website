import { z } from "zod";

// ============================================================================
// Campaign
// ============================================================================

export const CampaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Kampagnenname muss mindestens 2 Zeichen lang sein."),
  system: z.string(),
  description: z.string().optional().nullable(),
  gm_id: z.string().uuid(),
  status: z.string(),
  is_published: z.boolean(),
  max_players: z.number().int().nullable().optional(),
});

export type Campaign = z.infer<typeof CampaignSchema>;

// ============================================================================
// Campaign Membership
// ============================================================================

export const CampaignMembershipSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.string(),
  status: z.enum(["Applied", "Pending", "Accepted", "Rejected", "Drafting", "In_Review"]),
  application_message: z.string().optional().nullable(),
  // Nicht immer vorhanden, daher optional/nullable
  character_id: z.string().uuid().optional().nullable(),
});

export type CampaignMembership = z.infer<typeof CampaignMembershipSchema>;

// ============================================================================
// Character
// ============================================================================

export const CheckResultSchema = z.object({
  type: z.string(),
  dc: z.number().int(),
  result: z.string(),
  is_critical: z.boolean().optional().nullable(),
});

export const CharacterSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  race: z.string(),
  class: z.string(),
  level: z.number().int(),
  backstory_summary: z.string().optional().nullable(),
  check_results: z.array(CheckResultSchema).optional().nullable(),
});

export type Character = z.infer<typeof CharacterSchema>;

// ============================================================================
// Faction
// ============================================================================

export const FactionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  campaign_id: z.string().uuid(),
  world_id: z.string().uuid().optional().nullable(),
  type: z.string(),
  description: z.string(),
  is_revealed: z.boolean(),
});

export type Faction = z.infer<typeof FactionSchema>;

// ============================================================================
// World (Root World)
// ============================================================================

export const WorldSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  name: z.string(),
  cosmology_type: z.string(),
  genre_style: z.string().optional().nullable(),
  magic_level: z.string().optional().nullable(),
  // String, um auch Fantasy-Zeitrechnungen wie "124 n.Z." zu unterstützen
  current_year: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export type World = z.infer<typeof WorldSchema>;

// ============================================================================
// NPC (AI Response Schema)
// ============================================================================

export const NarrativeHookSchema = z.object({
  name: z.string().optional().nullable(),
  role: z.string(),
  description: z.string(),
  is_alive: z.boolean(),
});

export const NPCSchema = z.object({
  name: z.string(),
  title: z.string().optional().nullable(),
  description: z.string(),
  gm_notes: z.string().optional().nullable(),
  faction_name_suggestion: z.string().optional().nullable(),
  current_location_name_suggestion: z.string().optional().nullable(),
  race: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  status: z.enum(["Alive", "Deceased", "Missing", "Unknown"]),
  alignment: z.enum([
    "Lawful Good",
    "Neutral Good",
    "Chaotic Good",
    "Lawful Neutral",
    "True Neutral",
    "Chaotic Neutral",
    "Lawful Evil",
    "Neutral Evil",
    "Chaotic Evil",
  ]),
  appearance: z.string().optional().nullable(),
  personality_traits: z.string().optional().nullable(),
  true_nature: z.string().optional().nullable(),
  hidden_agenda: z.string().optional().nullable(),
  secret_entry: z.string().optional().nullable(),
  narrative_hooks: z.array(NarrativeHookSchema).optional().nullable(),
  // Proben: mindestens zwei Einträge insgesamt
  check_results: z.array(CheckResultSchema).min(2, "Die KI muss mindestens zwei Proben liefern."),
});

export type NPC = z.infer<typeof NPCSchema>;

// ============================================================================
// Lore Entry (AI Response Schema)
// ============================================================================

export const LoreEntrySchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string(),
  gm_notes: z.string().optional().nullable(),
});

export type LoreEntry = z.infer<typeof LoreEntrySchema>;

// ============================================================================
// Faction AI Response Schema
// ============================================================================

const FactionPlannedMemberSchema = z.object({
  name: z.string(),
  role: z.string(),
});

export const FactionAIResponseSchema = z.object({
  name: z.string(),
  type: z.string(),
  current_status: z.string().optional().nullable(),
  description: z.string(),
  gm_notes: z.string().optional().nullable(),
  headquarters_location_name_suggestion: z.string().optional().nullable(),
  appearance: z.string().optional().nullable(),
  structure: z.string().optional().nullable(),
  philosophy: z.string().optional().nullable(),
  important_npcs_info: z.string().optional().nullable(),
  /** Bis zu 3 geplante Mitglieder (Name + Rolle) für die NPC-TODO-Liste auf der Detailseite */
  planned_members: z.array(FactionPlannedMemberSchema).max(3).optional(),
});

export type FactionAIResponse = z.infer<typeof FactionAIResponseSchema>;


