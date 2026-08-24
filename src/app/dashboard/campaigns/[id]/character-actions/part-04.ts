/**
 * character-actions — part 4: deleteCharacterByGM.
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

export async function deleteCharacterByGM(characterId: string, campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .single();
  const c = campaign as { gm_id: string; owner_id?: string | null } | null;
  const ownerId = c?.owner_id ?? null;
  const canDelete =
    c &&
    (user.id === c.gm_id ||
      (ownerId != null && String(ownerId).trim() !== "" && user.id === ownerId));
  if (!canDelete) {
    throw new Error("Nur der GM kann Charaktere entfernen.");
  }

  const { data: char } = await (supabase.from("characters") as any)
    .select("id, campaign_id")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!char) {
    throw new Error("Charakter nicht gefunden oder gehört nicht zu dieser Kampagne.");
  }

  const detachFromCampaign = async (client: any) => {
    const c = client;
    const { error: cmErr } = await c
      .from("campaign_members")
      .update({ character_id: null })
      .eq("campaign_id", campaignId)
      .eq("character_id", characterId);
    if (cmErr) {
      console.error("[deleteCharacterByGM] campaign_members:", cmErr);
      throw cmErr;
    }

    const { error: archiveErr } = await c
      .from("characters")
      .update({ status: "Archived" })
      .eq("id", characterId)
      .eq("campaign_id", campaignId);
    if (archiveErr) {
      console.error("[deleteCharacterByGM] characters archive:", archiveErr);
      throw archiveErr;
    }

    const { error: mappingErr } = await c
      .from("foundry_character_mapping")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("character_id", characterId);
    if (mappingErr) {
      console.warn("[deleteCharacterByGM] foundry mapping:", mappingErr);
    }

    try {
      await c
        .from("character_player_edit_alerts")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("character_id", characterId)
        .eq("campaign_id", campaignId)
        .is("dismissed_at", null)
        .is("reviewed_at", null);
    } catch {
      /* Tabelle ggf. noch nicht migriert */
    }
  };

  try {
    await detachFromCampaign(supabase);
  } catch (firstErr) {
    console.warn("[deleteCharacterByGM] Anon-Detach fehlgeschlagen, versuche Service-Role:", firstErr);
    try {
      const admin = createAdminClient();
      await detachFromCampaign(admin);
    } catch (secondErr) {
      console.error("[deleteCharacterByGM]", secondErr);
      const msg =
        (secondErr as Error)?.message?.includes("SUPABASE_SERVICE_ROLE_KEY") ||
        (secondErr as Error)?.message?.includes("createAdminClient")
          ? (firstErr as Error)?.message
          : (secondErr as Error)?.message;
      throw new Error(
        msg ||
          "Charakter konnte nicht aus der Kampagne entfernt werden (Berechtigung oder Datenbank).",
      );
    }
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/gm-inbox`);
  revalidatePath("/dashboard/characters");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard");
  return { success: true };
}
