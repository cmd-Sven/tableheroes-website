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
  buildContainerLootDraft,
  parseContainerLootConfig,
  type ContainerLootConfig,
} from "@/src/lib/session/battlemap-container-loot";
import {
  lootItemToJson,
  LOOT_UNIDENTIFIED_DESC_FALLBACK,
  LOOT_UNIDENTIFIED_NAME_FALLBACK,
  type LootDraftPayload,
} from "@/src/lib/loot/loot-item-model";
import {
  inferLootInventoryCategory,
  normalizeLootInventoryCategory,
} from "@/src/lib/characters/dnd5e/loot-to-inventory";
import type { Json } from "@/src/lib/database.types";
import { createSystemLog } from "@/src/lib/actions/session-system-log-actions";
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
    is_hidden: row.is_hidden === true,
    is_discovered: row.is_discovered === true,
    detection_dc: Math.max(1, Math.min(40, Math.round(Number(row.detection_dc ?? 15)))),
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
  /** Default false = sichtbar für alle. */
  isHidden?: boolean;
  detectionDc?: number;
  hasTrap?: boolean;
  trapConfig?: Partial<ContainerTrapConfig>;
  loreContext?: string | null;
  aiPayload?: Record<string, unknown>;
  /** Loot-Konfiguration (wird unter ai_payload.loot gespeichert) */
  loot?: ContainerLootConfig | null;
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

  const basePayload = { ...(input.aiPayload ?? {}) };
  if (input.loot) {
    basePayload.loot = {
      lootMode: input.loot.lootMode,
      lootPreset: input.loot.lootPreset,
      lootItems: input.loot.lootItems,
      goldGp: input.loot.goldGp,
      resolvedItems: input.loot.resolvedItems,
      lootPublished: false,
      lootStageId: null,
    };
  }

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
      is_hidden: input.isHidden === true,
      is_discovered: false,
      detection_dc: Math.max(
        1,
        Math.min(40, Math.round(input.detectionDc ?? 15)),
      ),
      has_trap: input.hasTrap === true,
      trap_config: trapConfig,
      lore_context: input.loreContext ?? null,
      ai_payload: basePayload,
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

async function markContainerDiscoveredInternal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  container: SessionBattlemapContainer,
  sessionId: string,
  characterName: string,
  source: "passive" | "gm",
): Promise<SessionBattlemapContainer> {
  const { data, error } = await (supabase as any)
    .from("session_battlemap_containers")
    .update({
      is_discovered: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", container.id)
    .eq("session_id", sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const updated = normalizeContainer(data as Record<string, unknown>);
  try {
    await appendSessionActivity({
      sessionId,
      text: `${characterName} entdeckt versteckten Behälter „${container.name}“ (${source === "passive" ? "passiv" : "SL"}).`,
      type: "container_discovered",
      meta: { container_id: container.id, source },
    });
  } catch {
    /* optional */
  }
  return updated;
}

export type HiddenContainerProximityResult =
  | { kind: "none" }
  | {
      kind: "discovered";
      container: SessionBattlemapContainer;
      passivePerception: number;
      characterName: string;
      source: "passive";
    };

/** Passive Perception: nur versteckte, unentdeckte Behälter in Nachbarschaft. */
export async function checkHiddenContainersOnProximity(input: {
  sessionId: string;
  battlemapId: string;
  characterId: string;
  gridX: number;
  gridY: number;
}): Promise<HiddenContainerProximityResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { passivePerception, characterName } = await loadPassivePerception(
    supabase,
    input.characterId,
  );

  const { data: discoveredId, error: rpcErr } = await (supabase as any).rpc(
    "discover_hidden_battlemap_container_near",
    {
      p_session_id: input.sessionId,
      p_battlemap_id: input.battlemapId,
      p_grid_x: input.gridX,
      p_grid_y: input.gridY,
      p_passive_perception: passivePerception,
    },
  );
  if (rpcErr) throw new Error(rpcErr.message);
  if (!discoveredId) return { kind: "none" };

  const container = await loadContainerRow(
    supabase,
    String(discoveredId),
    input.sessionId,
  );

  try {
    await appendSessionActivity({
      sessionId: input.sessionId,
      text: `${characterName} entdeckt versteckten Behälter „${container.name}“ (passiv, PP ${passivePerception}).`,
      type: "container_discovered",
      meta: { container_id: container.id, source: "passive" },
    });
  } catch {
    /* optional */
  }

  return {
    kind: "discovered",
    container,
    passivePerception,
    characterName,
    source: "passive",
  };
}

/** SL markiert versteckten Behälter als entdeckt. */
export async function markContainerDiscovered(input: {
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
  if (!container.is_hidden || container.is_discovered) return container;

  return markContainerDiscoveredInternal(
    supabase,
    container,
    input.sessionId,
    input.characterName?.trim() || "Die Gruppe",
    "gm",
  );
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

/** Nach erfolgreichem Öffnen: Inhalt persistieren und ggf. auf die Loot-Bühne legen. */
async function revealContainerLootOnOpen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  container: SessionBattlemapContainer,
  sessionId: string,
): Promise<SessionBattlemapContainer> {
  const loot = parseContainerLootConfig(container.ai_payload);
  if (loot.lootMode === "empty" || loot.lootPublished) {
    return container;
  }

  const draft = buildContainerLootDraft(container.name, loot);
  if (!draft) {
    const nextLoot: ContainerLootConfig = {
      ...loot,
      lootPublished: true,
      lootStageId: null,
    };
    return updateContainerAiPayload(supabase, container, sessionId, {
      loot: nextLoot,
    });
  }

  const lootWithResolved: ContainerLootConfig = {
    ...loot,
    resolvedItems: draft.items,
    goldGp: draft.gp,
  };

  const stageResult = await publishBattlemapContainerLootToStage(
    supabase,
    sessionId,
    container.campaign_id,
    draft,
  );

  if (!stageResult.ok) {
    const persisted = await updateContainerAiPayload(
      supabase,
      container,
      sessionId,
      { loot: lootWithResolved },
    );
    try {
      await appendSessionActivity({
        sessionId,
        text: `„${container.name}“ geöffnet — Inhalt gespeichert (${draft.items.length} Gegenstände, ${draft.gp} gp). Bühne: ${stageResult.error}`,
        type: "container_opened",
        meta: { container_id: container.id },
      });
    } catch {
      /* optional */
    }
    return persisted;
  }

  const nextLoot: ContainerLootConfig = {
    ...lootWithResolved,
    lootPublished: true,
    lootStageId: stageResult.containerId,
  };

  const updated = await updateContainerAiPayload(supabase, container, sessionId, {
    loot: nextLoot,
  });

  try {
    await appendSessionActivity({
      sessionId,
      text: `„${container.name}“ geöffnet — Beute erscheint auf der Bühne (${draft.items.length} Gegenstände${draft.gp ? `, ${draft.gp} gp` : ""}).`,
      type: "container_opened",
      meta: {
        container_id: container.id,
        loot_stage_id: stageResult.containerId,
      },
    });
  } catch {
    /* optional */
  }

  return updated;
}

/**
 * Loot-Gun-Pipeline ohne SL-Gate — Aufrufer hat bereits Session-Zugriff
 * (Behälter öffnen durch Spieler oder SL).
 */
async function publishBattlemapContainerLootToStage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  campaignId: string,
  draft: LootDraftPayload,
): Promise<{ ok: true; containerId: string } | { ok: false; error: string }> {
  try {
    const gp = Math.max(0, Math.round(draft.gp));
    const sp = Math.max(0, Math.round(draft.sp));
    const itemsJson = draft.items.map((it) => {
      const isMagical = Boolean(it.isMagical);
      const mundaneName =
        (it.mundaneName ?? "").trim() ||
        (isMagical ? LOOT_UNIDENTIFIED_NAME_FALLBACK : it.name);
      const mundaneDesc =
        (it.mundaneDesc ?? "").trim() ||
        (isMagical ? LOOT_UNIDENTIFIED_DESC_FALLBACK : it.desc);
      const inventoryCategory = normalizeLootInventoryCategory(
        it.inventoryCategory,
        inferLootInventoryCategory(it.name, it.desc, isMagical, it.kind),
      );
      return lootItemToJson({
        ...it,
        mundaneName: mundaneName.slice(0, 160),
        mundaneDesc: mundaneDesc.slice(0, 800),
        inventoryCategory,
        identified: !isMagical,
      });
    });

    const { data: ins, error: insErr } = await (supabase as any)
      .from("campaign_loot_containers")
      .insert({
        campaign_id: campaignId,
        name: draft.name.trim().slice(0, 160),
        gp_remaining: gp,
        sp_remaining: sp,
        items_json: itemsJson as unknown as Json,
        chest_opened: false,
      })
      .select("id")
      .single();

    if (insErr || !ins) {
      return { ok: false, error: insErr?.message ?? "Beute-Container konnte nicht angelegt werden." };
    }

    const containerId = String((ins as { id: string }).id);

    const { error: upErr } = await (supabase as any)
      .from("session_live_states")
      .update({ current_loot_id: containerId, loot_hide_npcs: true })
      .eq("session_id", sessionId);

    if (upErr) {
      await (supabase as any).from("campaign_loot_containers").delete().eq("id", containerId);
      return { ok: false, error: upErr.message ?? "Live-State konnte nicht verknüpft werden." };
    }

    try {
      await createSystemLog(
        sessionId,
        "loot_publish",
        `Battlemap-Behälter: „${draft.name.trim()}“ erscheint auf der Bühne (${itemsJson.length} Gegenstände${gp || sp ? `, ${gp} gp / ${sp} sp` : ""}).`,
      );
    } catch {
      /* optional */
    }

    return { ok: true, containerId };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unbekannter Fehler.",
    };
  }
}

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
  const opened = normalizeContainer(data as Record<string, unknown>);
  const withLoot = await revealContainerLootOnOpen(supabase, opened, sessionId);
  return { kind: "opened", container: withLoot };
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
  const opened = normalizeContainer(data as Record<string, unknown>);
  return revealContainerLootOnOpen(supabase, opened, input.sessionId);
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
