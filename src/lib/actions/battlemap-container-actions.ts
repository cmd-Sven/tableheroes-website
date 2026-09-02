"use server";

import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { parseSheetData, createEmptyDnd5eSheet } from "@/src/lib/characters/dnd5e/defaults";
import { computeDerivedDnd5eSheet } from "@/src/lib/characters/dnd5e/derived";
import { parseCharacterFlaws } from "@/src/lib/characters/character-flaws";
import { applyFlawModifiersToDerived } from "@/src/lib/characters/flaw-modifiers";
import { parseTrapStatusEffect } from "@/src/lib/characters/condition-tokens";
import { appendSessionActivity } from "@/src/lib/actions/session-activity-actions";
import {
  getTrapDisarmCharacterStats,
  type TrapDisarmDraftInput,
} from "@/src/lib/actions/battlemap-trap-actions";
import type {
  BattlemapContainerType,
  BattlemapTrapDifficulty,
  BattlemapTrapEffectShape,
  SessionBattlemapContainer,
  SessionBattlemapTrap,
} from "@/src/lib/session/battlemap-types";
import {
  canPassivelyDetectTrapAtDistance,
  chebyshevDistance,
} from "@/src/lib/session/battlemap-trap-geometry";
import {
  containerToVirtualTrap,
  containerTrapActive,
  defaultForceOpenDc,
  parseContainerTrapConfig,
  type ContainerTrapConfig,
} from "@/src/lib/session/battlemap-container-model";
import {
  parseTrapAiPayload,
  trapDisarmPending,
  type TrapDisarmPending,
} from "@/src/lib/session/battlemap-trap-model";

const CONTAINER_TYPES = new Set<BattlemapContainerType>([
  "chest",
  "barrel",
  "crate",
  "urn",
  "sarcophagus",
  "other",
]);

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

async function assertContainerDisarmAccess(
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

function normalizeContainer(row: Record<string, unknown>): SessionBattlemapContainer {
  const typeRaw = String(row.container_type ?? "chest");
  const container_type: BattlemapContainerType = CONTAINER_TYPES.has(
    typeRaw as BattlemapContainerType,
  )
    ? (typeRaw as BattlemapContainerType)
    : "chest";
  return {
    id: String(row.id),
    battlemap_id: String(row.battlemap_id),
    session_id: String(row.session_id),
    campaign_id: String(row.campaign_id),
    name: String(row.name ?? "Behälter"),
    description: String(row.description ?? ""),
    container_type,
    grid_x: Math.round(Number(row.grid_x ?? 0)),
    grid_y: Math.round(Number(row.grid_y ?? 0)),
    is_locked: row.is_locked === true,
    is_open: row.is_open === true,
    force_open_dc: Math.max(1, Math.min(40, Math.round(Number(row.force_open_dc ?? 15)))),
    has_trap: row.has_trap === true,
    trap_config:
      row.trap_config && typeof row.trap_config === "object"
        ? (row.trap_config as Record<string, unknown>)
        : {},
    is_trap_detected: row.is_trap_detected === true,
    is_trap_disarmed: row.is_trap_disarmed === true,
    is_trap_triggered: row.is_trap_triggered === true,
    trap_visible_to_players: row.trap_visible_to_players === true,
    trap_triggered_by_character_id:
      row.trap_triggered_by_character_id != null
        ? String(row.trap_triggered_by_character_id)
        : null,
    trap_triggered_at:
      row.trap_triggered_at != null ? String(row.trap_triggered_at) : null,
    lore_context: row.lore_context != null ? String(row.lore_context) : null,
    ai_payload:
      row.ai_payload && typeof row.ai_payload === "object"
        ? (row.ai_payload as Record<string, unknown>)
        : {},
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

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

async function loadContainerRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  containerId: string,
  sessionId: string,
): Promise<SessionBattlemapContainer> {
  const { data: row, error } = await (supabase as any)
    .from("session_battlemap_containers")
    .select("*")
    .eq("id", containerId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Behälter nicht gefunden.");
  return normalizeContainer(row as Record<string, unknown>);
}

async function updateContainerAiPayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  container: SessionBattlemapContainer,
  sessionId: string,
  patch: Record<string, unknown>,
): Promise<SessionBattlemapContainer> {
  const aiPayload = { ...(container.ai_payload ?? {}), ...patch };
  const { data, error } = await (supabase as any)
    .from("session_battlemap_containers")
    .update({
      ai_payload: aiPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", container.id)
    .eq("session_id", sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeContainer(data as Record<string, unknown>);
}

async function markContainerTrapDetected(
  supabase: Awaited<ReturnType<typeof createClient>>,
  container: SessionBattlemapContainer,
  sessionId: string,
  characterName: string,
  source: "passive" | "gm",
): Promise<SessionBattlemapContainer> {
  const { data, error } = await (supabase as any)
    .from("session_battlemap_containers")
    .update({
      is_trap_detected: true,
      trap_visible_to_players: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", container.id)
    .eq("session_id", sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const updated = normalizeContainer(data as Record<string, unknown>);
  try {
    const trapName = parseContainerTrapConfig(container.trap_config).name;
    await appendSessionActivity({
      sessionId,
      text: `${characterName} entdeckt Falle in „${container.name}“ (${trapName}) — ${source === "passive" ? "passiv" : "SL"}.`,
      type: "trap_detected",
      meta: { container_id: container.id, source },
    });
  } catch {
    /* optional */
  }
  return updated;
}

async function triggerContainerTrapInternal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  container: SessionBattlemapContainer,
  sessionId: string,
  characterId: string,
  characterName: string,
): Promise<SessionBattlemapContainer> {
  const { data, error } = await (supabase as any)
    .from("session_battlemap_containers")
    .update({
      is_trap_triggered: true,
      trap_visible_to_players: true,
      trap_triggered_by_character_id: characterId || null,
      trap_triggered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", container.id)
    .eq("session_id", sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await (supabase.from("session_live_states") as any)
    .update({ battlemap_movement_paused: true })
    .eq("session_id", sessionId);

  const trapName = parseContainerTrapConfig(container.trap_config).name;
  try {
    await appendSessionActivity({
      sessionId,
      text: `${characterName} löst Falle in „${container.name}“ aus (${trapName}).`,
      type: "trap_triggered",
      characterId: characterId || undefined,
      meta: { container_id: container.id },
    });
  } catch {
    /* optional */
  }
  return normalizeContainer(data as Record<string, unknown>);
}

export async function listBattlemapContainers(
  battlemapId: string,
  sessionId: string,
): Promise<SessionBattlemapContainer[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data, error } = await (supabase as any)
    .from("session_battlemap_containers")
    .select("*")
    .eq("battlemap_id", battlemapId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeContainer);
}

export async function createBattlemapContainer(input: {
  sessionId: string;
  battlemapId: string;
  name: string;
  description?: string;
  containerType?: BattlemapContainerType;
  gridX: number;
  gridY: number;
  isLocked?: boolean;
  forceOpenDc?: number;
  hasTrap?: boolean;
  trapConfig?: Partial<ContainerTrapConfig>;
  loreContext?: string | null;
  aiPayload?: Record<string, unknown>;
}): Promise<SessionBattlemapContainer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  const { campaignId } = await assertSessionGm(input.sessionId, user.id);

  const typeRaw = input.containerType ?? "chest";
  const container_type: BattlemapContainerType = CONTAINER_TYPES.has(typeRaw)
    ? typeRaw
    : "chest";
  const forceOpenDc =
    input.forceOpenDc ?? defaultForceOpenDc(container_type);

  const trapConfig: Record<string, unknown> = input.hasTrap
    ? {
        name: input.trapConfig?.name ?? "Falle",
        description: input.trapConfig?.description ?? "",
        trap_type: input.trapConfig?.trap_type ?? "mechanical",
        difficulty: input.trapConfig?.difficulty ?? "medium",
        detection_dc: input.trapConfig?.detection_dc ?? 15,
        is_area_effect: input.trapConfig?.is_area_effect === true,
        effect_shape: input.trapConfig?.effect_shape ?? "circle",
        effect_radius: input.trapConfig?.effect_radius ?? 1,
        damage: input.trapConfig?.damage ?? "2d6",
        damage_type: input.trapConfig?.damage_type ?? "piercing",
        save_ability: input.trapConfig?.save_ability ?? "dex",
        save_dc: input.trapConfig?.save_dc ?? input.trapConfig?.detection_dc ?? 15,
        status_effect: parseTrapStatusEffect(input.trapConfig?.status_effect),
        components: input.trapConfig?.components ?? [],
      }
    : {};

  const { data, error } = await (supabase as any)
    .from("session_battlemap_containers")
    .insert({
      battlemap_id: input.battlemapId,
      session_id: input.sessionId,
      campaign_id: campaignId,
      name: input.name.trim() || "Behälter",
      description: input.description?.trim() ?? "",
      container_type,
      grid_x: Math.round(input.gridX),
      grid_y: Math.round(input.gridY),
      is_locked: input.isLocked === true,
      is_open: false,
      force_open_dc: Math.max(1, Math.min(40, Math.round(forceOpenDc))),
      has_trap: input.hasTrap === true,
      trap_config: trapConfig,
      lore_context: input.loreContext ?? null,
      ai_payload: input.aiPayload ?? {},
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message || "Behälter konnte nicht erstellt werden.");
  return normalizeContainer(data as Record<string, unknown>);
}

export async function removeBattlemapContainer(
  containerId: string,
  sessionId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(sessionId, user.id);

  const { error } = await (supabase as any)
    .from("session_battlemap_containers")
    .delete()
    .eq("id", containerId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}

export async function clearBattlemapContainers(
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
    .from("session_battlemap_containers")
    .delete()
    .eq("battlemap_id", battlemapId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}

export type ContainerTrapProximityResult =
  | { kind: "none" }
  | {
      kind: "detected";
      container: SessionBattlemapContainer;
      trap: SessionBattlemapTrap;
      passivePerception: number;
      characterName: string;
      source: "passive";
    };

/** Passive Erkennung der Container-Falle in Nähe. */
export async function checkContainerTrapsOnProximity(input: {
  sessionId: string;
  battlemapId: string;
  characterId: string;
  gridX: number;
  gridY: number;
}): Promise<ContainerTrapProximityResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { passivePerception, characterName } = await loadPassivePerception(
    supabase,
    input.characterId,
  );

  const { data: rows, error } = await (supabase as any)
    .from("session_battlemap_containers")
    .select("*")
    .eq("battlemap_id", input.battlemapId)
    .eq("session_id", input.sessionId)
    .eq("has_trap", true);
  if (error) throw new Error(error.message);

  for (const row of (rows ?? []) as Record<string, unknown>[]) {
    const container = normalizeContainer(row);
    if (!containerTrapActive(container) || container.is_trap_detected) continue;
    const virtualTrap = containerToVirtualTrap(container);
    if (!virtualTrap) continue;
    const dist = chebyshevDistance(
      input.gridX,
      input.gridY,
      container.grid_x,
      container.grid_y,
    );
    if (dist === 0) continue;
    if (
      canPassivelyDetectTrapAtDistance(
        virtualTrap,
        input.gridX,
        input.gridY,
        passivePerception,
      )
    ) {
      const updated = await markContainerTrapDetected(
        supabase,
        container,
        input.sessionId,
        characterName,
        "passive",
      );
      const trap = containerToVirtualTrap(updated);
      if (!trap) return { kind: "none" };
      return {
        kind: "detected",
        container: updated,
        trap,
        passivePerception,
        characterName,
        source: "passive",
      };
    }
  }
  return { kind: "none" };
}

export async function markContainerTrapDiscovered(input: {
  sessionId: string;
  containerId: string;
  characterName?: string;
}): Promise<SessionBattlemapContainer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const container = await loadContainerRow(supabase, input.containerId, input.sessionId);
  if (!container.has_trap || container.is_trap_detected) return container;

  return markContainerTrapDetected(
    supabase,
    container,
    input.sessionId,
    input.characterName?.trim() || "Die Gruppe",
    "gm",
  );
}

export type ContainerTrapTriggerResult = {
  container: SessionBattlemapContainer;
  trap: SessionBattlemapTrap;
  characterName: string;
  characterId: string;
  passivePerception: number;
};

export async function triggerContainerTrapManually(input: {
  sessionId: string;
  containerId: string;
  characterId?: string | null;
  characterName?: string;
}): Promise<ContainerTrapTriggerResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const container = await loadContainerRow(supabase, input.containerId, input.sessionId);
  if (!containerTrapActive(container)) {
    throw new Error("Diese Container-Falle kann nicht ausgelöst werden.");
  }

  const characterId = input.characterId?.trim() || "";
  let characterName = input.characterName?.trim() || "Die Gruppe";
  let passivePerception = 10;
  if (characterId) {
    const pp = await loadPassivePerception(supabase, characterId);
    characterName = pp.characterName;
    passivePerception = pp.passivePerception;
  }

  const updated = await triggerContainerTrapInternal(
    supabase,
    container,
    input.sessionId,
    characterId,
    characterName,
  );
  const trap = containerToVirtualTrap(updated);
  if (!trap) throw new Error("Trap-Konfiguration fehlt.");
  return {
    container: updated,
    trap,
    characterName,
    characterId: characterId || "",
    passivePerception,
  };
}

export async function resolveContainerTrapTrigger(input: {
  sessionId: string;
  containerId: string;
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

export type ContainerOpenResult =
  | { kind: "opened"; container: SessionBattlemapContainer }
  | { kind: "trap_triggered"; container: SessionBattlemapContainer; trap: SessionBattlemapTrap; characterName: string; characterId: string; passivePerception: number };

async function unsafeContainerAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  container: SessionBattlemapContainer,
  sessionId: string,
  characterId: string,
): Promise<ContainerOpenResult> {
  const { passivePerception, characterName } = await loadPassivePerception(
    supabase,
    characterId,
  );
  if (containerTrapActive(container)) {
    const updated = await triggerContainerTrapInternal(
      supabase,
      container,
      sessionId,
      characterId,
      characterName,
    );
    const trap = containerToVirtualTrap(updated);
    if (!trap) throw new Error("Trap-Konfiguration fehlt.");
    return {
      kind: "trap_triggered",
      container: updated,
      trap,
      characterName,
      characterId,
      passivePerception,
    };
  }
  const { data, error } = await (supabase as any)
    .from("session_battlemap_containers")
    .update({
      is_open: true,
      is_locked: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", container.id)
    .eq("session_id", sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { kind: "opened", container: normalizeContainer(data as Record<string, unknown>) };
}

/** Schloss knacken — triggert Falle wenn nicht entschärft/entdeckt. */
export async function attemptContainerPickLock(input: {
  sessionId: string;
  containerId: string;
  characterId: string;
}): Promise<ContainerOpenResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const container = await loadContainerRow(supabase, input.containerId, input.sessionId);
  if (container.is_open) throw new Error("Behälter ist bereits offen.");
  if (!container.is_locked) {
    return unsafeContainerAction(supabase, container, input.sessionId, input.characterId);
  }
  if (containerTrapActive(container) && !container.is_trap_disarmed) {
    return unsafeContainerAction(supabase, container, input.sessionId, input.characterId);
  }
  return unsafeContainerAction(supabase, container, input.sessionId, input.characterId);
}

/** Gewaltsam öffnen — triggert Falle wenn nicht entschärft. */
export async function attemptContainerForceOpen(input: {
  sessionId: string;
  containerId: string;
  characterId: string;
}): Promise<ContainerOpenResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const container = await loadContainerRow(supabase, input.containerId, input.sessionId);
  if (container.is_open) throw new Error("Behälter ist bereits offen.");
  if (containerTrapActive(container) && !container.is_trap_disarmed) {
    return unsafeContainerAction(supabase, container, input.sessionId, input.characterId);
  }
  return unsafeContainerAction(supabase, container, input.sessionId, input.characterId);
}

/** Sicheres Öffnen nach Entschärfung (oder ohne Falle). */
export async function openBattlemapContainer(input: {
  sessionId: string;
  containerId: string;
  characterId: string;
}): Promise<SessionBattlemapContainer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const container = await loadContainerRow(supabase, input.containerId, input.sessionId);
  if (container.is_open) return container;
  if (containerTrapActive(container) && !container.is_trap_disarmed) {
    throw new Error("Falle muss zuerst entschärft werden.");
  }

  const { data, error } = await (supabase as any)
    .from("session_battlemap_containers")
    .update({
      is_open: true,
      is_locked: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", container.id)
    .eq("session_id", input.sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeContainer(data as Record<string, unknown>);
}

/** Container-Falle: Entschärfungs-Session öffnen. */
export async function openContainerTrapDisarmSession(input: {
  sessionId: string;
  containerId: string;
  characterId: string;
}): Promise<SessionBattlemapContainer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  await assertContainerDisarmAccess(
    supabase,
    input.sessionId,
    user.id,
    input.characterId,
  );

  const container = await loadContainerRow(supabase, input.containerId, input.sessionId);
  if (
    !container.has_trap ||
    !container.is_trap_detected ||
    container.is_trap_triggered ||
    container.is_trap_disarmed
  ) {
    throw new Error("Diese Falle kann nicht entschärft werden.");
  }

  const virtualTrap = containerToVirtualTrap(container);
  const existing = virtualTrap ? trapDisarmPending(virtualTrap) : null;
  if (existing?.status === "player_submitted") return container;
  if (existing?.status === "in_progress" && existing.characterId === input.characterId) {
    return container;
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

  return updateContainerAiPayload(supabase, container, input.sessionId, { disarm });
}

export async function updateContainerTrapDisarmDraft(input: {
  sessionId: string;
  containerId: string;
  characterId: string;
  draft: TrapDisarmDraftInput;
}): Promise<SessionBattlemapContainer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { isGm } = await assertContainerDisarmAccess(
    supabase,
    input.sessionId,
    user.id,
    input.characterId,
  );

  const container = await loadContainerRow(supabase, input.containerId, input.sessionId);
  const virtualTrap = containerToVirtualTrap(container);
  const pending = virtualTrap ? trapDisarmPending(virtualTrap) : null;
  if (!pending || pending.status !== "in_progress") {
    throw new Error("Keine aktive Entschärfungs-Session.");
  }
  if (pending.characterId !== input.characterId) {
    throw new Error("Falscher Charakter für diese Entschärfung.");
  }

  const gmTakeover = input.draft.gmTakeover === true;
  if (gmTakeover && !isGm) throw new Error("Nur der SL kann die Übernahme aktivieren.");

  const disarm: TrapDisarmPending = {
    ...pending,
    ...input.draft,
    status: "in_progress",
    gmTakeover,
  };

  return updateContainerAiPayload(supabase, container, input.sessionId, { disarm });
}

export async function closeContainerTrapDisarmSession(input: {
  sessionId: string;
  containerId: string;
  characterId: string;
}): Promise<SessionBattlemapContainer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  await assertContainerDisarmAccess(
    supabase,
    input.sessionId,
    user.id,
    input.characterId,
  );

  const container = await loadContainerRow(supabase, input.containerId, input.sessionId);
  const virtualTrap = containerToVirtualTrap(container);
  const pending = virtualTrap ? trapDisarmPending(virtualTrap) : null;
  if (!pending || pending.status !== "in_progress") return container;
  if (pending.characterId !== input.characterId) {
    throw new Error("Falscher Charakter für diese Entschärfung.");
  }

  return updateContainerAiPayload(supabase, container, input.sessionId, { disarm: null });
}

export async function submitContainerTrapDisarmAttempt(input: {
  sessionId: string;
  containerId: string;
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
}): Promise<SessionBattlemapContainer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { isGm } = await assertContainerDisarmAccess(
    supabase,
    input.sessionId,
    user.id,
    input.characterId,
  );

  const container = await loadContainerRow(supabase, input.containerId, input.sessionId);
  if (
    !container.has_trap ||
    !container.is_trap_detected ||
    container.is_trap_triggered ||
    container.is_trap_disarmed
  ) {
    throw new Error("Diese Falle kann nicht entschärft werden.");
  }

  const virtualTrap = containerToVirtualTrap(container);
  const pending = virtualTrap ? trapDisarmPending(virtualTrap) : null;
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

  return updateContainerAiPayload(supabase, container, input.sessionId, { disarm });
}

export async function confirmContainerTrapDisarm(input: {
  sessionId: string;
  containerId: string;
  approved: boolean;
}): Promise<SessionBattlemapContainer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertSessionGm(input.sessionId, user.id);

  const container = await loadContainerRow(supabase, input.containerId, input.sessionId);
  const virtualTrap = containerToVirtualTrap(container);
  const pending = virtualTrap ? trapDisarmPending(virtualTrap) : null;
  if (!pending || pending.status !== "player_submitted") {
    throw new Error("Kein ausstehender Entschärfungsversuch.");
  }

  if (!input.approved) {
    return updateContainerAiPayload(supabase, container, input.sessionId, { disarm: null });
  }

  if (!pending.playerClaimsSuccess) {
    throw new Error("Spieler hat keinen erfolgreichen Versuch gemeldet.");
  }

  const { data, error } = await (supabase as any)
    .from("session_battlemap_containers")
    .update({
      is_trap_disarmed: true,
      ai_payload: { ...(container.ai_payload ?? {}), disarm: null },
      updated_at: new Date().toISOString(),
    })
    .eq("id", container.id)
    .eq("session_id", input.sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeContainer(data as Record<string, unknown>);
}
