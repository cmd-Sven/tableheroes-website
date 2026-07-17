import { z } from "zod";
import { createAdminClient } from "@/src/lib/supabase/server";
import {
  foundryJson,
  foundryOptions,
  getFoundryApiKey,
  resolveFoundryApiCampaign,
} from "@/src/lib/foundry-sync/foundry-api";
import { resolveFoundryCharacterMapping } from "@/src/lib/foundry-sync/resolve-foundry-mapping";
import { mapFoundryActorToDnd5eSheet } from "@/src/lib/characters/dnd5e/foundry-mapper";
import {
  remapEquipmentToCharacterItemIds,
  syncFoundryItemsToCharacterInventory,
} from "@/src/lib/characters/dnd5e/foundry-equipment-mapper";
import { withSyncedArmorClass } from "@/src/lib/characters/dnd5e/equipment";
import { sanitizeActorDisplayLabel } from "@/src/lib/foundry-sync/actor-display-labels";
import { canApplyFoundryProgressionFromSync } from "@/src/lib/foundry-sync/progression-lock-server";
import type { Dnd5eSheetData } from "@/src/lib/characters/dnd5e/types";
import type { CharacterItem, InventoryCategory } from "@/src/types/inventory";

export const dynamic = "force-dynamic";

const LOG_PREFIX = "[foundry-sync/sheet]";

export async function OPTIONS() {
  return foundryOptions();
}

const payloadSchema = z
  .object({
    foundry_actor_id: z.string().trim().min(1, "foundry_actor_id fehlt."),
    actor_name: z.string().trim().optional(),
    actor_system: z.record(z.string(), z.unknown()),
    actor_items: z.array(z.unknown()).optional(),
  })
  .strict();

export async function GET() {
  return foundryJson({
    ok: true,
    endpoint: "foundry-sync/sheet",
    message:
      "POST = vollständiges DnD5e-Charakterblatt von Foundry nach Table Heroes (nur diese Richtung).",
  });
}

function mapDbRowsToCharacterItems(
  characterId: string,
  rows: Record<string, unknown>[],
): CharacterItem[] {
  return rows.map((row) => ({
    id: String(row.id),
    character_id: characterId,
    name: String(row.name ?? ""),
    description: row.description != null ? String(row.description) : null,
    category:
      (row.category as InventoryCategory) ?? "Equipment",
    icon_type: row.icon_type != null ? String(row.icon_type) : null,
    is_deleted: Boolean(row.is_deleted),
    target_fap: Math.max(0, Math.round(Number(row.target_fap ?? 0))),
    current_fap: Math.max(0, Math.round(Number(row.current_fap ?? 0))),
    created_at: row.created_at != null ? String(row.created_at) : undefined,
  }));
}

export async function POST(request: Request) {
  const apiKey = getFoundryApiKey(request);
  if (!apiKey) {
    return foundryJson(
      { error: "Missing API key header: x-tableheroes-api-key" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return foundryJson({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return foundryJson(
      { error: "Payload validation failed.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const supabase = createAdminClient();
  const auth = await resolveFoundryApiCampaign(supabase, apiKey);
  if (!auth.ok) {
    return foundryJson({ error: auth.error }, { status: auth.status });
  }

  const campaignId = auth.campaignId;
  const actorId = input.foundry_actor_id;

  const resolved = await resolveFoundryCharacterMapping(supabase, campaignId, actorId);
  if (!resolved.ok) {
    return foundryJson(resolved.body, { status: resolved.status });
  }

  const mapping = resolved.mapping;
  const { sheet: rawSheet, meta, equipmentImport } = mapFoundryActorToDnd5eSheet({
    actorName: input.actor_name,
    actorSystem: input.actor_system,
    actorItems: input.actor_items,
  });

  const characterId = String(mapping.character_id);
  const foundryToTh = await syncFoundryItemsToCharacterInventory(
    supabase,
    characterId,
    equipmentImport.importItems,
  );

  let sheet: Dnd5eSheetData = {
    ...rawSheet,
    equipment: remapEquipmentToCharacterItemIds(rawSheet.equipment!, foundryToTh),
    attacks: rawSheet.attacks.map((atk) => ({
      ...atk,
      id: foundryToTh.get(atk.id) ?? atk.id,
    })),
    // Foundry-Actor-AC ist nur Snapshot — maßgeblich ist die angelegte Ausrüstung
    combat: {
      ...rawSheet.combat,
      acOverride: null,
    },
  };

  const { data: itemRows } = await (supabase as any)
    .from("character_items")
    .select(
      "id, character_id, name, description, category, icon_type, is_deleted, target_fap, current_fap, created_at",
    )
    .eq("character_id", characterId)
    .eq("is_deleted", false);

  const items = mapDbRowsToCharacterItems(
    characterId,
    (itemRows ?? []) as Record<string, unknown>[],
  );
  sheet = withSyncedArmorClass(sheet, items, sheet.equipment, meta.level);

  const now = new Date().toISOString();
  const applyProgression = await canApplyFoundryProgressionFromSync(
    supabase,
    characterId,
  );

  const updatePayload: Record<string, unknown> = {
    sheet_data: sheet,
    sheet_overrides: {},
    sheet_source: "foundry_import",
    sheet_synced_at: now,
    race: sanitizeActorDisplayLabel(meta.race),
    background: sanitizeActorDisplayLabel(meta.background),
    alignment: sanitizeActorDisplayLabel(meta.alignment),
  };

  // Stufe / Klasse / XP nur beim ersten Foundry-Import — danach Selbstpflege
  if (applyProgression) {
    updatePayload.class = sanitizeActorDisplayLabel(meta.className);
    updatePayload.subclass = sanitizeActorDisplayLabel(meta.subclass);
    updatePayload.level = meta.level;
    updatePayload.experience_points = meta.experiencePoints;
  }

  if (input.actor_name?.trim()) {
    updatePayload.name = input.actor_name.trim();
  }

  const { error: characterUpdateError } = await (supabase as any)
    .from("characters")
    .update(updatePayload)
    .eq("id", mapping.character_id)
    .eq("campaign_id", campaignId);

  if (characterUpdateError) {
    console.error(`${LOG_PREFIX} character update failed`, characterUpdateError, {
      campaignId,
      actorId,
      characterId: mapping.character_id,
    });
    return foundryJson({ error: "Character sheet sync update failed." }, { status: 500 });
  }

  console.info(`${LOG_PREFIX} synced`, {
    campaignId,
    actorId,
    characterId: mapping.character_id,
    level: meta.level,
    class: meta.className,
    ac: sheet.combat.ac,
  });

  return foundryJson({
    success: true,
    direction: "foundry_to_th",
    campaign_id: campaignId,
    character_id: mapping.character_id,
    foundry_actor_id: actorId,
    sheet_synced_at: now,
    synced_fields: Object.keys(updatePayload),
    equipment_items_synced: foundryToTh.size,
    armor_class: sheet.combat.ac,
  });
}
