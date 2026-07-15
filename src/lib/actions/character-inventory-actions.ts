"use server";

import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { parseSheetData, mergeSheetWithDefaults } from "@/src/lib/characters/dnd5e/defaults";
import { normalizeEquipmentState } from "@/src/lib/characters/dnd5e/equipment";
import type { Dnd5eEquipmentState } from "@/src/lib/characters/dnd5e/equipment-types";
import { normalizeCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/types";
import {
  INVENTORY_CATEGORIES,
  type CharacterGem,
  type CharacterInventoryPayload,
  type CharacterItem,
  type CharacterWealth,
  type InventoryCategory,
} from "@/src/types/inventory";

const DEFAULT_WEALTH = {
  gp: 0,
  sp: 0,
  cp: 0,
  ep: 0,
  pp: 0,
  gem_data: [],
};

function assertUuidLike(value: string, label: string) {
  if (!value || value.length < 20) {
    throw new Error(`${label} fehlt.`);
  }
}

function normalizeCategory(value: unknown): InventoryCategory {
  return INVENTORY_CATEGORIES.includes(value as InventoryCategory)
    ? (value as InventoryCategory)
    : "Equipment";
}

function normalizeGems(value: unknown): CharacterGem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((gem) => {
      const row = gem as Record<string, unknown>;
      const name = String(row.name ?? "").trim();
      const estimatedValue = Number(row.estimated_value ?? 0);
      return {
        name,
        estimated_value: Number.isFinite(estimatedValue)
          ? Math.max(0, Math.round(estimatedValue))
          : 0,
      };
    })
    .filter((gem) => gem.name.length > 0);
}

function normalizeCurrency(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Nicht authentifiziert.");
  }

  return { supabase, user };
}

export type CharacterEquipmentPayload = CharacterInventoryPayload & {
  campaignId: string;
  equipment: Dnd5eEquipmentState;
  sheetLocale: string;
};

async function assertCharacterInventoryAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  characterId: string,
): Promise<{ campaignId: string; isGm: boolean }> {
  const { data: chRaw, error: chErr } = await supabase
    .from("characters")
    .select("id, user_id, campaign_id")
    .eq("id", characterId)
    .single();

  if (chErr || !chRaw) throw new Error("Charakter nicht gefunden.");
  const ch = chRaw as { user_id: string | null; campaign_id: string };
  const campaignId = String(ch.campaign_id);

  const { data: campRaw } = await supabase
    .from("campaigns")
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();
  const camp = campRaw as { gm_id?: string | null; owner_id?: string | null } | null;
  const isGm = camp ? isCampaignGm(camp, userId) : false;
  const isOwner = ch.user_id === userId;

  if (!isOwner && !isGm) {
    throw new Error("Keine Berechtigung für dieses Inventar.");
  }

  return { campaignId, isGm };
}

export async function getCharacterEquipmentPayload(
  characterId: string,
): Promise<CharacterEquipmentPayload> {
  assertUuidLike(characterId, "Charakter");
  const { supabase, user } = await requireUser();
  const { campaignId } = await assertCharacterInventoryAccess(supabase, user.id, characterId);

  const inventory = await getCharacterInventory(characterId);

  const { data: chRaw, error: sheetErr } = await supabase
    .from("characters")
    .select("sheet_data, sheet_locale")
    .eq("id", characterId)
    .single();

  if (sheetErr) {
    throw new Error(sheetErr.message || "Ausrüstungsdaten konnten nicht geladen werden.");
  }

  const ch = chRaw as { sheet_data?: unknown; sheet_locale?: string | null };
  const sheet = parseSheetData(ch.sheet_data);
  const equipment = normalizeEquipmentState(sheet?.equipment);

  return {
    ...inventory,
    campaignId,
    equipment,
    sheetLocale: normalizeCharacterSheetLocale(ch.sheet_locale),
  };
}

export async function saveCharacterEquipment(
  characterId: string,
  equipment: Dnd5eEquipmentState,
): Promise<void> {
  assertUuidLike(characterId, "Charakter");
  const { supabase, user } = await requireUser();
  await assertCharacterInventoryAccess(supabase, user.id, characterId);

  const { data: chRaw, error: loadErr } = await supabase
    .from("characters")
    .select("sheet_data")
    .eq("id", characterId)
    .single();

  if (loadErr || !chRaw) {
    throw new Error(loadErr?.message || "Charakter nicht gefunden.");
  }

  const parsed = parseSheetData((chRaw as { sheet_data?: unknown }).sheet_data);
  const merged = mergeSheetWithDefaults({
    ...(parsed ?? {}),
    equipment: normalizeEquipmentState(equipment),
  });

  const { error: upErr } = await (supabase as any)
    .from("characters")
    .update({ sheet_data: merged, sheet_source: "manual" })
    .eq("id", characterId);

  if (upErr) {
    throw new Error(upErr.message || "Ausrüstung konnte nicht gespeichert werden.");
  }
}

async function ensureWealthRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  characterId: string,
): Promise<CharacterWealth> {
  const { data: existing, error: existingError } = await ((supabase as any).from(
    "character_wealth",
  ) as any)
    .select("*")
    .eq("character_id", characterId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || "Vermoegen konnte nicht geladen werden.");
  }

  if (existing) {
    return {
      ...(existing as Omit<CharacterWealth, "gem_data">),
      gem_data: normalizeGems((existing as { gem_data?: unknown }).gem_data),
    };
  }

  const { data: inserted, error: insertError } = await ((supabase as any).from(
    "character_wealth",
  ) as any)
    .insert({ character_id: characterId, ...DEFAULT_WEALTH })
    .select("*")
    .single();

  if (insertError) {
    throw new Error(insertError.message || "Vermoegen konnte nicht angelegt werden.");
  }

  return {
    ...(inserted as Omit<CharacterWealth, "gem_data">),
    gem_data: normalizeGems((inserted as { gem_data?: unknown }).gem_data),
  };
}

export async function getCharacterInventory(
  characterId: string,
): Promise<CharacterInventoryPayload> {
  assertUuidLike(characterId, "Charakter");

  const { supabase } = await requireUser();

  const { data: items, error: itemError } = await ((supabase as any).from(
    "character_items",
  ) as any)
    .select(
      "id, character_id, name, description, category, icon_type, is_deleted, target_fap, current_fap",
    )
    .eq("character_id", characterId)
    .eq("is_deleted", false)
    .order("name", { ascending: true });

  if (itemError) {
    throw new Error(itemError.message || "Inventar konnte nicht geladen werden.");
  }

  const wealth = await ensureWealthRow(supabase, characterId);

  const { data: chSleep, error: sleepErr } = await supabase
    .from("characters")
    .select("sleep_debt_fap, rations_count, starvation_days")
    .eq("id", characterId)
    .single();

  if (sleepErr) {
    console.warn("character survival / sleep load", sleepErr);
  }

  const chRow = chSleep as {
    sleep_debt_fap?: number | null;
    rations_count?: number | null;
    starvation_days?: number | null;
  } | null;

  return {
    items: ((items ?? []) as Record<string, unknown>[]).map((item) => ({
      id: String(item.id),
      character_id: String(item.character_id),
      name: String(item.name ?? ""),
      description: item.description != null ? String(item.description) : null,
      category: normalizeCategory(item.category),
      icon_type: item.icon_type != null ? String(item.icon_type) : null,
      is_deleted: Boolean(item.is_deleted),
      target_fap: Math.max(0, Math.round(Number(item.target_fap ?? 0))),
      current_fap: Math.max(0, Math.round(Number(item.current_fap ?? 0))),
    })),
    wealth,
    sleep_debt_fap: Math.max(0, Math.round(Number(chRow?.sleep_debt_fap ?? 0))),
    rations_count: Math.min(10, Math.max(0, Math.round(Number(chRow?.rations_count ?? 0)))),
    starvation_days: Math.max(0, Math.round(Number(chRow?.starvation_days ?? 0))),
  };
}

export async function createCharacterItem(input: {
  characterId: string;
  name: string;
  description?: string | null;
  category: InventoryCategory;
  iconType?: string | null;
}): Promise<CharacterItem> {
  assertUuidLike(input.characterId, "Charakter");
  const name = input.name.trim();
  if (!name) throw new Error("Name fehlt.");

  const { supabase } = await requireUser();
  const { data, error } = await (supabase as any).from("character_items")
    .insert({
      character_id: input.characterId,
      name,
      description: input.description?.trim() || null,
      category: normalizeCategory(input.category),
      icon_type: input.iconType?.trim() || null,
    })
    .select("id, character_id, name, description, category, icon_type, is_deleted, target_fap, current_fap")
    .single();

  if (error) {
    throw new Error(error.message || "Item konnte nicht erstellt werden.");
  }

  return {
    ...(data as Omit<CharacterItem, "category">),
    category: normalizeCategory((data as { category?: unknown }).category),
  };
}

export async function updateCharacterItem(input: {
  itemId: string;
  name: string;
  description?: string | null;
  category: InventoryCategory;
  iconType?: string | null;
}): Promise<CharacterItem> {
  assertUuidLike(input.itemId, "Item");
  const name = input.name.trim();
  if (!name) throw new Error("Name fehlt.");

  const { supabase } = await requireUser();
  const { data, error } = await (supabase as any).from("character_items")
    .update({
      name,
      description: input.description?.trim() || null,
      category: normalizeCategory(input.category),
      icon_type: input.iconType?.trim() || null,
    })
    .eq("id", input.itemId)
    .eq("is_deleted", false)
    .select("id, character_id, name, description, category, icon_type, is_deleted, target_fap, current_fap")
    .single();

  if (error) {
    throw new Error(error.message || "Item konnte nicht aktualisiert werden.");
  }

  return {
    ...(data as Omit<CharacterItem, "category">),
    category: normalizeCategory((data as { category?: unknown }).category),
  };
}

export async function deleteCharacterItem(itemId: string): Promise<void> {
  assertUuidLike(itemId, "Item");

  const { supabase } = await requireUser();
  const { error } = await (supabase as any).from("character_items")
    .update({ is_deleted: true })
    .eq("id", itemId);

  if (error) {
    throw new Error(error.message || "Item konnte nicht geloescht werden.");
  }
}

export async function updateCharacterWealth(input: {
  characterId: string;
  gp: number;
  sp: number;
  cp: number;
  ep: number;
  pp: number;
  gems: CharacterGem[];
}): Promise<CharacterWealth> {
  assertUuidLike(input.characterId, "Charakter");

  const { supabase } = await requireUser();
  const payload = {
    character_id: input.characterId,
    gp: normalizeCurrency(input.gp),
    sp: normalizeCurrency(input.sp),
    cp: normalizeCurrency(input.cp),
    ep: normalizeCurrency(input.ep),
    pp: normalizeCurrency(input.pp),
    gem_data: normalizeGems(input.gems),
  };

  const { data, error } = await (supabase as any).from("character_wealth")
    .upsert(payload, { onConflict: "character_id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || "Vermoegen konnte nicht gespeichert werden.");
  }

  return {
    ...(data as Omit<CharacterWealth, "gem_data">),
    gem_data: normalizeGems((data as { gem_data?: unknown }).gem_data),
  };
}
