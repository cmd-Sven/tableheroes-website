/**
 * character-actions — part 2: createCharacterWithRelations, updateCharacterPlayer.
 */
"use server";

import { validatePlayerSelectionsAgainstCampaignVisibility } from "./part-01";
import { createClient, createAdminClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { imageDisplayToJson, normalizeImageDisplay } from "@/src/lib/image-display";
import { getGmCampaignMembersWithCharacters } from "../members-actions";
import { getCharacterWizardLoreData as loadCharacterWizardLoreData } from "../character-queries";
import { updateCharacterRowWithSchemaFallback } from "@/src/lib/characters/character-update-fallback";
import {
  resolveFoundryProgressionLock,
  stripFoundryLockedCharacterFields,
} from "@/src/lib/foundry-sync/progression-lock-server";
import { setCharacterGoldGp } from "@/src/lib/character-gold";
import { recordPlayerCharacterEditAdmin } from "@/src/lib/characters/player-character-edit-alerts";
import { ensureCharacterStartingBackpackWithClient } from "@/src/lib/actions/character-inventory-actions/part-01";

/**
 * GM: Charakter eines Spielers laden (user_id + campaign_id) für Ruf-Verwaltung.
 * Falls character_id in campaign_members fehlt, wird der Charakter trotzdem gefunden.
 */

export async function createCharacterWithRelations(data: {
  campaign_id: string;
  name: string;
  class: string;
  subclass?: string | null;
  race: string;
  level: number;
  alignment?: string | null;
  biography?: string | null;
  avatar_url?: string | null;
  avatar_storage_path?: string | null;
  faction_id?: string | null;
  location_id?: string | null;
  culture_lore_id?: string | null;
  languages?: string[];
  /** Optional D&D 5e sheet bootstrap (Level-1 Wizard) */
  sheet_data?: unknown | null;
  existing_contacts: Array<{ npc_id: string; relationship_type: string }>;
  new_contacts: Array<{
    name: string;
    role: string;
    relationship_to_character: string;
    description?: string | null;
    status: "Alive" | "Deceased" | "Missing" | "Unknown";
  }>;
}) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Check if user is approved member (ohne characters-Join – FK kann fehlen)
  const { data: membershipRaw, error: membershipError } = await (
    supabase.from("campaign_members") as any
  )
    .select("id, status, character_id")
    .eq("campaign_id", data.campaign_id)
    .eq("user_id", user.id)
    .single();

  if (membershipError) {
    console.error("[createCharacterWithRelations] membership error:", membershipError);
  }

  const membership = membershipRaw as { id: string; status: string; character_id: string | null } | null;

  if (!membership) {
    throw new Error("Du bist kein Mitglied dieser Kampagne.");
  }

  const validStatuses = ["Approved", "Active", "Drafting", "In_Review", "Changes_Proposed"];
  if (!validStatuses.includes(membership.status)) {
    throw new Error(
      "Nur akzeptierte Mitglieder (oder im Entwurf-Status) können Charaktere erstellen.",
    );
  }

  // For Drafting/In_Review: allow creating. For Approved/Active: allow if no character OR character is Dead/Archived
  let characterStatus: string | null = null;
  if (membership.character_id) {
    const { data: charRow } = await (supabase.from("characters") as any)
      .select("status")
      .eq("id", membership.character_id)
      .single();
    characterStatus = (charRow as { status: string } | null)?.status ?? null;
  }

  if (["Approved", "Active"].includes(membership.status) && membership.character_id) {
    const isDeadOrArchived =
      characterStatus === "Dead" || characterStatus === "Archived";

    if (!isDeadOrArchived) {
      throw new Error(
        "Du hast bereits einen aktiven Charakter für diese Kampagne.",
      );
    }
    // If character is Dead or Archived, allow creating a new one
  }

  const { data: campaignCtxRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, world_id")
    .eq("id", data.campaign_id)
    .single();
  const campaignCtx = campaignCtxRaw as { gm_id: string; world_id: string | null } | null;
  if (!campaignCtx?.world_id) {
    throw new Error("Kampagne hat keine Welt.");
  }

  await validatePlayerSelectionsAgainstCampaignVisibility(supabase, {
    campaignId: data.campaign_id,
    worldId: campaignCtx.world_id,
    actorUserId: user.id,
    campaignGmId: campaignCtx.gm_id,
    faction_id: data.faction_id,
    location_id: data.location_id,
    culture_lore_id: data.culture_lore_id,
    languages: data.languages,
    existing_contacts: data.existing_contacts,
  });

  // 3. Start transaction-like operations
  try {
    // 3a. Create Character (Status: Active – sofort spielbar, kein GM-Freischaltungs-Workflow)
    // current_location_id = world_lore.id (Heimatort aus Wizard)
    const { data: character, error: charError } = await (
      supabase.from("characters") as any
    )
      .insert({
        user_id: user.id,
        campaign_id: data.campaign_id,
        name: data.name,
        class: data.class,
        subclass: data.subclass || null,
        race: data.race,
        level: data.level || 1,
        alignment: data.alignment?.trim() ? data.alignment.trim() : null,
        biography: data.biography || null,
        avatar_url: data.avatar_url || null,
        avatar_storage_path: data.avatar_storage_path || null,
        faction_membership: data.faction_id || null,
        current_location_id: data.location_id || null,
        culture_lore_id: data.culture_lore_id || null,
        languages: data.languages && data.languages.length > 0 ? data.languages : [],
        sheet_data: data.sheet_data ?? null,
        sheet_source: data.sheet_data ? "manual" : null,
        status: "Active",
      })
      .select()
      .single();

    if (charError) {
      console.error("Create Character Error:", charError);
      throw new Error(
        charError.message || "Fehler beim Erstellen des Charakters.",
      );
    }

    // 3b. Update campaign_members: Link character AND set status to Approved
    console.log("🔍 [ServerAction] Updating membership for user:", user.id);
    console.log("🔍 [ServerAction] Campaign ID:", data.campaign_id);
    console.log("🔍 [ServerAction] Character ID:", character.id);

    const { data: updateData, error: updateError } = await (
      supabase.from("campaign_members") as any
    )
      .update({
        character_id: character.id,
        status: "Approved", // WICHTIG: Status muss auf Approved wechseln!
      })
      .eq("campaign_id", data.campaign_id)
      .eq("user_id", user.id)
      .select(); // WICHTIG: .select() hinzufügen, um zu sehen ob was passiert ist!

    if (updateError) {
      console.error("❌ [ServerAction] Critical Update Error:", updateError);
      throw new Error("Fehler beim Verknüpfen: " + updateError.message);
    }

    if (!updateData || updateData.length === 0) {
      console.error(
        "❌ [ServerAction] Update Success but NO ROWS changed. Check RLS Policies!",
      );
      console.error(
        "❌ [ServerAction] This usually means RLS blocked the update or no matching row was found.",
      );
      throw new Error(
        "Keine Berechtigung zum Update des Mitglieder-Status. Bitte prüfe die RLS-Policies.",
      );
    } else {
      console.log(
        "✅ [ServerAction] Membership updated successfully:",
        updateData,
      );
    }

    // 3c. NPC-Wünsche als Anträge speichern (player_npc_requests), keine direkten NPC-Inserts
    if (data.new_contacts.length > 0) {
      const requestsToInsert = data.new_contacts.map((c) => ({
        campaign_id: data.campaign_id,
        player_id: user.id,
        character_id: character.id,
        name: c.name,
        relationship_type: c.relationship_to_character,
        description: c.description || null,
        status: "pending",
      }));
      const { error: reqError } = await (
        supabase.from("player_npc_requests") as any
      ).insert(requestsToInsert);
      if (reqError) {
        console.error("Create Player NPC Requests Error:", reqError);
        console.warn(
          "Charakter wurde erstellt, aber NPC-Anträge konnten nicht gespeichert werden.",
        );
      }
    }

    // 3d. Beziehungen nur für bestehende Kontakte (revealed NPCs)
    const relationshipsToInsert: Array<{
      character_id: string;
      npc_id: string;
      relationship_type: string;
    }> = [];
    for (const contact of data.existing_contacts) {
      if (contact.npc_id && contact.relationship_type) {
        relationshipsToInsert.push({
          character_id: character.id,
          npc_id: contact.npc_id,
          relationship_type: contact.relationship_type,
        });
      }
    }
    if (relationshipsToInsert.length > 0) {
      const { error: relError } = await (
        supabase.from("character_relationships") as any
      ).insert(relationshipsToInsert);
      if (relError) {
        console.error("Create Relationships Error:", relError);
        console.warn(
          "Charakter wurde erstellt, aber Beziehungen konnten nicht gespeichert werden.",
        );
      }
    }

    // 3e. Start-Rucksack (Inventar-Item + ausgerüsteter Behälter)
    try {
      await ensureCharacterStartingBackpackWithClient(supabase, character.id);
    } catch (backpackErr) {
      console.error("[createCharacterWithRelations] starting backpack:", backpackErr);
      console.warn(
        "Charakter wurde erstellt, aber der Start-Rucksack konnte nicht angelegt werden.",
      );
    }

    revalidatePath(`/dashboard/campaigns/${data.campaign_id}`);
    return character;
  } catch (error: any) {
    console.error("Create Character With Relations Error:", error);
    throw error;
  }
}

/**
 * Server Action für Spieler: Eigenen Charakter bearbeiten
 */
export async function updateCharacterPlayer(data: {
  character_id: string;
  campaign_id: string;
  name?: string;
  class?: string;
  race?: string;
  level?: number;
  biography?: string | null;
  culture_lore_id?: string | null;
  languages?: string[];
  faction_membership?: string | null;
  current_location_id?: string | null;
  avatar_url?: string | null;
  avatar_storage_path?: string | null;
  /** Zuschnitt Porträt (JSON wie npcs.image_display) */
  avatar_display?: unknown | null;
  token_url?: string | null;
  token_storage_path?: string | null;
  alignment?: string | null;
  bio_family?: string | null;
  bio_occupation?: string | null;
  bio_appearance?: string | null;
  character_flaws?: Array<{ flawId: string; story: string; grantedNote?: string }>;
  experience_points?: number;
  pocket_gold?: number;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: charRow } = await (supabase.from("characters") as any)
    .select("id, user_id, campaign_id")
    .eq("id", data.character_id)
    .single();

  if (!charRow || (charRow as any).user_id !== user.id) {
    throw new Error("Du kannst nur deinen eigenen Charakter bearbeiten.");
  }
  if ((charRow as any).campaign_id !== data.campaign_id) {
    throw new Error("Charakter gehört nicht zu dieser Kampagne.");
  }

  const { data: campaignMeta } = await (supabase.from("campaigns") as any)
    .select("gm_id, world_id")
    .eq("id", data.campaign_id)
    .single();
  const cmeta = campaignMeta as { gm_id: string; world_id: string | null } | null;
  if (!cmeta?.world_id) throw new Error("Kampagne hat keine Welt.");

  await validatePlayerSelectionsAgainstCampaignVisibility(supabase, {
    campaignId: data.campaign_id,
    worldId: cmeta.world_id,
    actorUserId: user.id,
    campaignGmId: cmeta.gm_id,
    faction_id: data.faction_membership !== undefined ? data.faction_membership : undefined,
    location_id: data.current_location_id !== undefined ? data.current_location_id : undefined,
    culture_lore_id: data.culture_lore_id !== undefined ? data.culture_lore_id : undefined,
    languages: data.languages !== undefined ? data.languages : undefined,
  });

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.class !== undefined) updates.class = data.class;
  if (data.race !== undefined) updates.race = data.race;
  if (data.level !== undefined) updates.level = data.level;
  if (data.biography !== undefined) updates.biography = data.biography;
  if (data.culture_lore_id !== undefined) updates.culture_lore_id = data.culture_lore_id;
  if (data.languages !== undefined) updates.languages = data.languages;
  if (data.faction_membership !== undefined) updates.faction_membership = data.faction_membership;
  if (data.current_location_id !== undefined) updates.current_location_id = data.current_location_id;
  if (data.avatar_url !== undefined) {
    updates.avatar_url = data.avatar_url?.trim() ? data.avatar_url.trim() : null;
  }
  if (data.avatar_storage_path !== undefined) {
    updates.avatar_storage_path = data.avatar_storage_path?.trim()
      ? data.avatar_storage_path.trim()
      : null;
  }
  if (data.avatar_display !== undefined) {
    if (data.avatar_display == null) {
      updates.avatar_display = null;
    } else {
      updates.avatar_display = imageDisplayToJson(
        normalizeImageDisplay(data.avatar_display),
      );
    }
  }
  if (data.token_url !== undefined) {
    updates.token_url = data.token_url?.trim() ? data.token_url.trim() : null;
  }
  if (data.token_storage_path !== undefined) {
    updates.token_storage_path = data.token_storage_path?.trim()
      ? data.token_storage_path.trim()
      : null;
  }
  if (data.alignment !== undefined) {
    updates.alignment = data.alignment?.trim() ? data.alignment.trim() : null;
  }
  if (data.bio_family !== undefined) {
    updates.bio_family = data.bio_family?.trim() ? data.bio_family.trim() : null;
  }
  if (data.bio_occupation !== undefined) {
    updates.bio_occupation = data.bio_occupation?.trim() ? data.bio_occupation.trim() : null;
  }
  if (data.bio_appearance !== undefined) {
    updates.bio_appearance = data.bio_appearance?.trim() ? data.bio_appearance.trim() : null;
  }
  if (data.character_flaws !== undefined) {
    updates.character_flaws = Array.isArray(data.character_flaws) ? data.character_flaws : [];
  }
  if (data.experience_points !== undefined) {
    const n = Math.max(0, Math.floor(Number(data.experience_points) || 0));
    updates.experience_points = n;
  }
  let pocketGoldToSet: number | undefined;
  if (data.pocket_gold !== undefined) {
    pocketGoldToSet = Math.max(0, Math.floor(Number(data.pocket_gold) || 0));
  }

  const safeUpdates = await stripFoundryLockedCharacterFields(
    supabase,
    data.campaign_id,
    data.character_id,
    updates,
  );

  const { error } = await updateCharacterRowWithSchemaFallback(
    supabase,
    data.character_id,
    safeUpdates,
  );

  if (error) throw new Error(error.message || "Fehler beim Speichern.");

  if (pocketGoldToSet !== undefined) {
    const goldResult = await setCharacterGoldGp(supabase, data.character_id, pocketGoldToSet);
    if (goldResult.error) throw new Error(goldResult.error);
  }

  await recordPlayerCharacterEditAdmin({
    characterId: data.character_id,
    campaignId: data.campaign_id,
    playerUserId: user.id,
    editSource: "profile",
    editSummary: "Charakterprofil bearbeitet",
  });

  revalidatePath(`/dashboard/campaigns/${data.campaign_id}`);
  revalidatePath(`/dashboard/campaigns/${data.campaign_id}/characters/${data.character_id}`);
  revalidatePath("/dashboard/characters");
  revalidatePath(`/dashboard/characters/${data.character_id}`);
  return { success: true };
}

/**
 * Server Action für GM: Charakter verwalten
 * Nur der GM kann diese Funktion aufrufen.
 */
