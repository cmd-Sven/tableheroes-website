"use server";

import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { parseSheetData, createEmptyDnd5eSheet } from "@/src/lib/characters/dnd5e/defaults";
import { computeDerivedDnd5eSheet } from "@/src/lib/characters/dnd5e/derived";
import { parseCharacterFlaws } from "@/src/lib/characters/character-flaws";
import { applyFlawModifiersToDerived } from "@/src/lib/characters/flaw-modifiers";
import type {
  BattlemapTrapDifficulty,
  BattlemapTrapEffectShape,
  SessionBattlemapTrap,
} from "@/src/lib/session/battlemap-types";
import { cellInTrap } from "@/src/lib/session/battlemap-trap-geometry";
import { parseTrapStatusEffect } from "@/src/lib/characters/condition-tokens";

async function assertSessionGm(sessionId: string, userId: string) {
  const supabase = await createClient();
  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("campaign_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!sessionRaw) throw new Error("Session nicht gefunden.");
  const campaignId = String((sessionRaw as { campaign_id: string }).campaign_id);
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (
    !isCampaignGm(
      campaignRaw as { gm_id?: string | null; owner_id?: string | null },
      userId,
    )
  ) {
    throw new Error("Nur der Spielleiter kann das.");
  }
  return { supabase, campaignId };
}

function normalizeTrap(row: Record<string, unknown>): SessionBattlemapTrap {
  const difficultyRaw = String(row.difficulty ?? "medium");
  const difficulty: BattlemapTrapDifficulty =
    difficultyRaw === "easy" ||
    difficultyRaw === "hard" ||
    difficultyRaw === "deadly"
      ? difficultyRaw
      : "medium";
  const shapeRaw = String(row.effect_shape ?? "circle");
  const effect_shape: BattlemapTrapEffectShape =
    shapeRaw === "rect" ? "rect" : "circle";
  return {
    id: String(row.id),
    battlemap_id: String(row.battlemap_id),
    session_id: String(row.session_id),
    campaign_id: String(row.campaign_id),
    name: String(row.name ?? "Falle"),
    description: String(row.description ?? ""),
    trap_type: String(row.trap_type ?? "mechanical"),
    difficulty,
    grid_x: Math.round(Number(row.grid_x ?? 0)),
    grid_y: Math.round(Number(row.grid_y ?? 0)),
    detection_dc: Math.max(1, Math.min(40, Math.round(Number(row.detection_dc ?? 15)))),
    is_area_effect: row.is_area_effect === true,
    effect_shape,
    effect_radius: Math.max(1, Math.min(20, Math.round(Number(row.effect_radius ?? 1)))),
    damage: String(row.damage ?? "2d6"),
    damage_type: String(row.damage_type ?? "piercing"),
    save_ability: row.save_ability != null ? String(row.save_ability) : null,
    save_dc:
      row.save_dc != null && row.save_dc !== ""
        ? Math.round(Number(row.save_dc))
        : null,
    status_effect: parseTrapStatusEffect(row.status_effect),
    is_armed: row.is_armed !== false,
    is_detected: row.is_detected === true,
    is_triggered: row.is_triggered === true,
    is_visible_to_players: row.is_visible_to_players === true,
    triggered_by_character_id:
      row.triggered_by_character_id != null
        ? String(row.triggered_by_character_id)
        : null,
    triggered_at: row.triggered_at != null ? String(row.triggered_at) : null,
    lore_context: row.lore_context != null ? String(row.lore_context) : null,
    ai_payload:
      row.ai_payload && typeof row.ai_payload === "object"
        ? (row.ai_payload as Record<string, unknown>)
        : {},
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

export async function listBattlemapTraps(
  battlemapId: string,
  sessionId: string,
): Promise<SessionBattlemapTrap[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data, error } = await (supabase as any)
    .from("session_battlemap_traps")
    .select("*")
    .eq("battlemap_id", battlemapId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeTrap);
}

export async function createBattlemapTrap(input: {
  sessionId: string;
  battlemapId: string;
  name: string;
  description?: string;
  trapType?: string;
  difficulty?: BattlemapTrapDifficulty;
  gridX: number;
  gridY: number;
  detectionDC: number;
  isAreaEffect: boolean;
  effectShape?: BattlemapTrapEffectShape;
  effectRadius?: number;
  damage?: string;
  damageType?: string;
  saveAbility?: string | null;
  saveDC?: number | null;
  /** CharacterConditionKey, z. B. poisoned */
  statusEffect?: string | null;
  loreContext?: string | null;
  aiPayload?: Record<string, unknown>;
}): Promise<SessionBattlemapTrap> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  const { campaignId } = await assertSessionGm(input.sessionId, user.id);

  const { data: mapRaw } = await (supabase as any)
    .from("session_battlemaps")
    .select("id")
    .eq("id", input.battlemapId)
    .eq("session_id", input.sessionId)
    .maybeSingle();
  if (!mapRaw) throw new Error("Battlemap nicht gefunden.");

  const statusEffect = parseTrapStatusEffect(input.statusEffect);

  const { data, error } = await (supabase as any)
    .from("session_battlemap_traps")
    .insert({
      battlemap_id: input.battlemapId,
      session_id: input.sessionId,
      campaign_id: campaignId,
      name: input.name.trim() || "Falle",
      description: input.description?.trim() ?? "",
      trap_type: input.trapType?.trim() || "mechanical",
      difficulty: input.difficulty ?? "medium",
      grid_x: Math.round(input.gridX),
      grid_y: Math.round(input.gridY),
      detection_dc: Math.max(1, Math.min(40, Math.round(input.detectionDC))),
      is_area_effect: input.isAreaEffect === true,
      effect_shape: input.effectShape === "rect" ? "rect" : "circle",
      effect_radius: Math.max(1, Math.min(20, Math.round(input.effectRadius ?? 1))),
      damage: input.damage?.trim() || "2d6",
      damage_type: input.damageType?.trim() || "piercing",
      save_ability: input.saveAbility ?? "dex",
      save_dc: input.saveDC ?? input.detectionDC,
      status_effect: statusEffect,
      is_armed: true,
      is_detected: false,
      is_triggered: false,
      is_visible_to_players: false,
      lore_context: input.loreContext ?? null,
      ai_payload: input.aiPayload ?? {},
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message || "Falle konnte nicht erstellt werden.");
  return normalizeTrap(data as Record<string, unknown>);
}

export async function removeBattlemapTrap(
  trapId: string,
  sessionId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);

  const { error } = await (supabase as any)
    .from("session_battlemap_traps")
    .delete()
    .eq("id", trapId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}

export async function clearBattlemapTraps(
  battlemapId: string,
  sessionId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);

  const { error } = await (supabase as any)
    .from("session_battlemap_traps")
    .delete()
    .eq("battlemap_id", battlemapId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}

export type TrapEnterCheckResult =
  | { kind: "none" }
  | {
      kind: "detected";
      trap: SessionBattlemapTrap;
      passivePerception: number;
      characterName: string;
    }
  | {
      kind: "triggered";
      trap: SessionBattlemapTrap;
      passivePerception: number;
      characterName: string;
      characterId: string;
    };

async function loadPassivePerception(
  supabase: Awaited<ReturnType<typeof createClient>>,
  characterId: string,
): Promise<{ passivePerception: number; characterName: string }> {
  const { data: chRaw } = await (supabase as any)
    .from("characters")
    .select("sheet_data, level, character_flaws, name")
    .eq("id", characterId)
    .maybeSingle();
  if (!chRaw) {
    return { passivePerception: 10, characterName: "Charakter" };
  }
  const level = Math.max(1, Number(chRaw.level ?? 1));
  const sheet = parseSheetData(chRaw.sheet_data) ?? createEmptyDnd5eSheet(level);
  const flaws = parseCharacterFlaws(chRaw.character_flaws);
  const derived = computeDerivedDnd5eSheet(sheet, level);
  const flawAdjusted = applyFlawModifiersToDerived(
    derived,
    sheet.combat.speed,
    flaws,
  );
  return {
    passivePerception: flawAdjusted.passivePerception,
    characterName: String(chRaw.name ?? "Charakter"),
  };
}

/**
 * Nach Token-Betritt der Trigger-Zelle (immer genau grid_x/grid_y):
 * Passive Perception vs detectionDC.
 * Detection → Falle sichtbar, nicht ausgelöst.
 * Miss → Trigger, Bewegung pausieren.
 * AoE gilt erst nach Auslösen (Overlay), nicht für den Enter-Check.
 */
export async function checkBattlemapTrapsOnEnter(input: {
  sessionId: string;
  battlemapId: string;
  characterId: string;
  gridX: number;
  gridY: number;
}): Promise<TrapEnterCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: trapsRaw, error } = await (supabase as any)
    .from("session_battlemap_traps")
    .select("*")
    .eq("battlemap_id", input.battlemapId)
    .eq("session_id", input.sessionId)
    .eq("is_armed", true)
    .eq("is_triggered", false);
  if (error) throw new Error(error.message);

  const traps = ((trapsRaw ?? []) as Record<string, unknown>[]).map(normalizeTrap);
  const hit = traps.find((t) => cellInTrap(t, input.gridX, input.gridY));
  if (!hit) return { kind: "none" };

  const { passivePerception, characterName } = await loadPassivePerception(
    supabase,
    input.characterId,
  );

  if (passivePerception >= hit.detection_dc) {
    if (hit.is_detected) {
      return { kind: "none" };
    }
    const { data, error: updErr } = await (supabase as any)
      .from("session_battlemap_traps")
      .update({
        is_detected: true,
        is_visible_to_players: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", hit.id)
      .eq("session_id", input.sessionId)
      .select("*")
      .single();
    if (updErr) throw new Error(updErr.message);
    return {
      kind: "detected",
      trap: normalizeTrap(data as Record<string, unknown>),
      passivePerception,
      characterName,
    };
  }

  const { data: triggered, error: trigErr } = await (supabase as any)
    .from("session_battlemap_traps")
    .update({
      is_armed: false,
      is_triggered: true,
      is_visible_to_players: true,
      triggered_by_character_id: input.characterId,
      triggered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", hit.id)
    .eq("session_id", input.sessionId)
    .select("*")
    .single();
  if (trigErr) throw new Error(trigErr.message);

  // movementLocked
  await (supabase.from("session_live_states") as any)
    .update({ battlemap_movement_paused: true })
    .eq("session_id", input.sessionId);

  return {
    kind: "triggered",
    trap: normalizeTrap(triggered as Record<string, unknown>),
    passivePerception,
    characterName,
    characterId: input.characterId,
  };
}

export async function resolveBattlemapTrapTrigger(input: {
  sessionId: string;
  trapId: string;
  resumeMovement?: boolean;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  if (input.resumeMovement !== false) {
    await (supabase.from("session_live_states") as any)
      .update({ battlemap_movement_paused: false })
      .eq("session_id", input.sessionId);
  }
}
