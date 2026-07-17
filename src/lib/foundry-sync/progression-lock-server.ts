import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FOUNDRY_ONE_TIME_PROGRESSION_FIELDS,
  foundryProgressionLockMessage,
  isFoundryProgressionLocked,
  shouldShowFoundryProgressionInfo,
  type CampaignMode,
} from "./progression-lock";

const LOCKED_CHARACTER_FIELDS = FOUNDRY_ONE_TIME_PROGRESSION_FIELDS;

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

  let hasFoundryCharacterMapping = false;
  if (campaignMode === "Hybrid") {
    const { data: mappingRaw } = await (supabase as any)
      .from("foundry_character_mapping")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("character_id", characterId)
      .maybeSingle();
    hasFoundryCharacterMapping = Boolean(mappingRaw);
  }

  const showInfo = shouldShowFoundryProgressionInfo({
    campaignMode,
    hasFoundryCharacterMapping:
      campaignMode === "Online" ? true : hasFoundryCharacterMapping,
  });

  const locked = isFoundryProgressionLocked({
    campaignMode,
    hasFoundryCharacterMapping,
  });

  return {
    locked,
    message: showInfo ? foundryProgressionLockMessage({ campaignMode }) : "",
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

/** true = Stufe/Klasse/XP dürfen aus Foundry gesetzt werden (noch kein Import). */
export async function canApplyFoundryProgressionFromSync(
  supabase: SupabaseClient,
  characterId: string,
): Promise<boolean> {
  const { data } = await (supabase as any)
    .from("characters")
    .select("sheet_synced_at, sheet_source")
    .eq("id", characterId)
    .maybeSingle();

  const row = data as {
    sheet_synced_at?: string | null;
    sheet_source?: string | null;
  } | null;

  if (row?.sheet_synced_at) return false;
  if (row?.sheet_source === "foundry_import") return false;
  return true;
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
