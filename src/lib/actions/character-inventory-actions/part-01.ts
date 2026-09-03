/**
 * character-inventory-actions — part 1: loadCharacterItemsForSheetSync, getCharacterEquipmentPayload, saveCharacterEquipment, getCharacterInventory, createCharacterItem, updateCharacterItem, deleteCharacterItem, updateCharacterWealth, getCampaignPartyCharacters, transferItemToCharacter, CharacterEquipmentPayload, PartyCharacterOption.
 */
"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { parseSheetData, mergeSheetWithDefaults } from "@/src/lib/characters/dnd5e/defaults";
import { normalizeEquipmentState, withSyncedArmorClass } from "@/src/lib/characters/dnd5e/equipment";
import type { Dnd5eEquipmentState } from "@/src/lib/characters/dnd5e/equipment-types";
import {
  equipCreatedBackpackItem,
  planEnsureStartingBackpack,
} from "@/src/lib/characters/dnd5e/ensure-starting-backpack";
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

function mapCharacterItemRow(item: Record<string, unknown>): CharacterItem {
  return {
    id: String(item.id),
    character_id: String(item.character_id),
    name: String(item.name ?? ""),
    description: item.description != null ? String(item.description) : null,
    category: normalizeCategory(item.category),
    icon_type: item.icon_type != null ? String(item.icon_type) : null,
    is_deleted: Boolean(item.is_deleted),
    target_fap: Math.max(0, Math.round(Number(item.target_fap ?? 0))),
    current_fap: Math.max(0, Math.round(Number(item.current_fap ?? 0))),
    created_at: item.created_at != null ? String(item.created_at) : undefined,
  };
}

const CHARACTER_ITEM_SELECT =
  "id, character_id, name, description, category, icon_type, is_deleted, target_fap, current_fap, created_at";

/** Server-side Inventarliste für RK-Sync beim Blatt-Speichern (ohne Auth-Guard — nur intern). */

export async function loadCharacterItemsForSheetSync(
  supabase: Awaited<ReturnType<typeof createClient>>,
  characterId: string,
): Promise<CharacterItem[]> {
  const { data: items, error } = await ((supabase as any).from("character_items") as any)
    .select(CHARACTER_ITEM_SELECT)
    .eq("character_id", characterId)
    .eq("is_deleted", false);

  if (error) {
    throw new Error(error.message || "Inventar konnte nicht geladen werden.");
  }

  return ((items ?? []) as Record<string, unknown>[]).map(mapCharacterItemRow);
}

function normalizeCurrency(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

export async function requireUser() {
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

export async function assertCharacterInventoryAccess(
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

/**
 * Stellt sicher, dass der Charakter einen nutzbaren Rucksack-Behälter hat
 * (Item in character_items + Container in sheet_data.equipment).
 * Idempotent — für Create-Pfad und Lazy-Ensure beim Inventar-Laden.
 */
export async function ensureCharacterStartingBackpackWithClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  characterId: string,
): Promise<{
  equipment: Dnd5eEquipmentState;
  items: CharacterItem[];
  changed: boolean;
}> {
  assertUuidLike(characterId, "Charakter");

  const items = await loadCharacterItemsForSheetSync(supabase, characterId);

  const { data: chRaw, error: sheetErr } = await supabase
    .from("characters")
    .select("sheet_data")
    .eq("id", characterId)
    .single();

  if (sheetErr || !chRaw) {
    throw new Error(sheetErr?.message || "Charakter nicht gefunden.");
  }

  const parsed = parseSheetData((chRaw as { sheet_data?: unknown }).sheet_data);
  const plan = planEnsureStartingBackpack(
    normalizeEquipmentState(parsed?.equipment),
    items,
  );

  if (!plan.itemToCreate && !plan.equipmentChanged) {
    return { equipment: plan.equipment, items, changed: false };
  }

  let nextItems = items;
  let nextEquipment = plan.equipment;

  if (plan.itemToCreate) {
    const { data: inserted, error: insertErr } = await (supabase as any)
      .from("character_items")
      .insert({
        character_id: characterId,
        name: plan.itemToCreate.name,
        description: plan.itemToCreate.description,
        category: plan.itemToCreate.category,
        icon_type: plan.itemToCreate.icon_type,
        target_fap: 0,
        current_fap: 0,
        is_deleted: false,
      })
      .select(CHARACTER_ITEM_SELECT)
      .single();

    if (insertErr || !inserted) {
      throw new Error(insertErr?.message || "Start-Rucksack konnte nicht angelegt werden.");
    }

    const newItem = mapCharacterItemRow(inserted as Record<string, unknown>);
    nextItems = [newItem, ...items];
    nextEquipment = equipCreatedBackpackItem(plan.equipment, newItem);
  }

  const merged = mergeSheetWithDefaults({
    ...(parsed ?? {}),
    equipment: normalizeEquipmentState(nextEquipment),
  });

  const { error: upErr } = await (supabase as any)
    .from("characters")
    .update({ sheet_data: merged, sheet_source: "manual" })
    .eq("id", characterId);

  if (upErr) {
    throw new Error(upErr.message || "Start-Rucksack konnte nicht ausgerüstet werden.");
  }

  return { equipment: nextEquipment, items: nextItems, changed: true };
}

export async function getCharacterEquipmentPayload(
  characterId: string,
): Promise<CharacterEquipmentPayload> {
  assertUuidLike(characterId, "Charakter");
  const { supabase, user } = await requireUser();
  const { campaignId } = await assertCharacterInventoryAccess(supabase, user.id, characterId);

  let ensuredEquipment: Dnd5eEquipmentState | null = null;
  let ensuredItems: CharacterItem[] | null = null;
  try {
    const ensured = await ensureCharacterStartingBackpackWithClient(supabase, characterId);
    ensuredEquipment = ensured.equipment;
    ensuredItems = ensured.items;
  } catch (err) {
    console.warn("[getCharacterEquipmentPayload] ensure starting backpack:", err);
  }

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
  const equipment =
    ensuredEquipment ?? normalizeEquipmentState(sheet?.equipment);

  return {
    ...inventory,
    items: ensuredItems ?? inventory.items,
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
  const inventory = await getCharacterInventory(characterId);
  const merged = withSyncedArmorClass(
    mergeSheetWithDefaults({
      ...(parsed ?? {}),
      equipment: normalizeEquipmentState(equipment),
    }),
    inventory.items.filter((i) => !i.is_deleted),
    equipment,
  );

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
    .select(CHARACTER_ITEM_SELECT)
    .eq("character_id", characterId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (itemError) {
    throw new Error(itemError.message || "Inventar konnte nicht geladen werden.");
  }

  const wealth = await ensureWealthRow(supabase, characterId);

  const { data: chSleep, error: sleepErr } = await supabase
    .from("characters")
    .select("sleep_debt_fap, rations_count, starvation_days, consecutive_short_sleep_days")
    .eq("id", characterId)
    .single();

  if (sleepErr) {
    console.warn("character survival / sleep load", sleepErr);
  }

  const chRow = chSleep as {
    sleep_debt_fap?: number | null;
    rations_count?: number | null;
    starvation_days?: number | null;
    consecutive_short_sleep_days?: number | null;
  } | null;

  return {
    items: ((items ?? []) as Record<string, unknown>[]).map(mapCharacterItemRow),
    wealth,
    sleep_debt_fap: Math.max(0, Math.round(Number(chRow?.sleep_debt_fap ?? 0))),
    rations_count: Math.min(10, Math.max(0, Math.round(Number(chRow?.rations_count ?? 0)))),
    starvation_days: Math.max(0, Math.round(Number(chRow?.starvation_days ?? 0))),
    consecutive_short_sleep_days: Math.max(
      0,
      Math.round(Number(chRow?.consecutive_short_sleep_days ?? 0)),
    ),
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
    .select(CHARACTER_ITEM_SELECT)
    .single();

  if (error) {
    throw new Error(error.message || "Item konnte nicht erstellt werden.");
  }

  return mapCharacterItemRow(data as Record<string, unknown>);
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
    .select(CHARACTER_ITEM_SELECT)
    .single();

  if (error) {
    throw new Error(error.message || "Item konnte nicht aktualisiert werden.");
  }

  return mapCharacterItemRow(data as Record<string, unknown>);
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

export type PartyCharacterOption = {
  id: string;
  name: string;
};

/** Spieler-Charaktere derselben Kampagne (für Item-Übergabe / Behälter-Tausch) */
export async function getCampaignPartyCharacters(
  campaignId: string,
  excludeCharacterId?: string,
): Promise<PartyCharacterOption[]> {
  assertUuidLike(campaignId, "Kampagne");
  const { supabase, user } = await requireUser();

  const { data: campRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();
  const isGm = isCampaignGm(
    campRaw as { gm_id?: string | null; owner_id?: string | null } | null,
    user.id,
  );

  const { data: memberRaw } = await (supabase.from("campaign_members") as any)
    .select("status")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .maybeSingle();
  const memberStatus = String((memberRaw as { status?: string } | null)?.status ?? "");
  const isMember = ["Approved", "Active", "Drafting", "Changes_Proposed"].includes(memberStatus);

  if (!isGm && !isMember) {
    throw new Error("Keine Berechtigung für diese Kampagne.");
  }

  let query = (supabase.from("characters") as any)
    .select("id, name")
    .eq("campaign_id", campaignId)
    .neq("status", "Archived")
    .order("name", { ascending: true });

  if (excludeCharacterId) {
    query = query.neq("id", excludeCharacterId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message || "Gruppe konnte nicht geladen werden.");

  return ((data ?? []) as { id: string; name: string }[]).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? "Charakter"),
  }));
}

/** Item an einen anderen Charakter übergeben */
export async function transferItemToCharacter(input: {
  itemId: string;
  fromCharacterId: string;
  toCharacterId: string;
}): Promise<void> {
  assertUuidLike(input.itemId, "Item");
  assertUuidLike(input.fromCharacterId, "Quell-Charakter");
  assertUuidLike(input.toCharacterId, "Ziel-Charakter");

  const { supabase, user } = await requireUser();
  await assertCharacterInventoryAccess(supabase, user.id, input.fromCharacterId);
  await assertCharacterInventoryAccess(supabase, user.id, input.toCharacterId);

  const { data: itemRaw, error: itemErr } = await (supabase.from("character_items") as any)
    .select("id, character_id")
    .eq("id", input.itemId)
    .eq("character_id", input.fromCharacterId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (itemErr || !itemRaw) throw new Error("Gegenstand nicht gefunden.");

  const { error: upErr } = await (supabase.from("character_items") as any)
    .update({ character_id: input.toCharacterId })
    .eq("id", input.itemId);

  if (upErr) throw new Error(upErr.message || "Übergabe fehlgeschlagen.");
}

/** Behälter inkl. Inhalt an einen anderen Charakter übergeben */
