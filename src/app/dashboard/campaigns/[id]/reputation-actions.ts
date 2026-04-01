"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import {
  getCharacterFactionReputations as loadCharacterFactionReputations,
  type FactionReputation,
} from "./reputation-queries";

export type { FactionReputation };

/** Server Action für Client; Server Components: reputation-queries importieren. */
export async function getCharacterFactionReputations(
  characterId: string,
  campaignId: string,
): Promise<FactionReputation[]> {
  return loadCharacterFactionReputations(characterId, campaignId);
}

/**
 * GM: Ruf für einen Charakter bei einer Fraktion setzen/aktualisieren
 */
export async function upsertCharacterFactionReputation(data: {
  campaign_id: string;
  character_id: string;
  faction_id: string;
  reputation: number;
  rank?: string | null;
  gm_notes?: string | null;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", data.campaign_id)
    .single();

  if (!campaign || !isCampaignGm(campaign as { gm_id?: string | null; owner_id?: string | null }, user.id)) {
    throw new Error("Nur der Spielleiter kann den Ruf verwalten.");
  }

  const rep = Math.max(-100, Math.min(100, data.reputation));

  const { error } = await (supabase.from("character_faction_reputation") as any)
    .upsert(
      {
        character_id: data.character_id,
        faction_id: data.faction_id,
        reputation: rep,
        rank: (data.rank && String(data.rank).trim()) || null,
        gm_notes: data.gm_notes ?? null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "character_id,faction_id",
      }
    );

  if (error) throw new Error(error.message || "Fehler beim Speichern.");
  revalidatePath(`/dashboard/campaigns/${data.campaign_id}`);
  revalidatePath(
    `/dashboard/campaigns/${data.campaign_id}/characters/${data.character_id}`,
  );
  return { success: true };
}

/**
 * GM: Ruf-Eintrag entfernen
 */
export async function deleteCharacterFactionReputation(data: {
  campaign_id: string;
  reputation_id: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", data.campaign_id)
    .single();

  if (!campaign || !isCampaignGm(campaign as { gm_id?: string | null; owner_id?: string | null }, user.id)) {
    throw new Error("Nur der Spielleiter kann den Ruf verwalten.");
  }

  const { data: repRow } = await (supabase.from("character_faction_reputation") as any)
    .select("character_id")
    .eq("id", data.reputation_id)
    .maybeSingle();

  const { error } = await (supabase.from("character_faction_reputation") as any)
    .delete()
    .eq("id", data.reputation_id);

  if (error) throw new Error(error.message || "Fehler beim Löschen.");
  revalidatePath(`/dashboard/campaigns/${data.campaign_id}`);
  const charId = (repRow as { character_id?: string } | null)?.character_id;
  if (charId) {
    revalidatePath(`/dashboard/campaigns/${data.campaign_id}/characters/${charId}`);
  }
  return { success: true };
}
