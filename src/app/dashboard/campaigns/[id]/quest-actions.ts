"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

  // 3. Insert Quest
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
  }
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
  if (updates.quest_giver_id !== undefined) cleanUpdates.quest_giver_id = updates.quest_giver_id || null;
  if (updates.location_id !== undefined) cleanUpdates.location_id = updates.location_id || null;
  if (updates.assigned_character_id !== undefined) cleanUpdates.assigned_character_id = updates.assigned_character_id || null;
  if (updates.description !== undefined) cleanUpdates.description = updates.description || undefined;
  if (updates.rewards !== undefined) cleanUpdates.rewards = updates.rewards || undefined;
  if (updates.gm_notes !== undefined) cleanUpdates.gm_notes = updates.gm_notes || undefined;
  if (updates.is_revealed !== undefined) cleanUpdates.is_revealed = updates.is_revealed;

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
  const { error } = await (supabase.from("quests") as any).delete().eq("id", questId);

  if (error) {
    console.error("Delete Quest Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${quest.campaign_id}`);
}

// ============================================================================
// Toggle Reveal Status
// ============================================================================
export async function toggleQuestReveal(questId: string, currentState: boolean) {
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

// ============================================================================
// Get Quests (with NPC & Location Joins)
// ============================================================================
export async function getQuests(campaignId: string) {
  const supabase = await createClient();

  // Fetch quests with NPC, Location, and assigned Character data joined
  // RLS will filter based on user role (GM sees all, Player sees only revealed)
  const { data: quests, error } = await (supabase.from("quests") as any)
    .select(`
      *,
      quest_giver:npcs (
        id,
        name,
        title
      ),
      location:world_lore (
        id,
        name,
        type
      ),
      assigned_character:characters (
        id,
        name,
        class,
        race,
        level,
        avatar_url
      )
    `)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch Quests Error:", error);
    return [];
  }

  return quests || [];
}

// ============================================================================
// Quest Participants Management
// ============================================================================

// Add Quest Participant
export async function addQuestParticipant(questId: string, npcId: string, role: string | null) {
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
  const { data: participant, error } = await (supabase.from("quest_participants") as any)
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
  const { data: participant } = await (supabase.from("quest_participants") as any)
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
    .select(`
      *,
      quest_giver:npcs (
        id,
        name,
        title,
        role
      ),
      location:world_lore (
        id,
        name,
        type
      ),
      assigned_character:characters (
        id,
        name,
        class,
        race,
        level,
        avatar_url
      )
    `)
    .eq("id", questId)
    .single();

  if (error) {
    console.error("Fetch Quest Error:", error);
    throw new Error(error.message || "Quest nicht gefunden.");
  }

  return quest;
}

// Get Quest Participants
export async function getQuestParticipants(questId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Participants with NPC data
  const { data: participants, error } = await (supabase.from("quest_participants") as any)
    .select(`
      id,
      npc_id,
      role_description,
      npcs (
        id,
        name,
        title,
        role
      )
    `)
    .eq("quest_id", questId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Get Quest Participants Error:", error);
    return [];
  }

  return participants || [];
}

// Sync Quest Participants (for Create/Update Quest)
export async function syncQuestParticipants(
  questId: string,
  participants: Array<{ npc_id: string; role_description: string | null }>
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
    throw new Error("Nur der GM kann Teilnehmer verwalten.");
  }

  // 3. Get existing participants
  const { data: existing } = await (supabase.from("quest_participants") as any)
    .select("id, npc_id")
    .eq("quest_id", questId);

  const existingNPCIds = new Set((existing || []).map((p: any) => p.npc_id));
  const newNPCIds = new Set(participants.map((p: any) => p.npc_id));

  // 4. Delete removed participants
  const toDelete = (existing || []).filter((p: any) => !newNPCIds.has(p.npc_id));
  if (toDelete.length > 0) {
    const { error: deleteError } = await (supabase.from("quest_participants") as any)
      .delete()
      .in("id", toDelete.map((p: any) => p.id));

    if (deleteError) {
      console.error("Delete Participants Error:", deleteError);
      throw new Error(deleteError.message);
    }
  }

  // 5. Insert/Update participants
  for (const participant of participants) {
    const existingParticipant = (existing as any[])?.find((p: any) => p.npc_id === participant.npc_id);
    
    if (existingParticipant) {
      // Update existing
      const { error: updateError } = await (supabase.from("quest_participants") as any)
        .update({ role_description: participant.role_description || null })
        .eq("id", existingParticipant.id);

      if (updateError) {
        console.error("Update Participant Error:", updateError);
        throw new Error(updateError.message);
      }
    } else {
      // Insert new
      const { error: insertError } = await (supabase.from("quest_participants") as any)
        .insert({
          quest_id: questId,
          npc_id: participant.npc_id,
          role_description: participant.role_description || null,
        });

      if (insertError) {
        console.error("Insert Participant Error:", insertError);
        throw new Error(insertError.message);
      }
    }
  }

  revalidatePath(`/dashboard/campaigns/${quest.campaign_id}`);
}



