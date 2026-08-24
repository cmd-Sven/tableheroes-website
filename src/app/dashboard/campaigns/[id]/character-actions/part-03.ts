/**
 * character-actions — part 3: updateCharacterByGM, approveCharacter, rejectCharacter.
 */
"use server";

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

/**
 * GM: Charakter eines Spielers laden (user_id + campaign_id) für Ruf-Verwaltung.
 * Falls character_id in campaign_members fehlt, wird der Charakter trotzdem gefunden.
 */

export async function updateCharacterByGM(data: {
  character_id: string;
  campaign_id: string;
  /** DB kann Active, Pending_Approval, Approved, … nutzen */
  status: string;
  level: number;
  name: string;
  class: string;
  race: string;
  biography?: string | null;
  culture_lore_id?: string | null;
  languages?: string[];
  faction_membership?: string | null;
  current_location_id?: string | null;
  avatar_url?: string | null;
  avatar_storage_path: string | null;
  /** Zuschnitt Porträt (JSON wie npcs.image_display) */
  avatar_display: unknown | null;
  relationships: Array<{
    id?: string;
    npc_id: string;
    relationship_type: string;
    description?: string;
  }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();

    // 1. Auth Check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: "Nicht authentifiziert." };
    }

    // 2. Kampagnen-SL oder owner_id (wie getCampaignAccess)
    const { data: campaignRaw } = await (supabase.from("campaigns") as any)
      .select("gm_id, owner_id, world_id")
      .eq("id", data.campaign_id)
      .single();

    const campaign = campaignRaw as {
      gm_id: string;
      owner_id?: string | null;
      world_id: string | null;
    } | null;

    if (!campaign) {
      return { ok: false, error: "Kampagne nicht gefunden." };
    }

    const ownerId = campaign.owner_id ?? null;
    const canManageCharacters =
      user.id === campaign.gm_id ||
      (ownerId != null && String(ownerId).trim() !== "" && user.id === ownerId);

    if (!canManageCharacters) {
      return { ok: false, error: "Nur der Spielleiter kann Charaktere verwalten." };
    }

    // 3. Verify character belongs to this campaign
    const { data: characterRaw, error: charCheckError } = await (
      supabase.from("characters") as any
    )
      .select("id, campaign_id")
      .eq("id", data.character_id)
      .eq("campaign_id", data.campaign_id)
      .single();

    const character = characterRaw as { id: string; campaign_id: string } | null;

    if (charCheckError || !character) {
      return {
        ok: false,
        error: "Charakter nicht gefunden oder gehört nicht zu dieser Kampagne.",
      };
    }

    const langArr = Array.isArray(data.languages) ? data.languages.map(String) : [];

    const avatarDisplayJson =
      data.avatar_display == null
        ? null
        : imageDisplayToJson(normalizeImageDisplay(data.avatar_display));

    const progressionLock = await resolveFoundryProgressionLock(
      supabase,
      data.campaign_id,
      data.character_id,
    );

    let level = data.level;
    let characterClass = data.class;
    if (progressionLock.locked) {
      const { data: currentRaw } = await (supabase.from("characters") as any)
        .select("level, class")
        .eq("id", data.character_id)
        .single();
      level = Number((currentRaw as { level?: number } | null)?.level ?? data.level);
      characterClass = String(
        (currentRaw as { class?: string } | null)?.class ?? data.class,
      );
    }

    const rowUpdate: Record<string, unknown> = {
      status: data.status,
      level,
      name: (data.name ?? "").trim() || "Unbenannt",
      class: characterClass,
      race: data.race,
      biography: data.biography ?? null,
      culture_lore_id: data.culture_lore_id ?? null,
      languages: langArr,
      faction_membership: data.faction_membership ?? null,
      current_location_id: data.current_location_id ?? null,
      avatar_url: data.avatar_url?.trim() ? data.avatar_url.trim() : null,
      avatar_storage_path: data.avatar_storage_path?.trim()
        ? data.avatar_storage_path.trim()
        : null,
      avatar_display: avatarDisplayJson,
    };

    const { error: updateError } = await updateCharacterRowWithSchemaFallback(
      supabase,
      data.character_id,
      rowUpdate,
    );

    if (updateError) {
      console.error("Update Character Error:", updateError);
      throw new Error(
        "Fehler beim Aktualisieren des Charakters: " + updateError.message,
      );
    }

    // 5. Update relationships
    // First, get existing relationships
    const { data: existingRelationshipsRaw } = await (
      supabase.from("character_relationships") as any
    )
      .select("id")
      .eq("character_id", data.character_id);

    const existingRelationships = existingRelationshipsRaw as
      | { id: string }[]
      | null;

    const existingIds = (existingRelationships || []).map((r) => r.id);
    const incomingIds = data.relationships
      .filter((r) => r.id)
      .map((r) => r.id as string);

    // Delete relationships that are not in the incoming list
    const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await (
        supabase.from("character_relationships") as any
      )
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
        const { error: updateRelError } = await (
          supabase.from("character_relationships") as any
        )
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
        const { error: insertRelError } = await (
          supabase.from("character_relationships") as any
        ).insert({
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

    try {
      revalidatePath(`/dashboard/campaigns/${data.campaign_id}`);
      revalidatePath(
        `/dashboard/campaigns/${data.campaign_id}/characters/${data.character_id}`,
      );
    } catch (revErr) {
      console.warn("[updateCharacterByGM] revalidatePath:", revErr);
    }
    return { ok: true };
  } catch (error: unknown) {
    console.error("[updateCharacterByGM]", error);
    const msg =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Speichern fehlgeschlagen.";
    return { ok: false, error: msg };
  }
}

/**
 * GM: Charakter freischalten (Status -> Active). Sync mit campaign_members.
 * 1. characters.status -> Active
 * 2. campaign_members: Eintrag für user+campaign erstellen oder character_id/Status aktualisieren
 * 3. Optional: andere Charaktere dieses Users in dieser Kampagne auf Archived setzen
 */
export async function approveCharacter(
  characterId: string,
  campaignId: string,
) {
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) throw new Error("Nicht authentifiziert.");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .single();
  if (!campaign || (campaign as { gm_id: string }).gm_id !== currentUser.id) {
    throw new Error("Nur der GM kann Charaktere freischalten.");
  }

  const { data: char } = await (supabase.from("characters") as any)
    .select("id, campaign_id, user_id")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .single();
  if (!char)
    throw new Error(
      "Charakter nicht gefunden oder gehört nicht zu dieser Kampagne.",
    );

  const userId = (char as { user_id: string }).user_id;
  if (!userId) throw new Error("Charakter hat keinen Benutzer.");

  // 1. Charakter auf Active setzen
  const { error: charError } = await (supabase.from("characters") as any)
    .update({ status: "Active" })
    .eq("id", characterId);
  if (charError) throw new Error(charError.message);

  // 2. campaign_members: bestehenden Eintrag aktualisieren oder neuen anlegen
  const { data: existingMember } = await (
    supabase.from("campaign_members") as any
  )
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMember) {
    const { error: updateErr } = await (
      supabase.from("campaign_members") as any
    )
      .update({ character_id: characterId, status: "Approved" })
      .eq("id", (existingMember as { id: string }).id);
    if (updateErr) throw new Error(updateErr.message);
  } else {
    const { error: insertErr } = await (
      supabase.from("campaign_members") as any
    ).insert({
      campaign_id: campaignId,
      user_id: userId,
      character_id: characterId,
      status: "Approved",
      role: "Player",
    });
    if (insertErr) throw new Error(insertErr.message);
  }

  // 3. Alle anderen Charaktere dieses Users in dieser Kampagne auf Archived setzen
  const { error: archiveErr } = await (supabase.from("characters") as any)
    .update({ status: "Archived" })
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .neq("id", characterId);
  if (archiveErr) {
    console.warn("Archive other characters:", archiveErr);
    // nicht werfen – Hauptaktion war erfolgreich
  }

  const { awardAchievement } = await import(
    "@/src/lib/actions/achievement-actions"
  );
  const { ACHIEVEMENT_NAMES } = await import(
    "@/src/lib/constants/achievements"
  );
  await awardAchievement(userId, ACHIEVEMENT_NAMES.ERSTER_ATEMZUG);

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/gm-inbox`);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard");
}

/**
 * GM: Charakter-Bewerbung ablehnen (nur für Bewerbungen aus characters, ohne campaign_members-Eintrag).
 */
export async function rejectCharacter(characterId: string, campaignId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .single();
  if (!campaign || (campaign as { gm_id: string }).gm_id !== user.id) {
    throw new Error("Nur der GM kann Bewerbungen ablehnen.");
  }

  const { data: char } = await (supabase.from("characters") as any)
    .select("id")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .single();
  if (!char)
    throw new Error(
      "Charakter nicht gefunden oder gehört nicht zu dieser Kampagne.",
    );

  const { error } = await (supabase.from("characters") as any)
    .update({ status: "Rejected" })
    .eq("id", characterId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/gm-inbox`);
}

/**
 * GM: Spieler-Charakter aus der Kampagne entfernen (Verknüpfung lösen, archivieren).
 * Der Charakter bleibt im Spieler-Profil und kann dort ggf. gelöscht werden.
 */
