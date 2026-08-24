/**
 * quest-actions — part 1: createQuest, updateQuest, deleteQuest, toggleQuestReveal, completeQuest, addQuestParticipant, deleteQuestParticipant, getQuestById.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { QuestAnchor } from "@/src/types/quest";

/**
 * Server Actions für Quests (Journal)
 *
 * Unterstützt:
 * - Create Quest (with NPC/Location links)
 * - Update Quest
 * - Delete Quest
 * - Toggle Reveal Status
 * - Complete Quest
 * - Get Quests (with NPC & Location Joins)
 */

// ============================================================================
// Create Quest
// ============================================================================

export async function createQuest(formData: {
  campaign_id: string;
  title: string;
  type: string;
  status: string;
  quest_giver_id?: string | null;
  location_id?: string | null;
  assigned_character_id?: string | null;
  description?: string;
  rewards?: string;
  gm_notes?: string;
  is_revealed?: boolean;
}) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", formData.campaign_id)
    .single();

  // Typ-Sicherung gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Quests erstellen.");
  }

  // 3. Questgeber ist Pflicht
  if (
    !formData.quest_giver_id ||
    String(formData.quest_giver_id).trim() === ""
  ) {
    throw new Error(
      "Jede Quest muss einen Questgeber haben. Bitte wähle einen NPC aus.",
    );
  }

  // 4. Insert Quest
  const { data: quest, error } = await (supabase.from("quests") as any)
    .insert({
      campaign_id: formData.campaign_id,
      title: formData.title,
      type: formData.type,
      status: formData.status || "Active",
      quest_giver_id: formData.quest_giver_id || null,
      location_id: formData.location_id || null,
      assigned_character_id: formData.assigned_character_id || null,
      description: formData.description || undefined,
      rewards: formData.rewards || undefined,
      gm_notes: formData.gm_notes || undefined,
      is_revealed: formData.is_revealed ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error("Create Quest Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
  return quest;
}


// ============================================================================
// Update Quest
// ============================================================================
export async function updateQuest(
  questId: string,
  updates: {
    title?: string;
    type?: string;
    status?: string;
    quest_giver_id?: string | null;
    location_id?: string | null;
    assigned_character_id?: string | null;
    description?: string;
    rewards?: string;
    gm_notes?: string;
    is_revealed?: boolean;
  },
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Quest to verify GM ownership
  const { data: quest } = await (supabase.from("quests") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", questId)
    .single();

  if (!quest) throw new Error("Quest nicht gefunden.");

  const campaigns = quest.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann Quests bearbeiten.");
  }

  // 3. Prepare updates (convert empty strings to undefined for optional fields)
  const cleanUpdates: any = {};
  if (updates.title !== undefined) cleanUpdates.title = updates.title;
  if (updates.type !== undefined) cleanUpdates.type = updates.type;
  if (updates.status !== undefined) cleanUpdates.status = updates.status;
  if (updates.quest_giver_id !== undefined)
    cleanUpdates.quest_giver_id = updates.quest_giver_id || null;
  if (updates.location_id !== undefined)
    cleanUpdates.location_id = updates.location_id || null;
  if (updates.assigned_character_id !== undefined)
    cleanUpdates.assigned_character_id = updates.assigned_character_id || null;
  if (updates.description !== undefined)
    cleanUpdates.description = updates.description || undefined;
  if (updates.rewards !== undefined)
    cleanUpdates.rewards = updates.rewards || undefined;
  if (updates.gm_notes !== undefined)
    cleanUpdates.gm_notes = updates.gm_notes || undefined;
  if (updates.is_revealed !== undefined)
    cleanUpdates.is_revealed = updates.is_revealed;

  // 4. Update
  const { error } = await (supabase.from("quests") as any)
    .update(cleanUpdates)
    .eq("id", questId);

  if (error) {
    console.error("Update Quest Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${quest.campaign_id}`);
}


// ============================================================================
// Delete Quest
// ============================================================================
export async function deleteQuest(questId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Quest to verify GM ownership
  const { data: quest } = await (supabase.from("quests") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", questId)
    .single();

  if (!quest) throw new Error("Quest nicht gefunden.");

  const campaigns = quest.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann Quests löschen.");
  }

  // 3. Delete
  const { error } = await (supabase.from("quests") as any)
    .delete()
    .eq("id", questId);

  if (error) {
    console.error("Delete Quest Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${quest.campaign_id}`);
}


// ============================================================================
// Toggle Reveal Status
// ============================================================================
export async function toggleQuestReveal(
  questId: string,
  currentState: boolean,
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Quest to verify GM ownership
  const { data: quest } = await (supabase.from("quests") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", questId)
    .single();

  if (!quest) throw new Error("Quest nicht gefunden.");

  const campaigns = quest.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann die Sichtbarkeit ändern.");
  }

  // 3. Toggle
  const { error } = await (supabase.from("quests") as any)
    .update({ is_revealed: !currentState })
    .eq("id", questId);

  if (error) {
    console.error("Toggle Quest Reveal Error:", error);
    throw new Error(error.message);
  }

  if (!currentState) {
    const { dispatchDiscordNotify, notifyCampaignEntityRevealed } = await import(
      "@/src/lib/integrations/discord/notify"
    );
    dispatchDiscordNotify(async () => {
      await notifyCampaignEntityRevealed(quest.campaign_id, "quest", questId);
    });
  }

  revalidatePath(`/dashboard/campaigns/${quest.campaign_id}`);
}


// ============================================================================
// Complete Quest
// ============================================================================
export async function completeQuest(questId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Quest to verify GM ownership
  const { data: quest } = await (supabase.from("quests") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", questId)
    .single();

  if (!quest) throw new Error("Quest nicht gefunden.");

  const campaigns = quest.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann Quests abschließen.");
  }

  // 3. Update Status
  const { error } = await (supabase.from("quests") as any)
    .update({ status: "Completed" })
    .eq("id", questId);

  if (error) {
    console.error("Complete Quest Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${quest.campaign_id}`);
}


// getQuests: quest-queries.ts

// ============================================================================
// Quest Participants Management
// ============================================================================

// Add Quest Participant
export async function addQuestParticipant(
  questId: string,
  npcId: string,
  role: string | null,
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Quest to verify GM ownership
  const { data: quest } = await (supabase.from("quests") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", questId)
    .single();

  if (!quest) throw new Error("Quest nicht gefunden.");

  const campaigns = quest.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann Teilnehmer hinzufügen.");
  }

  // 3. Check if participant already exists
  const { data: existing } = await (supabase.from("quest_participants") as any)
    .select("id")
    .eq("quest_id", questId)
    .eq("npc_id", npcId)
    .single();

  if (existing) {
    throw new Error("Dieser NPC ist bereits als Teilnehmer hinzugefügt.");
  }

  // 4. Insert Participant
  const { data: participant, error } = await (
    supabase.from("quest_participants") as any
  )
    .insert({
      quest_id: questId,
      npc_id: npcId,
      role_description: role || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Add Quest Participant Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${quest.campaign_id}`);
  return participant;
}


// Delete Quest Participant
export async function deleteQuestParticipant(participantId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Participant and Quest to verify GM ownership
  const { data: participant } = await (
    supabase.from("quest_participants") as any
  )
    .select("quest_id, quests!inner(campaign_id, campaigns!inner(gm_id))")
    .eq("id", participantId)
    .single();

  if (!participant) throw new Error("Teilnehmer nicht gefunden.");

  const quests = participant.quests as any;
  const campaigns = quests.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann Teilnehmer entfernen.");
  }

  // 3. Delete
  const { error } = await (supabase.from("quest_participants") as any)
    .delete()
    .eq("id", participantId);

  if (error) {
    console.error("Delete Quest Participant Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${quests.campaign_id}`);
}


// Get Single Quest by ID
export async function getQuestById(questId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Quest with all related data
  const { data: quest, error } = await (supabase.from("quests") as any)
    .select("*")
    .eq("id", questId)
    .single();

  if (error) {
    console.error("Fetch Quest Error:", error);
    throw new Error(error.message || "Quest nicht gefunden.");
  }

  return quest;
}
