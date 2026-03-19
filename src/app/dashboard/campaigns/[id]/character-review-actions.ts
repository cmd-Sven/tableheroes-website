"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ImportantPerson = {
  name: string;
  relation: string;
  age: number;
  alignment: string;
  npc_id?: string | null;
};

type CharacterReviewData = {
  characterId: string;
  campaignId: string;
  // Alle editierbaren Felder
  name?: string;
  class?: string;
  race?: string;
  level?: number;
  age?: number;
  physical_traits?: string;
  personality_adjectives?: string[];
  backstory_summary?: string;
  profession?: string;
  faction_id?: string | null;
  current_location_id?: string | null;
  temp_location_name?: string | null;
  goals?: string;
  fears?: string;
  important_people?: ImportantPerson[];
  // Change tracking
  changes?: Array<{ field: string; old_value: any; new_value: any }>;
};

/**
 * GM Review Action: Propose Changes
 * Speichert Änderungen + modification_log, setzt Status auf Changes_Proposed
 */
export async function proposeCharacterChanges(data: CharacterReviewData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert.");

  // Verify GM
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", data.campaignId)
    .single();

  // Expliziter Cast gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Änderungen vorschlagen.");
  }

  // Fetch current character
  const { data: currentCharacterRaw } = await (supabase.from("characters") as any)
    .select("*")
    .eq("id", data.characterId)
    .single();

  const currentCharacter = currentCharacterRaw as any;

  if (!currentCharacter) {
    throw new Error("Charakter nicht gefunden.");
  }

  // Build modification log
  const modificationLog = data.changes || [];

  // Update character
  const updateData: any = {
    status: "Changes_Proposed",
    modification_log: modificationLog.length > 0 ? modificationLog : null,
  };

  // Update fields if provided
  if (data.name !== undefined) updateData.name = data.name;
  if (data.class !== undefined) updateData.class = data.class;
  if (data.race !== undefined) updateData.race = data.race;
  if (data.level !== undefined) updateData.level = data.level;
  if (data.age !== undefined) updateData.age = data.age;
  if (data.physical_traits !== undefined) updateData.physical_traits = data.physical_traits;
  if (data.personality_adjectives !== undefined)
    updateData.personality_adjectives = data.personality_adjectives;
  if (data.backstory_summary !== undefined) updateData.backstory_summary = data.backstory_summary;
  if (data.profession !== undefined) updateData.profession = data.profession;
  if (data.faction_id !== undefined) updateData.faction_id = data.faction_id;
  if (data.current_location_id !== undefined) updateData.current_location_id = data.current_location_id;
  if (data.temp_location_name !== undefined) updateData.temp_location_name = data.temp_location_name;
  if (data.goals !== undefined) updateData.goals = data.goals;
  if (data.fears !== undefined) updateData.fears = data.fears;
  if (data.important_people !== undefined) updateData.important_people = data.important_people;

  const { error } = await (supabase.from("characters") as any)
    .update(updateData)
    .eq("id", data.characterId);

  if (error) {
    console.error("Propose Changes Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${data.campaignId}`);
  return { success: true };
}

/**
 * GM Review Action: Approve Character
 * Setzt Status auf Approved und führt Resolver-Logik aus
 */
export async function approveCharacter(characterId: string, campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert.");

  // Verify GM
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Expliziter Cast gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Charaktere akzeptieren.");
  }

  // Fetch character
  const { data: characterRaw } = await (supabase.from("characters") as any)
    .select("*")
    .eq("id", characterId)
    .single();

  const character = characterRaw as any;

  if (!character) {
    throw new Error("Charakter nicht gefunden.");
  }

  // RESOLVER-LOGIK 1: temp_location_name -> Erstelle world_lore Eintrag
  if (character.temp_location_name && character.current_location_id) {
    const { data: parentLocationRaw } = await (supabase.from("world_lore") as any)
      .select("name")
      .eq("id", character.current_location_id)
      .single();

    const parentLocation = parentLocationRaw as { name: string | null } | null;

    const { data: newLocationRaw, error: locationError } = await (supabase.from("world_lore") as any)
      .insert({
        campaign_id: campaignId,
        name: character.temp_location_name,
        type: "Location",
        parent_id: character.current_location_id,
        description: `Detail-Ort in ${parentLocation?.name || "unbekannter Region"}`,
      })
      .select()
      .single();

    const newLocation = newLocationRaw as { id: string } | null;

    if (locationError) {
      console.error("Create Location Error:", locationError);
      throw new Error(`Fehler beim Erstellen des Ortes: ${locationError.message}`);
    }

    // Update character: Ersetze temp_location_name durch die neue ID
    if (newLocation) {
      await (supabase.from("characters") as any)
        .update({
          current_location_id: newLocation.id,
          temp_location_name: null,
        })
        .eq("id", characterId);
    }
  }

  // RESOLVER-LOGIK 2: important_people ohne UUID -> Erstelle NPCs
  if (character.important_people && Array.isArray(character.important_people)) {
    const updatedPeople = await Promise.all(
      character.important_people.map(async (person: any) => {
        // Wenn bereits npc_id vorhanden, nichts tun
        if (person.npc_id) {
          return person;
        }

        // Erstelle neuen NPC
        const { data: newNPCRaw, error: npcError } = await (supabase.from("npcs") as any)
          .insert({
            campaign_id: campaignId,
            name: person.name,
            title: person.relation,
            description: `Wichtige Person für ${character.name}`,
          })
          .select()
          .single();

        const newNPC = newNPCRaw as { id: string } | null;

        if (npcError || !newNPC) {
          console.error("Create NPC Error:", npcError);
          // Fehler nicht werfen, sondern loggen und Person ohne ID lassen
          return person;
        }

        // Update Person mit neuer UUID
        return {
          ...person,
          npc_id: newNPC.id,
        };
      })
    );

    // Update character mit aufgelösten NPCs
    await (supabase.from("characters") as any)
      .update({
        important_people: updatedPeople,
      })
      .eq("id", characterId);
  }

  // Setze Status auf Approved
  const { error: statusError } = await (supabase.from("characters") as any)
    .update({ status: "Approved" })
    .eq("id", characterId);

  if (statusError) {
    console.error("Approve Character Error:", statusError);
    throw new Error(statusError.message);
  }

  // Update campaign_members: character_id + Status Approved
  // WICHTIG: Nach user_id filtern, da character_id evtl. nie gesetzt wurde (z.B. bei submitCharacterApplication-Bug)
  const userId = character.user_id;
  const { error: memberError } = await (supabase.from("campaign_members") as any)
    .update({ character_id: characterId, status: "Approved" })
    .eq("campaign_id", campaignId)
    .eq("user_id", userId);

  if (memberError) {
    console.error("Update Member Status Error:", memberError);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { success: true };
}

/**
 * Player Action: Accept Proposed Changes
 * Führt die gleiche Resolver-Logik aus wie approveCharacter
 */
export async function acceptProposedChanges(characterId: string, campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert.");

  // Verify ownership
  const { data: characterRaw } = await (supabase.from("characters") as any)
    .select("*")
    .eq("id", characterId)
    .single();

  const character = characterRaw as any;

  if (!character || character.user_id !== user.id) {
    throw new Error("Nicht autorisiert.");
  }

  if (character.status !== "Changes_Proposed") {
    throw new Error("Charakter ist nicht im Status 'Changes_Proposed'.");
  }

  // RESOLVER-LOGIK 1: temp_location_name -> Erstelle world_lore Eintrag
  if (character.temp_location_name && character.current_location_id) {
    const { data: parentLocationRaw } = await (supabase.from("world_lore") as any)
      .select("name")
      .eq("id", character.current_location_id)
      .single();

    const parentLocation = parentLocationRaw as { name: string | null } | null;

    const { data: newLocationRaw, error: locationError } = await (supabase.from("world_lore") as any)
      .insert({
        campaign_id: campaignId,
        name: character.temp_location_name,
        type: "Location",
        parent_id: character.current_location_id,
        description: `Detail-Ort in ${parentLocation?.name || "unbekannter Region"}`,
      })
      .select()
      .single();

    const newLocation = newLocationRaw as { id: string } | null;

    if (locationError) {
      console.error("Create Location Error:", locationError);
      throw new Error(`Fehler beim Erstellen des Ortes: ${locationError.message}`);
    }

    // Update character: Ersetze temp_location_name durch die neue ID
    if (newLocation) {
      await (supabase.from("characters") as any)
        .update({
          current_location_id: newLocation.id,
          temp_location_name: null,
        })
        .eq("id", characterId);
    }
  }

  // RESOLVER-LOGIK 2: important_people ohne UUID -> Erstelle NPCs
  if (character.important_people && Array.isArray(character.important_people)) {
    const updatedPeople = await Promise.all(
      character.important_people.map(async (person: any) => {
        // Wenn bereits npc_id vorhanden, nichts tun
        if (person.npc_id) {
          return person;
        }

        // Erstelle neuen NPC
        const { data: newNPCRaw, error: npcError } = await (supabase.from("npcs") as any)
          .insert({
            campaign_id: campaignId,
            name: person.name,
            title: person.relation,
            description: `Wichtige Person für ${character.name}`,
          })
          .select()
          .single();

        const newNPC = newNPCRaw as { id: string } | null;

        if (npcError || !newNPC) {
          console.error("Create NPC Error:", npcError);
          // Fehler nicht werfen, sondern loggen und Person ohne ID lassen
          return person;
        }

        // Update Person mit neuer UUID
        return {
          ...person,
          npc_id: newNPC.id,
        };
      })
    );

    // Update character mit aufgelösten NPCs
    await (supabase.from("characters") as any)
      .update({
        important_people: updatedPeople,
      })
      .eq("id", characterId);
  }

  // Setze Status auf Approved
  const { error } = await (supabase.from("characters") as any)
    .update({ status: "Approved" })
    .eq("id", characterId);

  if (error) {
    console.error("Accept Changes Error:", error);
    throw new Error(error.message);
  }

  // Update campaign_members: character_id + Status Approved (nach user_id filtern)
  const userId = character.user_id;
  const { error: memberError } = await (supabase.from("campaign_members") as any)
    .update({ character_id: characterId, status: "Approved" })
    .eq("campaign_id", campaignId)
    .eq("user_id", userId);

  if (memberError) {
    console.error("Update Member Status Error:", memberError);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { success: true };
}

