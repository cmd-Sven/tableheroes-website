"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server Actions für Charakter-Erstellung mit Beziehungen
 */

type MembershipResult = { 
  id: string; 
  status: string; 
  character_id: string | null; 
  characters: { status: string | null } | null;
};

export async function createCharacterWithRelations(data: {
  campaign_id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  biography?: string | null;
  faction_id?: string | null;
  location_id?: string | null;
  existing_contacts: Array<{ npc_id: string; relationship_type: string }>;
  new_contacts: Array<{
    name: string;
    role: string;
    relationship_to_character: string;
    status: "Alive" | "Deceased" | "Missing" | "Unknown";
  }>;
}) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Check if user is Accepted member
  const { data: membershipRaw } = await (supabase.from("campaign_members") as any)
    .select("id, status, character_id, characters(status)")
    .eq("campaign_id", data.campaign_id)
    .eq("user_id", user.id)
    .single();

  // Hier den Typ knallhart erzwingen
  const membership = membershipRaw as MembershipResult | null;

  if (!membership) {
    throw new Error("Du bist kein Mitglied dieser Kampagne.");
  }

  // Jetzt ist .status garantiert vorhanden
  const validStatuses = ["Accepted", "Drafting"];
  if (!validStatuses.includes(membership.status)) {
    throw new Error("Nur akzeptierte Mitglieder (oder im Entwurf-Status) können Charaktere erstellen.");
  }

  // For Drafting status, allow updating even if character_id exists
  // For Accepted status, allow if no character OR character is Dead/Archived
  if (membership.status === "Accepted" && membership.character_id) {
    const characterStatus = (membership.characters as any)?.status;
    const isDeadOrArchived = characterStatus === "Dead" || characterStatus === "Archived";
    
    if (!isDeadOrArchived) {
      throw new Error("Du hast bereits einen aktiven Charakter für diese Kampagne.");
    }
    // If character is Dead or Archived, allow creating a new one
  }

  // 3. Start transaction-like operations
  try {
    // 3a. Create Character
    const { data: character, error: charError } = await (supabase.from("characters") as any)
      .insert({
        user_id: user.id,
        campaign_id: data.campaign_id,
        name: data.name,
        class: data.class,
        race: data.race,
        level: data.level || 1,
        biography: data.biography || null,
        faction_membership: data.faction_id || null,
      })
      .select()
      .single();

    if (charError) {
      console.error("Create Character Error:", charError);
      throw new Error(charError.message || "Fehler beim Erstellen des Charakters.");
    }

    // 3b. Update campaign_members: Link character AND set status to Accepted
    console.log("🔍 [ServerAction] Updating membership for user:", user.id);
    console.log("🔍 [ServerAction] Campaign ID:", data.campaign_id);
    console.log("🔍 [ServerAction] Character ID:", character.id);

    const { data: updateData, error: updateError } = await (supabase.from("campaign_members") as any)
      .update({ 
        character_id: character.id,
        status: 'Accepted' // WICHTIG: Status muss auf Accepted wechseln!
      })
      .eq("campaign_id", data.campaign_id)
      .eq("user_id", user.id)
      .select(); // WICHTIG: .select() hinzufügen, um zu sehen ob was passiert ist!

    if (updateError) {
      console.error("❌ [ServerAction] Critical Update Error:", updateError);
      throw new Error("Fehler beim Verknüpfen: " + updateError.message);
    }

    if (!updateData || updateData.length === 0) {
      console.error("❌ [ServerAction] Update Success but NO ROWS changed. Check RLS Policies!");
      console.error("❌ [ServerAction] This usually means RLS blocked the update or no matching row was found.");
      throw new Error("Keine Berechtigung zum Update des Mitglieder-Status. Bitte prüfe die RLS-Policies.");
    } else {
      console.log("✅ [ServerAction] Membership updated successfully:", updateData);
    }

    // 3c. Create new NPCs (if any)
    const newNPCIds: string[] = [];
    if (data.new_contacts.length > 0) {
      for (const contact of data.new_contacts) {
        const { data: npc, error: npcError } = await (supabase.from("npcs") as any)
          .insert({
            campaign_id: data.campaign_id,
            user_id: user.id, // Creator
            name: contact.name,
            role: contact.role,
            status: contact.status,
            is_revealed: false, // Wichtig: Nicht sofort für alle sichtbar
          })
          .select()
          .single();

        if (npcError) {
          console.error("Create NPC Error:", npcError);
          // Continue with other NPCs, but log error
          continue;
        }

        if (npc) {
          newNPCIds.push(npc.id);
        }
      }
    }

    // 3d. Create relationships
    const relationshipsToInsert: Array<{
      character_id: string;
      npc_id: string;
      relationship_type: string;
    }> = [];

    // Existing contacts
    for (const contact of data.existing_contacts) {
      if (contact.npc_id && contact.relationship_type) {
        relationshipsToInsert.push({
          character_id: character.id,
          npc_id: contact.npc_id,
          relationship_type: contact.relationship_type,
        });
      }
    }

    // New contacts (use the newly created NPC IDs)
    for (let i = 0; i < data.new_contacts.length; i++) {
      if (newNPCIds[i]) {
        relationshipsToInsert.push({
          character_id: character.id,
          npc_id: newNPCIds[i],
          relationship_type: data.new_contacts[i].relationship_to_character,
        });
      }
    }

    // Insert all relationships
    if (relationshipsToInsert.length > 0) {
      const { error: relError } = await (supabase.from("character_relationships") as any)
        .insert(relationshipsToInsert);

      if (relError) {
        console.error("Create Relationships Error:", relError);
        // Don't throw - character is already created
        console.warn("Charakter wurde erstellt, aber Beziehungen konnten nicht gespeichert werden.");
      }
    }

    revalidatePath(`/dashboard/campaigns/${data.campaign_id}`);
    return character;
  } catch (error: any) {
    console.error("Create Character With Relations Error:", error);
    throw error;
  }
}

/**
 * Server Action für GM: Charakter verwalten
 * Nur der GM kann diese Funktion aufrufen.
 */
export async function updateCharacterByGM(data: {
  character_id: string;
  campaign_id: string;
  status: "Alive" | "Dead" | "Archived" | "Paused";
  level: number;
  biography?: string | null;
  relationships: Array<{
    id?: string;
    npc_id: string;
    relationship_type: string;
    description?: string;
  }>;
}) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Check if user is GM of this campaign
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", data.campaign_id)
    .single();

  // Expliziter Cast, um 'never' zu verhindern
  const campaign = campaignRaw as { gm_id: string } | null;

  if (!campaign) {
    throw new Error("Kampagne nicht gefunden.");
  }

  if (campaign.gm_id !== user.id) {
    throw new Error("Nur der Spielleiter kann Charaktere verwalten.");
  }

  // 3. Verify character belongs to this campaign
  const { data: characterRaw, error: charCheckError } = await (supabase.from("characters") as any)
    .select("id, campaign_id")
    .eq("id", data.character_id)
    .eq("campaign_id", data.campaign_id)
    .single();

  const character = characterRaw as { id: string; campaign_id: string } | null;

  if (charCheckError || !character) {
    throw new Error("Charakter nicht gefunden oder gehört nicht zu dieser Kampagne.");
  }

  try {
    // 4. Update character status, level, and biography
    const { error: updateError } = await (supabase.from("characters") as any)
      .update({
        status: data.status,
        level: data.level,
        biography: data.biography || null,
      })
      .eq("id", data.character_id);

    if (updateError) {
      console.error("Update Character Error:", updateError);
      throw new Error("Fehler beim Aktualisieren des Charakters: " + updateError.message);
    }

    // 5. Update relationships
    // First, get existing relationships
    const { data: existingRelationshipsRaw } = await (supabase.from("character_relationships") as any)
      .select("id")
      .eq("character_id", data.character_id);

    const existingRelationships = existingRelationshipsRaw as { id: string }[] | null;

    const existingIds = (existingRelationships || []).map((r) => r.id);
    const incomingIds = data.relationships
      .filter((r) => r.id)
      .map((r) => r.id as string);

    // Delete relationships that are not in the incoming list
    const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await (supabase.from("character_relationships") as any)
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        console.error("Delete Relationships Error:", deleteError);
        // Don't throw - continue with updates
      }
    }

    // Update or insert relationships
    for (const rel of data.relationships) {
      if (!rel.npc_id || !rel.relationship_type) continue;

      if (rel.id) {
        // Update existing relationship
        const { error: updateRelError } = await (supabase.from("character_relationships") as any)
          .update({
            npc_id: rel.npc_id,
            relationship_type: rel.relationship_type,
            description: rel.description || null,
          })
          .eq("id", rel.id);

        if (updateRelError) {
          console.error("Update Relationship Error:", updateRelError);
          // Continue with other relationships
        }
      } else {
        // Insert new relationship
        const { error: insertRelError } = await (supabase.from("character_relationships") as any)
          .insert({
            character_id: data.character_id,
            npc_id: rel.npc_id,
            relationship_type: rel.relationship_type,
            description: rel.description || null,
          });

        if (insertRelError) {
          console.error("Insert Relationship Error:", insertRelError);
          // Continue with other relationships
        }
      }
    }

    revalidatePath(`/dashboard/campaigns/${data.campaign_id}`);
    return { success: true };
  } catch (error: any) {
    console.error("Update Character By GM Error:", error);
    throw error;
  }
}

