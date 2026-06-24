"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { normalizeFoundryActorId } from "@/src/lib/foundry-sync/foundry-actor-id";

const SITE_URL = () =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://table-heroes.de").replace(/\/$/, "");

export type FoundrySyncCharacterOption = {
  id: string;
  name: string;
  playerName: string;
};

export type FoundryCharacterMappingView = {
  id: string;
  foundryActorId: string;
  foundryActorName: string | null;
  characterId: string | null;
  characterName: string | null;
};

export type CampaignFoundrySyncSettings = {
  apiKey: string;
  apiUrl: string;
  mappings: FoundryCharacterMappingView[];
  characters: FoundrySyncCharacterOption[];
  configured: boolean;
};

async function assertCampaignGm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  if (!isCampaignGm(campaign as { gm_id?: string; owner_id?: string }, user.id)) {
    return { ok: false, error: "Nur der GM kann Foundry Sync verwalten." };
  }

  return { ok: true, userId: user.id };
}

async function ensureApiKey(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
): Promise<string> {
  const { data: existing } = await (supabase as any)
    .from("foundry_sync")
    .select("api_key")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  const currentKey = String((existing as { api_key?: string } | null)?.api_key ?? "").trim();
  if (currentKey) return currentKey;

  const apiKey = randomUUID();
  const { error } = await (supabase as any).from("foundry_sync").insert({
    campaign_id: campaignId,
    api_key: apiKey,
  });

  if (error) {
    throw new Error(error.message || "API-Key konnte nicht erstellt werden.");
  }

  return apiKey;
}

async function loadCampaignCharacters(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
): Promise<FoundrySyncCharacterOption[]> {
  const { data: rows } = await (supabase.from("characters") as any)
    .select("id, name, user_id, status")
    .eq("campaign_id", campaignId)
    .in("status", ["Active", "Approved", "Drafting"])
    .order("name");

  const characterRows =
    (rows as Array<{
      id: string;
      name?: string | null;
      user_id?: string | null;
    }> | null) ?? [];

  const userIds = [
    ...new Set(characterRows.map((row) => row.user_id).filter(Boolean) as string[]),
  ];

  const usernameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await (supabase.from("users") as any)
      .select("id, username")
      .in("id", userIds);
    for (const profile of (profiles as Array<{ id: string; username?: string | null }> | null) ??
      []) {
      usernameById.set(profile.id, String(profile.username ?? "Spieler"));
    }
  }

  return characterRows.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? "Charakter"),
    playerName: usernameById.get(String(row.user_id ?? "")) ?? "Spieler",
  }));
}

async function loadMappings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
  characters: FoundrySyncCharacterOption[],
): Promise<FoundryCharacterMappingView[]> {
  const characterNameById = new Map(characters.map((c) => [c.id, c.name]));

  const { data: mappingRows, error } = await (supabase as any)
    .from("foundry_character_mapping")
    .select("id, foundry_actor_id, foundry_actor_name, character_id")
    .eq("campaign_id", campaignId)
    .order("foundry_actor_id");

  if (error) {
    throw new Error(error.message || "Zuordnungen konnten nicht geladen werden.");
  }

  return (
    (mappingRows as Array<{
      id: string;
      foundry_actor_id: string;
      foundry_actor_name?: string | null;
      character_id?: string | null;
    }> | null) ?? []
  ).map((row) => ({
    id: String(row.id),
    foundryActorId: String(row.foundry_actor_id),
    foundryActorName: row.foundry_actor_name?.trim() || null,
    characterId: row.character_id ? String(row.character_id) : null,
    characterName: row.character_id
      ? (characterNameById.get(String(row.character_id)) ?? null)
      : null,
  }));
}

function revalidateFoundryPaths(campaignId: string) {
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}?tab=settings`);
}

export async function getCampaignFoundrySyncSettings(
  campaignId: string,
): Promise<CampaignFoundrySyncSettings | null> {
  const supabase = await createClient();
  const auth = await assertCampaignGm(supabase, campaignId);
  if (!auth.ok) return null;

  const apiKey = await ensureApiKey(supabase, campaignId);
  const characters = await loadCampaignCharacters(supabase, campaignId);
  const mappings = await loadMappings(supabase, campaignId, characters);

  return {
    apiKey,
    apiUrl: SITE_URL(),
    mappings,
    characters,
    configured: mappings.some((m) => Boolean(m.characterId)),
  };
}

export async function regenerateCampaignFoundryApiKey(
  campaignId: string,
): Promise<{ success: boolean; apiKey?: string; error?: string }> {
  const supabase = await createClient();
  const auth = await assertCampaignGm(supabase, campaignId);
  if (!auth.ok) return { success: false, error: auth.error };

  const apiKey = randomUUID();
  const { data: existing } = await (supabase as any)
    .from("foundry_sync")
    .select("id")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await (supabase as any)
      .from("foundry_sync")
      .update({ api_key: apiKey, updated_at: new Date().toISOString() })
      .eq("campaign_id", campaignId);

    if (error) {
      return { success: false, error: error.message || "API-Key konnte nicht erneuert werden." };
    }
  } else {
    const { error } = await (supabase as any).from("foundry_sync").insert({
      campaign_id: campaignId,
      api_key: apiKey,
    });
    if (error) {
      return { success: false, error: error.message || "API-Key konnte nicht erstellt werden." };
    }
  }

  revalidateFoundryPaths(campaignId);
  return { success: true, apiKey };
}

export async function assignFoundryCharacterMapping(
  campaignId: string,
  mappingId: string,
  characterId: string | null,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const auth = await assertCampaignGm(supabase, campaignId);
  if (!auth.ok) return { success: false, error: auth.error };

  const normalizedCharacterId = characterId?.trim() || null;

  if (normalizedCharacterId) {
    const { data: character } = await (supabase.from("characters") as any)
      .select("id")
      .eq("id", normalizedCharacterId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (!character) {
      return { success: false, error: "Charakter gehört nicht zu dieser Kampagne." };
    }

    const { data: conflict } = await (supabase as any)
      .from("foundry_character_mapping")
      .select("id, foundry_actor_id")
      .eq("campaign_id", campaignId)
      .eq("character_id", normalizedCharacterId)
      .neq("id", mappingId)
      .maybeSingle();

    if (conflict) {
      return {
        success: false,
        error: `Dieser Charakter ist bereits Actor „${String((conflict as { foundry_actor_id?: string }).foundry_actor_id ?? "")}" zugeordnet.`,
      };
    }
  }

  const { error } = await (supabase as any)
    .from("foundry_character_mapping")
    .update({
      character_id: normalizedCharacterId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mappingId)
    .eq("campaign_id", campaignId);

  if (error) {
    return { success: false, error: error.message || "Zuordnung konnte nicht gespeichert werden." };
  }

  revalidateFoundryPaths(campaignId);
  return { success: true };
}

export async function createFoundryCharacterMapping(
  campaignId: string,
  foundryActorId: string,
  characterId?: string | null,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const auth = await assertCampaignGm(supabase, campaignId);
  if (!auth.ok) return { success: false, error: auth.error };

  const actorId = normalizeFoundryActorId(foundryActorId);
  if (!actorId) {
    return { success: false, error: "Foundry Actor-ID fehlt." };
  }

  const normalizedCharacterId = characterId?.trim() || null;
  if (normalizedCharacterId) {
    const { data: character } = await (supabase.from("characters") as any)
      .select("id")
      .eq("id", normalizedCharacterId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (!character) {
      return { success: false, error: "Charakter gehört nicht zu dieser Kampagne." };
    }
  }

  const { error } = await (supabase as any).from("foundry_character_mapping").insert({
    campaign_id: campaignId,
    foundry_actor_id: actorId,
    character_id: normalizedCharacterId,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "Diese Actor-ID ist in der Kampagne bereits vorhanden.",
      };
    }
    return { success: false, error: error.message || "Zuordnung konnte nicht angelegt werden." };
  }

  revalidateFoundryPaths(campaignId);
  return { success: true };
}

export async function deleteFoundryCharacterMapping(
  campaignId: string,
  mappingId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const auth = await assertCampaignGm(supabase, campaignId);
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await (supabase as any)
    .from("foundry_character_mapping")
    .delete()
    .eq("id", mappingId)
    .eq("campaign_id", campaignId);

  if (error) {
    return { success: false, error: error.message || "Zuordnung konnte nicht gelöscht werden." };
  }

  revalidateFoundryPaths(campaignId);
  return { success: true };
}
