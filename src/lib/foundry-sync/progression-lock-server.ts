import type { SupabaseClient } from "@supabase/supabase-js";
import {
  foundryProgressionLockMessage,
  isFoundryProgressionLocked,
  type CampaignMode,
} from "./progression-lock";

const LOCKED_CHARACTER_FIELDS = ["level", "class", "experience_points"] as const;

export async function resolveFoundryProgressionLock(
  supabase: SupabaseClient,
  campaignId: string,
  characterId: string,
): Promise<{ locked: boolean; message: string; campaignMode: CampaignMode }> {
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("mode")
    .eq("id", campaignId)
    .maybeSingle();

  const campaignMode = (campaignRaw as { mode?: CampaignMode } | null)?.mode ?? "Online";

  if (campaignMode === "InPerson") {
    return { locked: false, message: "", campaignMode };
  }

  if (campaignMode === "Online") {
    return {
      locked: true,
      message: foundryProgressionLockMessage({ campaignMode }),
      campaignMode,
    };
  }

  const { data: mappingRaw } = await (supabase as any)
    .from("foundry_character_mapping")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("character_id", characterId)
    .maybeSingle();

  const locked = isFoundryProgressionLocked({
    campaignMode,
    hasFoundryCharacterMapping: Boolean(mappingRaw),
  });

  return {
    locked,
    message: locked ? foundryProgressionLockMessage({ campaignMode }) : "",
    campaignMode,
  };
}

export async function stripFoundryLockedCharacterFields(
  supabase: SupabaseClient,
  campaignId: string,
  characterId: string,
  updates: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const lock = await resolveFoundryProgressionLock(supabase, campaignId, characterId);
  if (!lock.locked) return updates;

  const next = { ...updates };
  for (const key of LOCKED_CHARACTER_FIELDS) {
    delete next[key];
  }
  return next;
}

export async function loadFoundryCharacterMappingSet(
  supabase: SupabaseClient,
  campaignId: string,
  characterIds: string[],
): Promise<Set<string>> {
  const ids = characterIds.map(String).filter(Boolean);
  if (ids.length === 0) return new Set();

  const { data: rows } = await (supabase as any)
    .from("foundry_character_mapping")
    .select("character_id")
    .eq("campaign_id", campaignId)
    .in("character_id", ids);

  return new Set(
    ((rows as Array<{ character_id: string | null }> | null) ?? [])
      .map((row) => row.character_id)
      .filter(Boolean)
      .map(String),
  );
}
