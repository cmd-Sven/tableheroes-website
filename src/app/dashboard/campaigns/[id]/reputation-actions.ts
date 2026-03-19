"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type FactionReputation = {
  id: string;
  faction_id: string;
  faction_name: string;
  reputation: number;
  rank: string | null;
  gm_notes: string | null;
};

/**
 * Ruf eines Charakters bei Fraktionen laden (für Spieler: eigener Charakter)
 */
export async function getCharacterFactionReputations(
  characterId: string,
  campaignId: string
): Promise<FactionReputation[]> {
  const supabase = await createClient();

  const { data: rows, error } = await (supabase.from("character_faction_reputation") as any)
    .select("id, faction_id, reputation, rank, gm_notes")
    .eq("character_id", characterId);

  if (error) {
    console.warn("[getCharacterFactionReputations] error:", error);
    return [];
  }

  const items = (rows as any[]) ?? [];
  if (items.length === 0) return [];

  const factionIds = [...new Set(items.map((r: any) => r.faction_id))];
  const { data: factionRows } = await (supabase.from("factions") as any)
    .select("id, name")
    .in("id", factionIds);
  const factionMap = new Map(
    ((factionRows as { id: string; name: string }[]) ?? []).map((f) => [f.id, f.name])
  );

  return items.map((r: any) => ({
    id: r.id,
    faction_id: r.faction_id,
    faction_name: factionMap.get(r.faction_id) ?? "Unbekannt",
    reputation: r.reputation ?? 0,
    rank: r.rank ?? null,
    gm_notes: r.gm_notes,
  }));
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
    .select("gm_id, world_id")
    .eq("id", data.campaign_id)
    .single();

  if (!campaign || (campaign as { gm_id: string }).gm_id !== user.id) {
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
    .select("gm_id")
    .eq("id", data.campaign_id)
    .single();

  if (!campaign || (campaign as { gm_id: string }).gm_id !== user.id) {
    throw new Error("Nur der Spielleiter kann den Ruf verwalten.");
  }

  const { error } = await (supabase.from("character_faction_reputation") as any)
    .delete()
    .eq("id", data.reputation_id);

  if (error) throw new Error(error.message || "Fehler beim Löschen.");
  revalidatePath(`/dashboard/campaigns/${data.campaign_id}`);
  return { success: true };
}
