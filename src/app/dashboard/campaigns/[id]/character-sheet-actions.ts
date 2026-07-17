"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import {
  createEmptyDnd5eSheet,
  mergeSheetWithDefaults,
  parseSheetData,
} from "@/src/lib/characters/dnd5e/defaults";
import { computeDerivedDnd5eSheet } from "@/src/lib/characters/dnd5e/derived";
import { isDnd5eCampaignSystem } from "@/src/lib/characters/dnd5e/formulas";
import type {
  CharacterSheetPayload,
  Dnd5eSheetData,
  Dnd5eSheetOverrides,
  Dnd5eSheetSource,
} from "@/src/lib/characters/dnd5e/types";
import { normalizeCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/types";
import type { CharacterSheetLocale } from "@/src/lib/i18n/character-sheet/types";
import type { Dnd5eCharacterAchievement } from "@/src/lib/characters/dnd5e/types";
import { getAchievementImageForName } from "@/src/lib/constants/achievements";
import {
  resolveFoundryProgressionLock,
  stripFoundryLockedCharacterFields,
} from "@/src/lib/foundry-sync/progression-lock-server";
import { sanitizeActorDisplayLabel } from "@/src/lib/foundry-sync/actor-display-labels";
import { recordPlayerCharacterEditAdmin } from "@/src/lib/characters/player-character-edit-alerts";
import { parseCharacterFlaws } from "@/src/lib/characters/character-flaws";

const SHEET_SELECT =
  "id, campaign_id, user_id, name, class, subclass, race, background, alignment, level, experience_points, sheet_data, sheet_overrides, sheet_source, sheet_synced_at, sheet_locale, character_flaws";

type CharacterRow = {
  id: string;
  campaign_id: string;
  user_id: string | null;
  name: string;
  class: string | null;
  subclass: string | null;
  race: string | null;
  background: string | null;
  alignment: string | null;
  level: number;
  experience_points: number;
  sheet_data: unknown;
  sheet_overrides: unknown;
  sheet_source: string | null;
  sheet_synced_at: string | null;
  sheet_locale?: string | null;
  character_flaws?: unknown;
};

async function loadCharacterAccess(
  campaignId: string,
  characterId: string,
): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  character: CharacterRow;
  isGm: boolean;
  campaignSystem: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id, system")
    .eq("id", campaignId)
    .maybeSingle();
  const campaign = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
    system?: string | null;
  } | null;
  if (!campaign) throw new Error("Kampagne nicht gefunden.");

  const isGm = isCampaignGm(campaign, user.id);

  const { data: charRaw, error } = await (supabase.from("characters") as any)
    .select(SHEET_SELECT)
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (error || !charRaw) throw new Error("Charakter nicht gefunden.");

  const character = charRaw as CharacterRow;
  const isOwner = character.user_id === user.id;
  if (!isGm && !isOwner) {
    throw new Error("Keine Berechtigung für dieses Charakterblatt.");
  }

  return {
    supabase,
    userId: user.id,
    character,
    isGm,
    campaignSystem: String(campaign.system ?? ""),
  };
}

function buildSheetPayload(
  character: CharacterRow,
  campaignSystem: string,
  canEdit: boolean,
  progressionLocked: boolean,
  progressionLockMessage: string,
  achievements: Dnd5eCharacterAchievement[] = [],
): CharacterSheetPayload {
  const level = Math.max(1, Math.floor(Number(character.level) || 1));
  const parsed = parseSheetData(character.sheet_data);
  const sheet = parsed ?? createEmptyDnd5eSheet(level);
  const overrides = (character.sheet_overrides ?? {}) as Dnd5eSheetOverrides;

  return {
    characterId: character.id,
    campaignId: character.campaign_id,
    campaignSystem,
    name: character.name,
    class: sanitizeActorDisplayLabel(character.class),
    subclass: sanitizeActorDisplayLabel(character.subclass),
    race: sanitizeActorDisplayLabel(character.race),
    background: sanitizeActorDisplayLabel(character.background),
    alignment: sanitizeActorDisplayLabel(character.alignment),
    level,
    experiencePoints: Math.max(0, Math.floor(Number(character.experience_points) || 0)),
    sheet,
    overrides,
    derived: computeDerivedDnd5eSheet(sheet, level),
    sheetSource: (character.sheet_source as Dnd5eSheetSource | null) ?? null,
    sheetSyncedAt: character.sheet_synced_at,
    canEdit,
    progressionLocked,
    progressionLockMessage,
    sheetLocale: normalizeCharacterSheetLocale(character.sheet_locale),
    achievements,
    characterFlaws: parseCharacterFlaws(character.character_flaws),
  };
}

async function loadCharacterAchievements(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string | null,
): Promise<Dnd5eCharacterAchievement[]> {
  if (!userId) return [];
  const { data, error } = await (supabase.from("user_achievements") as any)
    .select("awarded_at, achievements(id, name, icon, points_awarded)")
    .eq("user_id", userId)
    .order("awarded_at", { ascending: false });

  if (error || !Array.isArray(data)) return [];

  return data
    .map((row: { awarded_at?: string; achievements?: { id: string; name: string; icon?: string | null; points_awarded?: number } }) => {
      const a = row.achievements;
      if (!a?.id) return null;
      return {
        id: a.id,
        name: a.name,
        imageUrl: getAchievementImageForName(a.name) ?? a.icon ?? null,
        awardedAt: row.awarded_at ?? null,
        pointsAwarded: Number(a.points_awarded) || 0,
      } satisfies Dnd5eCharacterAchievement;
    })
    .filter(Boolean) as Dnd5eCharacterAchievement[];
}

export async function loadDnd5eCharacterSheet(
  campaignId: string,
  characterId: string,
): Promise<CharacterSheetPayload | null> {
  const { supabase, character, campaignSystem } = await loadCharacterAccess(
    campaignId,
    characterId,
  );

  if (!isDnd5eCampaignSystem(campaignSystem)) {
    return null;
  }

  const lock = await resolveFoundryProgressionLock(supabase, campaignId, characterId);
  const achievements = await loadCharacterAchievements(supabase, character.user_id);

  return buildSheetPayload(
    character,
    campaignSystem,
    true,
    lock.locked,
    lock.message,
    achievements,
  );
}

export async function saveCharacterSheetLocale(
  campaignId: string,
  characterId: string,
  locale: CharacterSheetLocale,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, character } = await loadCharacterAccess(campaignId, characterId);
    const normalized = normalizeCharacterSheetLocale(locale);

    const { error } = await (supabase.from("characters") as any)
      .update({ sheet_locale: normalized })
      .eq("id", character.id)
      .eq("campaign_id", campaignId);

    if (error) {
      return { success: false, error: error.message || "Sprache konnte nicht gespeichert werden." };
    }

    return { success: true };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Sprache konnte nicht gespeichert werden.",
    };
  }
}

export type SaveDnd5eCharacterSheetInput = {
  campaignId: string;
  characterId: string;
  sheet: Dnd5eSheetData;
  overrides?: Dnd5eSheetOverrides;
  meta?: {
    subclass?: string | null;
    background?: string | null;
    alignment?: string | null;
    name?: string;
    race?: string;
    class?: string;
    level?: number;
    experiencePoints?: number;
  };
  /** Kampagnen-Lore-Felder auf characters (Kultur + Sprachen-IDs) */
  lore?: {
    cultureLoreId?: string | null;
    languages?: string[];
  };
};

export async function saveDnd5eCharacterSheet(
  input: SaveDnd5eCharacterSheetInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, userId, character, isGm, campaignSystem } = await loadCharacterAccess(
      input.campaignId,
      input.characterId,
    );

    if (!isDnd5eCampaignSystem(campaignSystem)) {
      return { success: false, error: "Diese Kampagne nutzt kein D&D-5e-System." };
    }

    const mergedSheet = mergeSheetWithDefaults(input.sheet);
    const overrides = input.overrides ?? {};

    let updates: Record<string, unknown> = {
      sheet_data: mergedSheet,
      sheet_overrides: overrides,
      sheet_source: "manual",
    };

    if (input.meta) {
      if (input.meta.subclass !== undefined) {
        updates.subclass = input.meta.subclass?.trim() || null;
      }
      if (input.meta.background !== undefined) {
        updates.background = input.meta.background?.trim() || null;
      }
      if (input.meta.alignment !== undefined) {
        updates.alignment = input.meta.alignment?.trim() || null;
      }
      if (input.meta.name?.trim()) updates.name = input.meta.name.trim();
      if (input.meta.race !== undefined) {
        updates.race = input.meta.race?.trim() || null;
      }
      if (input.meta.class !== undefined) {
        updates.class = input.meta.class?.trim() || null;
      }
      if (input.meta.level != null) {
        updates.level = Math.max(1, Math.floor(input.meta.level));
      }
      if (input.meta.experiencePoints != null) {
        updates.experience_points = Math.max(0, Math.floor(input.meta.experiencePoints));
      }
    }

    if (input.lore) {
      if (input.lore.cultureLoreId !== undefined) {
        updates.culture_lore_id = input.lore.cultureLoreId?.trim() || null;
      }
      if (input.lore.languages !== undefined) {
        updates.languages = Array.isArray(input.lore.languages)
          ? input.lore.languages.map(String)
          : [];
      }
    }

    updates = await stripFoundryLockedCharacterFields(
      supabase,
      input.campaignId,
      input.characterId,
      updates,
    );

    const { error } = await (supabase.from("characters") as any)
      .update(updates)
      .eq("id", character.id)
      .eq("campaign_id", input.campaignId);

    if (error) {
      return { success: false, error: error.message || "Speichern fehlgeschlagen." };
    }

    if (!isGm) {
      await recordPlayerCharacterEditAdmin({
        characterId: input.characterId,
        campaignId: input.campaignId,
        playerUserId: userId,
        editSource: "sheet",
        editSummary: "D&D-5e-Charakterblatt bearbeitet",
      });
    }

    revalidatePath(`/dashboard/campaigns/${input.campaignId}`);
    revalidatePath(`/dashboard/campaigns/${input.campaignId}?tab=character`);
    revalidatePath("/dashboard/characters");
    revalidatePath(`/dashboard/characters/${input.characterId}`);
    return { success: true };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Speichern fehlgeschlagen.",
    };
  }
}
