/**
 * character-inventory-actions — part 2: transferContainerToCharacter.
 */
"use server";

import { requireUser, assertCharacterInventoryAccess } from "./part-01";
import { randomUUID } from "crypto";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { parseSheetData, mergeSheetWithDefaults } from "@/src/lib/characters/dnd5e/defaults";
import { normalizeEquipmentState, withSyncedArmorClass } from "@/src/lib/characters/dnd5e/equipment";
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

export async function transferContainerToCharacter(input: {
  fromCharacterId: string;
  toCharacterId: string;
  containerId: string;
  sourceEquipment: Dnd5eEquipmentState;
}): Promise<{ targetEquipment: Dnd5eEquipmentState }> {
  assertUuidLike(input.fromCharacterId, "Quell-Charakter");
  assertUuidLike(input.toCharacterId, "Ziel-Charakter");

  const { supabase, user } = await requireUser();
  await assertCharacterInventoryAccess(supabase, user.id, input.fromCharacterId);
  await assertCharacterInventoryAccess(supabase, user.id, input.toCharacterId);

  const sourceEq = normalizeEquipmentState(input.sourceEquipment);
  const container = sourceEq.containers.find((c) => c.id === input.containerId);
  if (!container) throw new Error("Behälter nicht gefunden.");

  const itemIds = [
    ...container.itemIds,
    ...(container.linkedItemId ? [container.linkedItemId] : []),
  ];

  for (const itemId of itemIds) {
    const { error } = await (supabase.from("character_items") as any)
      .update({ character_id: input.toCharacterId })
      .eq("id", itemId)
      .eq("character_id", input.fromCharacterId);
    if (error) throw new Error(error.message || "Behälter-Übergabe fehlgeschlagen.");
  }

  const { data: targetChRaw, error: targetErr } = await supabase
    .from("characters")
    .select("sheet_data")
    .eq("id", input.toCharacterId)
    .single();

  if (targetErr || !targetChRaw) throw new Error("Ziel-Charakter nicht gefunden.");

  const targetSheet = parseSheetData((targetChRaw as { sheet_data?: unknown }).sheet_data);
  let targetEq = normalizeEquipmentState(targetSheet?.equipment);

  const newContainer = {
    ...container,
    id: randomUUID(),
    itemIds: [...container.itemIds],
    linkedItemId: container.linkedItemId,
  };
  targetEq.containers = [...targetEq.containers, newContainer];

  const { error: saveErr } = await (supabase as any)
    .from("characters")
    .update({
      sheet_data: mergeSheetWithDefaults({
        ...(targetSheet ?? {}),
        equipment: targetEq,
      }),
    })
    .eq("id", input.toCharacterId);

  if (saveErr) throw new Error(saveErr.message || "Ziel-Ausrüstung konnte nicht gespeichert werden.");

  return { targetEquipment: targetEq };
}
