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
import { cellInTrap, canPassivelyDetectTrapAtDistance, chebyshevDistance } from "@/src/lib/session/battlemap-trap-geometry";
import {
  buildRecipeScrollDescription,
  parseTrapAiPayload,
  recipeScrollGoldValue,
  trapComponents,
  trapDisarmPending,
  type TrapComponent,
  type TrapDisarmPending,
} from "@/src/lib/session/battlemap-trap-model";
import {
  listHasProficiency,
  PROFICIENCY_CATALOG,
} from "@/src/lib/characters/dnd5e/progression/proficiencies-catalog";
import { createCharacterItem } from "@/src/lib/actions/character-inventory-actions";
import { parseTrapStatusEffect } from "@/src/lib/characters/condition-tokens";
import { appendSessionActivity } from "@/src/lib/actions/session-activity-actions";

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

async function assertTrapDisarmAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  userId: string,
  characterId: string,
): Promise<{ isGm: boolean }> {
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
  const isGm = isCampaignGm(
    campaignRaw as { gm_id?: string | null; owner_id?: string | null },
    userId,
  );
  if (isGm) return { isGm: true };

  const { data: chRaw } = await (supabase as any)
    .from("characters")
    .select("user_id")
    .eq("id", characterId)
    .maybeSingle();
  if (!chRaw || String(chRaw.user_id) !== userId) {
    throw new Error("Keine Berechtigung für diese Entschärfung.");
  }
  return { isGm: false };
}

export type TrapDisarmDraftInput = {
  investigate: boolean;
  trapMasteryDex: boolean;
  hasThievesTools: boolean;
  thievesToolsProficient: boolean;
  sleightProficient: boolean;
  sleightExpertise: boolean;
  investigationSuccess?: boolean | null;
  disarmSuccess?: boolean | null;
  gmTakeover?: boolean;
};

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
    is_disarmed: row.is_disarmed === true,
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
  components?: TrapComponent[];
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
  const aiPayload: Record<string, unknown> = {
    ...(input.aiPayload ?? {}),
  };
  if (input.components?.length) {
    aiPayload.components = input.components;
  }

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
      ai_payload: aiPayload,
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
      /** passive = PP-Nähe; enter = Betreten der Trigger-Zelle */
      source?: "passive" | "enter" | "gm";
    }
  | {
      kind: "triggered";
      trap: SessionBattlemapTrap;
      passivePerception: number;
      characterName: string;
      characterId: string;
    };

export type TrapProximityCheckResult =
  | { kind: "none" }
  | {
      kind: "detected";
      trap: SessionBattlemapTrap;
      passivePerception: number;
      characterName: string;
      source: "passive";
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

async function markTrapDetected(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trap: SessionBattlemapTrap,
  sessionId: string,
  characterName: string,
  source: "passive" | "enter" | "gm",
): Promise<SessionBattlemapTrap> {
  const { data, error: updErr } = await (supabase as any)
    .from("session_battlemap_traps")
    .update({
      is_detected: true,
      is_visible_to_players: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", trap.id)
    .eq("session_id", sessionId)
    .select("*")
    .single();
  if (updErr) throw new Error(updErr.message);

  const updated = normalizeTrap(data as Record<string, unknown>);
  const sourceLabel =
    source === "gm"
      ? "Spielleiter"
      : source === "passive"
        ? "Passive Wahrnehmung"
        : "Trigger-Zelle";
  try {
    await appendSessionActivity({
      sessionId,
      text: `${characterName} hat „${trap.name}“ entdeckt (${sourceLabel}).`,
      type: "trap_detected",
      meta: { trap_id: trap.id, source },
    });
  } catch {
    /* Chat-Hinweis optional */
  }
  return updated;
}

/**
 * Passive Erkennung in der Nähe (nicht auf der Trigger-Zelle).
 * Läuft nach jeder Token-Bewegung; löst die Falle nicht aus.
 */
export async function checkBattlemapTrapsOnProximity(input: {
  sessionId: string;
  battlemapId: string;
  characterId: string;
  gridX: number;
  gridY: number;
}): Promise<TrapProximityCheckResult> {
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
    .eq("is_triggered", false)
    .eq("is_detected", false);
  if (error) throw new Error(error.message);

  const traps = ((trapsRaw ?? []) as Record<string, unknown>[]).map(normalizeTrap);
  const { passivePerception, characterName } = await loadPassivePerception(
    supabase,
    input.characterId,
  );

  let best: SessionBattlemapTrap | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const trap of traps) {
    const dist = chebyshevDistance(input.gridX, input.gridY, trap.grid_x, trap.grid_y);
    if (dist === 0) continue;
    if (
      canPassivelyDetectTrapAtDistance(trap, input.gridX, input.gridY, passivePerception) &&
      dist < bestDist
    ) {
      best = trap;
      bestDist = dist;
    }
  }

  if (!best) return { kind: "none" };

  const updated = await markTrapDetected(
    supabase,
    best,
    input.sessionId,
    characterName,
    "passive",
  );
  return {
    kind: "detected",
    trap: updated,
    passivePerception,
    characterName,
    source: "passive",
  };
}

/**
 * Nach Token-Betritt der Trigger-Zelle (immer genau grid_x/grid_y):
 * Passive Perception vs detectionDC.
 * Detection → Falle sichtbar, nicht ausgelöst.
 * Miss → Trigger, Bewegung pausieren.
 * Bereits entdeckte Fallen lösen nicht erneut aus.
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

  if (hit.is_detected) {
    return { kind: "none" };
  }

  const { passivePerception, characterName } = await loadPassivePerception(
    supabase,
    input.characterId,
  );

  if (passivePerception >= hit.detection_dc) {
    const updated = await markTrapDetected(
      supabase,
      hit,
      input.sessionId,
      characterName,
      "enter",
    );
    return {
      kind: "detected",
      trap: updated,
      passivePerception,
      characterName,
      source: "enter",
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

  await (supabase.from("session_live_states") as any)
    .update({ battlemap_movement_paused: true })
    .eq("session_id", input.sessionId);

  try {
    await appendSessionActivity({
      sessionId: input.sessionId,
      text: `${characterName} löst „${hit.name}“ aus!`,
      type: "trap_triggered",
      characterId: input.characterId,
      meta: { trap_id: hit.id },
    });
  } catch {
    /* optional */
  }

  return {
    kind: "triggered",
    trap: normalizeTrap(triggered as Record<string, unknown>),
    passivePerception,
    characterName,
    characterId: input.characterId,
  };
}

/** SL markiert Falle nach aktiver Suche als entdeckt. */
export async function markBattlemapTrapDiscovered(input: {
  sessionId: string;
  trapId: string;
  characterName?: string;
}): Promise<SessionBattlemapTrap> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const { data: row, error: fetchErr } = await (supabase as any)
    .from("session_battlemap_traps")
    .select("*")
    .eq("id", input.trapId)
    .eq("session_id", input.sessionId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) throw new Error("Falle nicht gefunden.");

  const trap = normalizeTrap(row as Record<string, unknown>);
  if (trap.is_detected) return trap;

  return markTrapDetected(
    supabase,
    trap,
    input.sessionId,
    input.characterName?.trim() || "Die Gruppe",
    "gm",
  );
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

const THIEVES_TOOLS_DEF =
  PROFICIENCY_CATALOG.find((d) => d.id === "tool-thieves")!;

function characterHasTrapMasteryFeat(sheet: ReturnType<typeof parseSheetData>): boolean {
  if (!sheet) return false;
  return sheet.features.some((f) => {
    const name = `${f.name ?? ""} ${f.nameDe ?? ""} ${f.nameEn ?? ""}`.toLowerCase();
    return (
      name.includes("fallenmeister") ||
      name.includes("trap mastery") ||
      name.includes("trap-mastery")
    );
  });
}

export type TrapDisarmCharacterStats = {
  characterId: string;
  characterName: string;
  proficiencyBonus: number;
  investigationMod: number;
  arcanaMod: number;
  dexMod: number;
  sleightMod: number;
  sleightExpertise: boolean;
  thievesToolsProficient: boolean;
  hasTrapMasteryFeat: boolean;
};

/** Charakterwerte für Entschärfungs-Modal (Fertigkeiten, Werkzeuge, Feat). */
export async function getTrapDisarmCharacterStats(
  characterId: string,
): Promise<TrapDisarmCharacterStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: chRaw } = await (supabase as any)
    .from("characters")
    .select("sheet_data, level, character_flaws, name")
    .eq("id", characterId)
    .maybeSingle();
  if (!chRaw) throw new Error("Charakter nicht gefunden.");

  const level = Math.max(1, Number(chRaw.level ?? 1));
  const sheet = parseSheetData(chRaw.sheet_data) ?? createEmptyDnd5eSheet(level);
  const flaws = parseCharacterFlaws(chRaw.character_flaws);
  const derived = computeDerivedDnd5eSheet(sheet, level);
  const flawAdjusted = applyFlawModifiersToDerived(
    derived,
    sheet.combat.speed,
    flaws,
  );

  const thievesToolsProficient = listHasProficiency(
    sheet.proficiencies.tools,
    THIEVES_TOOLS_DEF,
  );
  const sleightEntry = sheet.skills.slt ?? { proficient: "none" as const };

  return {
    characterId,
    characterName: String(chRaw.name ?? "Charakter"),
    proficiencyBonus: flawAdjusted.derived.proficiencyBonus,
    investigationMod: flawAdjusted.derived.skills.inv.total,
    arcanaMod: flawAdjusted.derived.skills.arc.total,
    dexMod: flawAdjusted.derived.abilities.dex.modifier,
    sleightMod: flawAdjusted.derived.skills.slt.total,
    sleightExpertise: sleightEntry.proficient === "expertise",
    thievesToolsProficient,
    hasTrapMasteryFeat: characterHasTrapMasteryFeat(sheet),
  };
}

async function loadTrapRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trapId: string,
  sessionId: string,
): Promise<SessionBattlemapTrap> {
  const { data: row, error } = await (supabase as any)
    .from("session_battlemap_traps")
    .select("*")
    .eq("id", trapId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Falle nicht gefunden.");
  return normalizeTrap(row as Record<string, unknown>);
}

async function updateTrapAiPayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trap: SessionBattlemapTrap,
  sessionId: string,
  patch: Record<string, unknown>,
): Promise<SessionBattlemapTrap> {
  const aiPayload = { ...(trap.ai_payload ?? {}), ...patch };
  const { data, error } = await (supabase as any)
    .from("session_battlemap_traps")
    .update({
      ai_payload: aiPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", trap.id)
    .eq("session_id", sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeTrap(data as Record<string, unknown>);
}

/** SL löst eine entdeckte, noch aktive Falle manuell aus. */
export async function triggerBattlemapTrapManually(input: {
  sessionId: string;
  trapId: string;
  characterId?: string | null;
  characterName?: string;
}): Promise<{
  trap: SessionBattlemapTrap;
  characterName: string;
  characterId: string;
  passivePerception: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const trap = await loadTrapRow(supabase, input.trapId, input.sessionId);
  if (!trap.is_armed || trap.is_triggered || trap.is_disarmed) {
    throw new Error("Diese Falle kann nicht ausgelöst werden.");
  }

  const characterId = input.characterId?.trim() || "";
  let characterName = input.characterName?.trim() || "Die Gruppe";
  let passivePerception = 10;
  if (characterId) {
    const pp = await loadPassivePerception(supabase, characterId);
    characterName = pp.characterName;
    passivePerception = pp.passivePerception;
  }

  const { data: triggered, error: trigErr } = await (supabase as any)
    .from("session_battlemap_traps")
    .update({
      is_armed: false,
      is_triggered: true,
      is_visible_to_players: true,
      triggered_by_character_id: characterId || null,
      triggered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", trap.id)
    .eq("session_id", input.sessionId)
    .select("*")
    .single();
  if (trigErr) throw new Error(trigErr.message);

  await (supabase.from("session_live_states") as any)
    .update({ battlemap_movement_paused: true })
    .eq("session_id", input.sessionId);

  try {
    await appendSessionActivity({
      sessionId: input.sessionId,
      text: `${characterName} löst „${trap.name}“ aus (SL).`,
      type: "trap_triggered",
      characterId: characterId || undefined,
      meta: { trap_id: trap.id, source: "gm_manual" },
    });
  } catch {
    /* optional */
  }

  return {
    trap: normalizeTrap(triggered as Record<string, unknown>),
    characterName,
    characterId: characterId || "",
    passivePerception,
  };
}

/** Öffnet eine synchronisierte Entschärfungs-Session (sichtbar für SL + betroffenen Spieler). */
export async function openTrapDisarmSession(input: {
  sessionId: string;
  trapId: string;
  characterId: string;
}): Promise<SessionBattlemapTrap> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  await assertTrapDisarmAccess(supabase, input.sessionId, user.id, input.characterId);

  const trap = await loadTrapRow(supabase, input.trapId, input.sessionId);
  if (!trap.is_detected || trap.is_triggered || trap.is_disarmed) {
    throw new Error("Diese Falle kann nicht entschärft werden.");
  }

  const existing = trapDisarmPending(trap);
  if (existing?.status === "player_submitted") {
    return trap;
  }
  if (existing?.status === "in_progress" && existing.characterId === input.characterId) {
    return trap;
  }

  const stats = await getTrapDisarmCharacterStats(input.characterId);
  const disarm: TrapDisarmPending = {
    status: "in_progress",
    characterId: input.characterId,
    characterName: stats.characterName,
    investigate: false,
    trapMasteryDex: stats.hasTrapMasteryFeat,
    hasThievesTools: true,
    thievesToolsProficient: stats.thievesToolsProficient,
    sleightProficient: stats.sleightMod > stats.dexMod,
    sleightExpertise: stats.sleightExpertise,
    investigationSuccess: null,
    disarmSuccess: null,
    gmTakeover: false,
    startedAt: new Date().toISOString(),
  };

  return updateTrapAiPayload(supabase, trap, input.sessionId, { disarm });
}

/** Synchronisiert Entwurfs-Eingaben zwischen SL und Spieler. */
export async function updateTrapDisarmDraft(input: {
  sessionId: string;
  trapId: string;
  characterId: string;
  draft: TrapDisarmDraftInput;
}): Promise<SessionBattlemapTrap> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { isGm } = await assertTrapDisarmAccess(
    supabase,
    input.sessionId,
    user.id,
    input.characterId,
  );

  const trap = await loadTrapRow(supabase, input.trapId, input.sessionId);
  const pending = trapDisarmPending(trap);
  if (!pending || pending.status !== "in_progress") {
    throw new Error("Keine aktive Entschärfungs-Session.");
  }
  if (pending.characterId !== input.characterId) {
    throw new Error("Falscher Charakter für diese Entschärfung.");
  }

  const gmTakeover = input.draft.gmTakeover === true;
  if (gmTakeover && !isGm) {
    throw new Error("Nur der SL kann die Übernahme aktivieren.");
  }
  if (!isGm && gmTakeover) {
    throw new Error("Der SL hat die Eingabe übernommen.");
  }
  if (!isGm && pending.gmTakeover) {
    throw new Error("Der SL hat die Eingabe übernommen.");
  }

  const disarm: TrapDisarmPending = {
    ...pending,
    ...input.draft,
    status: "in_progress",
    gmTakeover,
  };

  return updateTrapAiPayload(supabase, trap, input.sessionId, { disarm });
}

/** Schließt eine laufende Entschärfungs-Session ohne Einreichung. */
export async function closeTrapDisarmSession(input: {
  sessionId: string;
  trapId: string;
  characterId: string;
}): Promise<SessionBattlemapTrap> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  await assertTrapDisarmAccess(supabase, input.sessionId, user.id, input.characterId);

  const trap = await loadTrapRow(supabase, input.trapId, input.sessionId);
  const pending = trapDisarmPending(trap);
  if (!pending || pending.status !== "in_progress") {
    return trap;
  }
  if (pending.characterId !== input.characterId) {
    throw new Error("Falscher Charakter für diese Entschärfung.");
  }

  return updateTrapAiPayload(supabase, trap, input.sessionId, { disarm: null });
}

/** Spieler reicht Entschärf-Versuch ein — SL bestätigt danach. */
export async function submitTrapDisarmAttempt(input: {
  sessionId: string;
  trapId: string;
  characterId: string;
  investigate: boolean;
  trapMasteryDex: boolean;
  hasThievesTools: boolean;
  thievesToolsProficient: boolean;
  sleightProficient: boolean;
  sleightExpertise: boolean;
  playerClaimsSuccess: boolean;
  investigationSuccess?: boolean;
  disarmSuccess?: boolean;
}): Promise<SessionBattlemapTrap> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { isGm } = await assertTrapDisarmAccess(
    supabase,
    input.sessionId,
    user.id,
    input.characterId,
  );

  const trap = await loadTrapRow(supabase, input.trapId, input.sessionId);
  if (!trap.is_detected || trap.is_triggered || trap.is_disarmed) {
    throw new Error("Diese Falle kann nicht entschärft werden.");
  }
  const pending = trapDisarmPending(trap);
  if (pending?.status === "player_submitted") {
    throw new Error("Ein Entschärfungsversuch wartet bereits auf SL-Bestätigung.");
  }
  if (!isGm && pending?.gmTakeover) {
    throw new Error("Der SL hat die Eingabe übernommen — bitte warten.");
  }

  const stats = await getTrapDisarmCharacterStats(input.characterId);
  const disarm: TrapDisarmPending = {
    status: "player_submitted",
    characterId: input.characterId,
    characterName: stats.characterName,
    investigate: input.investigate,
    trapMasteryDex: input.trapMasteryDex,
    hasThievesTools: input.hasThievesTools,
    thievesToolsProficient: input.thievesToolsProficient,
    sleightProficient: input.sleightProficient,
    sleightExpertise: input.sleightExpertise,
    playerClaimsSuccess: input.playerClaimsSuccess,
    investigationSuccess: input.investigationSuccess,
    disarmSuccess: input.disarmSuccess,
    submittedAt: new Date().toISOString(),
  };

  const updated = await updateTrapAiPayload(supabase, trap, input.sessionId, { disarm });
  try {
    await appendSessionActivity({
      sessionId: input.sessionId,
      text: `${stats.characterName} versucht „${trap.name}“ zu entschärfen — SL-Bestätigung ausstehend.`,
      type: "trap_disarm_pending",
      characterId: input.characterId,
      meta: { trap_id: trap.id },
    });
  } catch {
    /* optional */
  }
  return updated;
}

/** SL bestätigt oder lehnt Entschärfung ab. Bei Erfolg: Falle entschärft. */
export async function confirmTrapDisarm(input: {
  sessionId: string;
  trapId: string;
  approved: boolean;
}): Promise<SessionBattlemapTrap> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const trap = await loadTrapRow(supabase, input.trapId, input.sessionId);
  const pending = trapDisarmPending(trap);
  if (!pending || pending.status !== "player_submitted") {
    throw new Error("Kein ausstehender Entschärfungsversuch.");
  }

  if (!input.approved) {
    const cleared = await updateTrapAiPayload(supabase, trap, input.sessionId, {
      disarm: null,
    });
    try {
      await appendSessionActivity({
        sessionId: input.sessionId,
        text: `Entschärfung von „${trap.name}“ abgelehnt.`,
        type: "trap_disarm_rejected",
        meta: { trap_id: trap.id },
      });
    } catch {
      /* optional */
    }
    return cleared;
  }

  if (!pending.playerClaimsSuccess) {
    throw new Error("Spieler hat keinen erfolgreichen Versuch gemeldet.");
  }

  const { data, error } = await (supabase as any)
    .from("session_battlemap_traps")
    .update({
      is_disarmed: true,
      is_armed: false,
      ai_payload: {
        ...(trap.ai_payload ?? {}),
        disarm: {
          ...pending,
          status: "gm_confirmed",
          gmConfirmedAt: new Date().toISOString(),
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", trap.id)
    .eq("session_id", input.sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const updated = normalizeTrap(data as Record<string, unknown>);
  try {
    await appendSessionActivity({
      sessionId: input.sessionId,
      text: `${pending.characterName} hat „${trap.name}“ entschärft.`,
      type: "trap_disarmed",
      characterId: pending.characterId,
      meta: { trap_id: trap.id },
    });
  } catch {
    /* optional */
  }
  return updated;
}

export type TrapDisarmLootItem = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  iconType: string | null;
  quantity: number;
};

export type TrapDisarmLootResult = {
  items: TrapDisarmLootItem[];
  recipeScroll: TrapDisarmLootItem | null;
};

/** Nach erfolgreicher Entschärfung: Komponenten (+ optional Rezept) ins Inventar. */
export async function claimTrapDisarmLoot(input: {
  sessionId: string;
  trapId: string;
  characterId: string;
}): Promise<TrapDisarmLootResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const trap = await loadTrapRow(supabase, input.trapId, input.sessionId);
  if (!trap.is_disarmed) {
    throw new Error("Falle wurde noch nicht entschärft.");
  }

  const pending = trapDisarmPending(trap);
  if (!pending || pending.status !== "gm_confirmed") {
    throw new Error("Entschärfung wurde noch nicht vom SL bestätigt.");
  }
  if (pending.characterId !== input.characterId) {
    throw new Error("Nur der entschärfende Charakter kann die Beute nehmen.");
  }

  const components = trapComponents(trap);
  const identified = pending.investigate && pending.investigationSuccess !== false;
  if (!identified || components.length === 0) {
    return { items: [], recipeScroll: null };
  }

  const items: TrapDisarmLootItem[] = [];
  for (const comp of components) {
    for (let i = 0; i < comp.quantity; i += 1) {
      const created = await createCharacterItem({
        characterId: input.characterId,
        name: comp.quantity > 1 ? `${comp.name} (${i + 1}/${comp.quantity})` : comp.name,
        description: comp.description ?? null,
        category:
          comp.category === "poison" || comp.category === "consumable"
            ? "Consumable"
            : comp.category === "scroll"
              ? "Story"
              : comp.category === "gem"
                ? "CoinGem"
                : "Equipment",
        iconType: comp.iconType ?? comp.category,
      });
      items.push({
        id: created.id,
        name: created.name,
        description: created.description,
        category: created.category,
        iconType: created.icon_type,
        quantity: 1,
      });
    }
  }

  let recipeScroll: TrapDisarmLootItem | null = null;
  if (Math.random() < 0.1) {
    const gold = recipeScrollGoldValue(trap.difficulty);
    const scroll = await createCharacterItem({
      characterId: input.characterId,
      name: `Rezept: ${trap.name}`,
      description: `${buildRecipeScrollDescription(trap, components)}\n\nGeschätzter Wert: ${gold} GP`,
      category: "Story",
      iconType: "scroll",
    });
    recipeScroll = {
      id: scroll.id,
      name: scroll.name,
      description: scroll.description,
      category: scroll.category,
      iconType: scroll.icon_type,
      quantity: 1,
    };
  }

  try {
    await appendSessionActivity({
      sessionId: input.sessionId,
      text: `${pending.characterName} sichert Komponenten aus „${trap.name}“.`,
      type: "trap_loot_claimed",
      characterId: input.characterId,
      meta: { trap_id: trap.id, item_count: items.length },
    });
  } catch {
    /* optional */
  }

  return { items, recipeScroll };
}
