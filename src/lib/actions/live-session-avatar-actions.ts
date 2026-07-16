"use server";

import { createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { parseSheetData, mergeSheetWithDefaults } from "@/src/lib/characters/dnd5e/defaults";
import {
  applyEquipmentLoadout,
  applyWeaponPreset,
  normalizeEquipmentState,
  placeItemOnBelt,
} from "@/src/lib/characters/dnd5e/equipment";
import { ensureClassResources } from "@/src/lib/characters/dnd5e/rest";
import { isConsumableItem } from "@/src/lib/characters/dnd5e/inventory-categories";
import { parseDnd5eMetaFromDescription } from "@/src/lib/characters/dnd5e/item-meta";
import { resolveCharacterItemStats } from "@/src/lib/characters/dnd5e/item-resolve";
import { parseConditionTokensMap } from "@/src/lib/characters/condition-tokens";
import { parseMoodTokensMap } from "@/src/lib/characters/mood-states";
import { resolveCharacterDisplayToken } from "@/src/lib/characters/display-token";
import { appendSessionActivity } from "@/src/lib/actions/session-activity-actions";
import { getCharacterInventory } from "@/src/lib/actions/character-inventory-actions";
import { consumeFromStack } from "@/src/lib/characters/dnd5e/inventory-item-ops";
import type { Dnd5eClassResource } from "@/src/lib/characters/dnd5e/types";

function isCasterClass(className: string | null | undefined): boolean {
  const c = (className ?? "").toLowerCase();
  if (!c) return false;
  return /magier|wizard|zauberer|sorcerer|kleriker|cleric|paladin|barde|bard|hexer|warlock|druide|druid|waldläufer|waldlaeufer|ranger|artificer|inventor|hexenmeister/.test(
    c,
  );
}

export type LiveAvatarBeltItem = {
  id: string;
  name: string;
  isConsumable: boolean;
  quantity: number;
};

export type LiveAvatarStatus = {
  characterId: string;
  hpCurrent: number;
  hpMax: number;
  hpTemp: number;
  displayAvatarUrl: string | null;
  weaponLabels: string[];
  className: string;
  isCaster: boolean;
  classResources: Dnd5eClassResource[];
  weaponPresets: { id: string; name: string }[];
  loadouts: { id: string; name: string }[];
  beltItems: LiveAvatarBeltItem[];
  spells: { id: string; name: string }[];
};

async function assertLiveAvatarAccess(
  characterId: string,
  sessionId: string,
  userId: string,
): Promise<{ isOwner: boolean; isGm: boolean; campaignId: string }> {
  const supabase = await createClient();
  const { data: chRaw, error } = await supabase
    .from("characters")
    .select("id, user_id, campaign_id")
    .eq("id", characterId)
    .single();
  if (error || !chRaw) throw new Error("Charakter nicht gefunden.");

  const ch = chRaw as { user_id: string | null; campaign_id: string };
  const campaignId = String(ch.campaign_id);
  const isOwner = ch.user_id === userId;

  const { data: campRaw } = await supabase
    .from("campaigns")
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();
  const isGm = isCampaignGm(
    campRaw as { gm_id?: string | null; owner_id?: string | null } | null,
    userId,
  );

  if (!isOwner && !isGm) throw new Error("Keine Berechtigung.");

  if (!isOwner && isGm) {
    const { data: sessionRaw } = await (supabase.from("sessions") as any)
      .select("status")
      .eq("id", sessionId)
      .maybeSingle();
    const status = String((sessionRaw as { status?: string } | null)?.status ?? "");
    if (status !== "Scheduled" && status !== "Live") {
      throw new Error("Session nicht aktiv.");
    }
  }

  return { isOwner, isGm, campaignId };
}

export async function getLiveSessionAvatarStatus(
  characterId: string,
): Promise<LiveAvatarStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: chRaw, error } = await supabase
    .from("characters")
    .select(
      "id, name, class, level, avatar_url, token_url, sheet_data, condition_tokens, mood_state, mood_tokens, active_conditions, user_id, campaign_id",
    )
    .eq("id", characterId)
    .single();

  if (error || !chRaw) throw new Error("Charakter nicht gefunden.");

  const ch = chRaw as {
    class?: string | null;
    level?: number | null;
    avatar_url?: string | null;
    token_url?: string | null;
    sheet_data?: unknown;
    condition_tokens?: unknown;
    mood_state?: unknown;
    mood_tokens?: unknown;
    active_conditions?: unknown;
    user_id?: string | null;
    campaign_id?: string;
  };

  const campaignId = String(ch.campaign_id ?? "");
  if (!campaignId) throw new Error("Kampagne fehlt.");

  const { data: campRaw } = await supabase
    .from("campaigns")
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();
  const isGm = isCampaignGm(
    campRaw as { gm_id?: string | null; owner_id?: string | null } | null,
    user.id,
  );
  const isOwner = ch.user_id === user.id;

  if (!isOwner && !isGm) {
    const { data: member } = await (supabase.from("campaign_members") as any)
      .select("status")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .maybeSingle();
    const memberStatus = String((member as { status?: string } | null)?.status ?? "");
    const ok = ["Approved", "Active", "Drafting", "Changes_Proposed"].includes(memberStatus);
    if (!ok) throw new Error("Keine Berechtigung.");
  }

  const sheetRaw = parseSheetData(ch.sheet_data);
  const className = String(ch.class ?? "");
  const sheet = ensureClassResources(sheetRaw ?? mergeSheetWithDefaults({}), className);
  const equipment = normalizeEquipmentState(sheet.equipment);

  const itemsClient = tryCreateAdminClient() ?? supabase;
  const { data: itemRows } = await (itemsClient as any)
    .from("character_items")
    .select(
      "id, character_id, name, description, category, icon_type, is_deleted, target_fap, current_fap, created_at",
    )
    .eq("character_id", characterId)
    .eq("is_deleted", false);
  const items = ((itemRows ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    character_id: String(row.character_id),
    name: String(row.name ?? ""),
    description: row.description != null ? String(row.description) : null,
    category: (row.category as "Weapon" | "Equipment" | "Consumable" | "Story" | "CoinGem") ?? "Equipment",
    icon_type: row.icon_type != null ? String(row.icon_type) : null,
    is_deleted: Boolean(row.is_deleted),
    target_fap: Math.max(0, Math.round(Number(row.target_fap ?? 0))),
    current_fap: Math.max(0, Math.round(Number(row.current_fap ?? 0))),
  }));
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const display = resolveCharacterDisplayToken({
    baseTokenUrl: ch.token_url,
    avatarUrl: ch.avatar_url,
    activeConditions: ch.active_conditions,
    conditionTokens: parseConditionTokensMap(ch.condition_tokens),
    moodState: ch.mood_state,
    moodTokens: parseMoodTokensMap(ch.mood_tokens),
  });

  const weaponLabels: string[] = [];
  for (const slot of ["mainHand", "offHand"] as const) {
    const id = equipment.slots?.[slot];
    if (!id) continue;
    const item = itemMap.get(id);
    if (!item) continue;
    const stats = resolveCharacterItemStats(item);
    if (stats.isShield) {
      weaponLabels.push(item.name);
      continue;
    }
    weaponLabels.push(item.name);
  }

  const beltItems: LiveAvatarBeltItem[] = [];
  for (const id of equipment.belt) {
    if (!id) continue;
    const item = itemMap.get(id);
    if (!item) continue;
    const meta = parseDnd5eMetaFromDescription(item.description);
    beltItems.push({
      id: item.id,
      name: item.name,
      isConsumable: isConsumableItem(item),
      quantity: Math.max(1, Math.round(Number(meta?.quantity) || 1)),
    });
  }

  return {
    characterId,
    hpCurrent: Math.max(0, Math.round(Number(sheet.combat?.hpCurrent) || 0)),
    hpMax: Math.max(1, Math.round(Number(sheet.combat?.hpMax) || 1)),
    hpTemp: Math.max(0, Math.round(Number(sheet.combat?.hpTemp) || 0)),
    displayAvatarUrl: display.url || ch.avatar_url || null,
    weaponLabels,
    className,
    isCaster: isCasterClass(className),
    classResources: sheet.classResources ?? [],
    weaponPresets: (equipment.weaponPresets ?? []).map((p) => ({ id: p.id, name: p.name })),
    loadouts: (equipment.loadouts ?? []).map((l) => ({ id: l.id, name: l.name })),
    beltItems,
    spells: [],
  };
}

export async function useLiveSessionBeltItem(input: {
  sessionId: string;
  characterId: string;
  characterName: string;
  itemId: string;
}): Promise<LiveAvatarStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertLiveAvatarAccess(input.characterId, input.sessionId, user.id);

  const inventory = await getCharacterInventory(input.characterId);
  const item = inventory.items.find((i) => i.id === input.itemId && !i.is_deleted);
  if (!item) throw new Error("Gegenstand nicht gefunden.");

  const { data: chRaw } = await supabase
    .from("characters")
    .select("sheet_data")
    .eq("id", input.characterId)
    .single();
  const sheet = parseSheetData((chRaw as { sheet_data?: unknown } | null)?.sheet_data);
  let equipment = normalizeEquipmentState(sheet?.equipment);
  const beltIndex = equipment.belt.findIndex((id) => id === input.itemId);
  if (beltIndex < 0) throw new Error("Gegenstand ist nicht am Gürtel.");

  await appendSessionActivity({
    sessionId: input.sessionId,
    type: "player_action",
    text: `${input.characterName} benutzt: „${item.name}"`,
    characterId: input.characterId,
    characterName: input.characterName,
  });

  if (isConsumableItem(item)) {
    const remaining = await consumeFromStack(item, 1);
    if (!remaining) {
      equipment = placeItemOnBelt(equipment, beltIndex, null);
      const merged = mergeSheetWithDefaults({
        ...(sheet ?? {}),
        equipment,
      });
      await (supabase as any)
        .from("characters")
        .update({ sheet_data: merged, sheet_source: "manual" })
        .eq("id", input.characterId);
    }
  }

  return getLiveSessionAvatarStatus(input.characterId);
}

export async function useLiveSessionClassAbility(input: {
  sessionId: string;
  characterId: string;
  characterName: string;
  resourceId: string;
}): Promise<LiveAvatarStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertLiveAvatarAccess(input.characterId, input.sessionId, user.id);

  const { data: chRaw } = await supabase
    .from("characters")
    .select("sheet_data, class")
    .eq("id", input.characterId)
    .single();
  if (!chRaw) throw new Error("Charakter nicht gefunden.");

  const className = String((chRaw as { class?: string | null }).class ?? "");
  let sheet = ensureClassResources(
    parseSheetData((chRaw as { sheet_data?: unknown }).sheet_data) ?? mergeSheetWithDefaults({}),
    className,
  );
  const resources = [...(sheet.classResources ?? [])];
  const idx = resources.findIndex((r) => r.id === input.resourceId);
  if (idx < 0) throw new Error("Klassenfähigkeit nicht gefunden.");
  const res = resources[idx];
  if (res.current <= 0) throw new Error(`${res.label} ist aufgebraucht.`);

  resources[idx] = { ...res, current: res.current - 1 };
  sheet = { ...sheet, classResources: resources };

  await (supabase as any)
    .from("characters")
    .update({ sheet_data: mergeSheetWithDefaults(sheet), sheet_source: "manual" })
    .eq("id", input.characterId);

  await appendSessionActivity({
    sessionId: input.sessionId,
    type: "player_action",
    text: `${input.characterName} nutzt „${res.label}"`,
    characterId: input.characterId,
    characterName: input.characterName,
  });

  return getLiveSessionAvatarStatus(input.characterId);
}

export async function announceLiveSessionSpell(input: {
  sessionId: string;
  characterId: string;
  characterName: string;
  spellName: string;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertLiveAvatarAccess(input.characterId, input.sessionId, user.id);

  await appendSessionActivity({
    sessionId: input.sessionId,
    type: "player_action",
    text: `${input.characterName} wirkt „${input.spellName}"`,
    characterId: input.characterId,
    characterName: input.characterName,
  });
}

export async function applyLiveSessionWeaponPreset(input: {
  sessionId: string;
  characterId: string;
  characterName: string;
  presetId: string;
}): Promise<LiveAvatarStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertLiveAvatarAccess(input.characterId, input.sessionId, user.id);

  const inventory = await getCharacterInventory(input.characterId);
  const items = inventory.items.filter((i) => !i.is_deleted);
  const { data: chRaw } = await supabase
    .from("characters")
    .select("sheet_data")
    .eq("id", input.characterId)
    .single();
  const sheet = parseSheetData((chRaw as { sheet_data?: unknown } | null)?.sheet_data);
  const equipment = normalizeEquipmentState(sheet?.equipment);
  const preset = (equipment.weaponPresets ?? []).find((p) => p.id === input.presetId);
  if (!preset) throw new Error("Waffenkombination nicht gefunden.");

  const next = applyWeaponPreset(equipment, input.presetId, items);
  await (supabase as any)
    .from("characters")
    .update({
      sheet_data: mergeSheetWithDefaults({ ...(sheet ?? {}), equipment: next }),
      sheet_source: "manual",
    })
    .eq("id", input.characterId);

  await appendSessionActivity({
    sessionId: input.sessionId,
    type: "player_action",
    text: `${input.characterName} wechselt Waffenkombination: „${preset.name}"`,
    characterId: input.characterId,
    characterName: input.characterName,
  });

  return getLiveSessionAvatarStatus(input.characterId);
}

export async function applyLiveSessionLoadout(input: {
  sessionId: string;
  characterId: string;
  characterName: string;
  loadoutId: string;
}): Promise<LiveAvatarStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertLiveAvatarAccess(input.characterId, input.sessionId, user.id);

  const inventory = await getCharacterInventory(input.characterId);
  const items = inventory.items.filter((i) => !i.is_deleted);
  const { data: chRaw } = await supabase
    .from("characters")
    .select("sheet_data")
    .eq("id", input.characterId)
    .single();
  const sheet = parseSheetData((chRaw as { sheet_data?: unknown } | null)?.sheet_data);
  const equipment = normalizeEquipmentState(sheet?.equipment);
  const loadout = (equipment.loadouts ?? []).find((l) => l.id === input.loadoutId);
  if (!loadout) throw new Error("Ausrüstungsset nicht gefunden.");

  const next = applyEquipmentLoadout(equipment, input.loadoutId, items);
  await (supabase as any)
    .from("characters")
    .update({
      sheet_data: mergeSheetWithDefaults({ ...(sheet ?? {}), equipment: next }),
      sheet_source: "manual",
    })
    .eq("id", input.characterId);

  await appendSessionActivity({
    sessionId: input.sessionId,
    type: "player_action",
    text: `${input.characterName} wechselt Ausrüstung: „${loadout.name}"`,
    characterId: input.characterId,
    characterName: input.characterName,
    notifyGm: true,
    gmEditSummary: `Loadout „${loadout.name}" in Live-Session aktiviert`,
  });

  return getLiveSessionAvatarStatus(input.characterId);
}
