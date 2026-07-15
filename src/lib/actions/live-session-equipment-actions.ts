"use server";

import { createClient } from "@/src/lib/supabase/server";
import { parseSheetData, mergeSheetWithDefaults } from "@/src/lib/characters/dnd5e/defaults";
import { normalizeEquipmentState } from "@/src/lib/characters/dnd5e/equipment";
import type { Dnd5eEquipmentState } from "@/src/lib/characters/dnd5e/equipment-types";
import { appendSessionActivity } from "@/src/lib/actions/session-activity-actions";

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
    .select("sheet_data, user_id")
    .eq("id", input.characterId)
    .single();

  if (loadErr || !chRaw) throw new Error("Charakter nicht gefunden.");
  if ((chRaw as { user_id?: string }).user_id !== user.id) {
    throw new Error("Nur der Charakterbesitzer kann Ausrüstung ändern.");
  }

  const parsed = parseSheetData((chRaw as { sheet_data?: unknown }).sheet_data);
  const merged = mergeSheetWithDefaults({
    ...(parsed ?? {}),
    equipment: normalizeEquipmentState(input.equipment),
  });

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
