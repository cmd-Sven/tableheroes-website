"use server";

import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { parseSheetData, mergeSheetWithDefaults } from "@/src/lib/characters/dnd5e/defaults";
import { normalizeEquipmentState, withSyncedArmorClass } from "@/src/lib/characters/dnd5e/equipment";
import type { Dnd5eEquipmentState } from "@/src/lib/characters/dnd5e/equipment-types";
import { appendSessionActivity } from "@/src/lib/actions/session-activity-actions";
import { getCharacterInventory } from "@/src/lib/actions/character-inventory-actions";

export async function saveLiveSessionEquipment(input: {
  sessionId: string;
  characterId: string;
  characterName: string;
  equipment: Dnd5eEquipmentState;
  activityText: string;
  activityType?: string;
  notifyGm?: boolean;
  gmEditSummary?: string;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: chRaw, error: loadErr } = await supabase
    .from("characters")
    .select("sheet_data, user_id, campaign_id")
    .eq("id", input.characterId)
    .single();

  if (loadErr || !chRaw) throw new Error("Charakter nicht gefunden.");

  const ch = chRaw as { user_id?: string | null; campaign_id?: string | null; sheet_data?: unknown };
  const isOwner = ch.user_id === user.id;

  let allowGmPrepEdit = false;
  if (!isOwner && ch.campaign_id) {
    const [{ data: sessionRaw }, { data: campRaw }] = await Promise.all([
      (supabase.from("sessions") as any)
        .select("status")
        .eq("id", input.sessionId)
        .maybeSingle(),
      (supabase.from("campaigns") as any)
        .select("gm_id, owner_id")
        .eq("id", ch.campaign_id)
        .maybeSingle(),
    ]);
    const sessionStatus = String((sessionRaw as { status?: string } | null)?.status ?? "");
    const isGm = isCampaignGm(campRaw as { gm_id?: string | null; owner_id?: string | null } | null, user.id);
    allowGmPrepEdit = isGm && sessionStatus === "Scheduled";
  }

  if (!isOwner && !allowGmPrepEdit) {
    throw new Error("Nur der Charakterbesitzer kann Ausrüstung ändern.");
  }

  const parsed = parseSheetData(ch.sheet_data);
  const inventory = await getCharacterInventory(input.characterId);
  const merged = withSyncedArmorClass(
    mergeSheetWithDefaults({
      ...(parsed ?? {}),
      equipment: normalizeEquipmentState(input.equipment),
    }),
    inventory.items.filter((i) => !i.is_deleted),
    input.equipment,
  );

  const { error: upErr } = await (supabase as any)
    .from("characters")
    .update({ sheet_data: merged, sheet_source: "manual" })
    .eq("id", input.characterId);

  if (upErr) throw new Error(upErr.message || "Ausrüstung konnte nicht gespeichert werden.");

  await appendSessionActivity({
    sessionId: input.sessionId,
    type: input.activityType ?? "player_action",
    text: input.activityText,
    characterId: input.characterId,
    characterName: input.characterName,
    notifyGm: input.notifyGm,
    gmEditSummary: input.gmEditSummary,
  });
}
