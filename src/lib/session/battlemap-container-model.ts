import type {
  BattlemapContainerType,
  BattlemapTrapDifficulty,
  BattlemapTrapEffectShape,
  SessionBattlemapContainer,
  SessionBattlemapTrap,
} from "@/src/lib/session/battlemap-types";
import { parseTrapStatusEffect } from "@/src/lib/characters/condition-tokens";
import {
  parseTrapAiPayload,
  trapDisarmPending,
  type TrapComponent,
  type TrapDisarmPending,
} from "@/src/lib/session/battlemap-trap-model";
import { chebyshevDistance } from "@/src/lib/session/battlemap-trap-geometry";

/** Eingebettete Falle in einem Behälter (trap_config JSONB). */
export type ContainerTrapConfig = {
  name: string;
  description: string;
  trap_type: string;
  difficulty: BattlemapTrapDifficulty;
  detection_dc: number;
  is_area_effect: boolean;
  effect_shape: BattlemapTrapEffectShape;
  effect_radius: number;
  damage: string;
  damage_type: string;
  save_ability: string | null;
  save_dc: number | null;
  status_effect: string | null;
  components?: TrapComponent[];
};

export const CONTAINER_TYPE_LABELS: Record<BattlemapContainerType, string> = {
  chest: "Kiste",
  barrel: "Fass",
  crate: "Kiste (Holz)",
  urn: "Urne",
  sarcophagus: "Sarkophag",
  other: "Behälter",
};

/** Standard-SG für gewaltsames Öffnen je Behältertyp. */
export const DEFAULT_FORCE_OPEN_DC: Record<BattlemapContainerType, number> = {
  chest: 15,
  barrel: 10,
  crate: 12,
  urn: 8,
  sarcophagus: 18,
  other: 12,
};

export function defaultForceOpenDc(type: BattlemapContainerType): number {
  return DEFAULT_FORCE_OPEN_DC[type] ?? 12;
}

export function parseContainerTrapConfig(
  raw: Record<string, unknown> | null | undefined,
): ContainerTrapConfig {
  const difficultyRaw = String(raw?.difficulty ?? "medium");
  const difficulty: BattlemapTrapDifficulty =
    difficultyRaw === "easy" ||
    difficultyRaw === "hard" ||
    difficultyRaw === "deadly"
      ? difficultyRaw
      : "medium";
  const shapeRaw = String(raw?.effect_shape ?? "circle");
  const effect_shape: BattlemapTrapEffectShape =
    shapeRaw === "rect" ? "rect" : "circle";
  return {
    name: String(raw?.name ?? "Falle"),
    description: String(raw?.description ?? ""),
    trap_type: String(raw?.trap_type ?? "mechanical"),
    difficulty,
    detection_dc: Math.max(1, Math.min(40, Math.round(Number(raw?.detection_dc ?? 15)))),
    is_area_effect: raw?.is_area_effect === true,
    effect_shape,
    effect_radius: Math.max(1, Math.min(20, Math.round(Number(raw?.effect_radius ?? 1)))),
    damage: String(raw?.damage ?? "2d6"),
    damage_type: String(raw?.damage_type ?? "piercing"),
    save_ability: raw?.save_ability != null ? String(raw.save_ability) : null,
    save_dc:
      raw?.save_dc != null && raw?.save_dc !== ""
        ? Math.round(Number(raw.save_dc))
        : null,
    status_effect: parseTrapStatusEffect(raw?.status_effect),
    components: Array.isArray(raw?.components)
      ? (raw.components as TrapComponent[])
      : undefined,
  };
}

export function containerHasTrap(container: SessionBattlemapContainer): boolean {
  return container.has_trap === true;
}

export function containerTrapActive(container: SessionBattlemapContainer): boolean {
  return (
    containerHasTrap(container) &&
    !container.is_trap_disarmed &&
    !container.is_trap_triggered
  );
}

export function containerTrapDisarmPending(
  container: SessionBattlemapContainer,
): TrapDisarmPending | null {
  const payload = parseTrapAiPayload(container.ai_payload);
  return trapDisarmPending({ ai_payload: payload } as SessionBattlemapTrap);
}

/** Virtuelle Falle für TrapDisarmModal / TrapTriggerModal. */
export function containerToVirtualTrap(
  container: SessionBattlemapContainer,
): SessionBattlemapTrap | null {
  if (!containerHasTrap(container)) return null;
  const trapConfig = parseContainerTrapConfig(container.trap_config);
  const payload = parseTrapAiPayload(container.ai_payload);
  return {
    id: container.id,
    battlemap_id: container.battlemap_id,
    session_id: container.session_id,
    campaign_id: container.campaign_id,
    name: trapConfig.name,
    description: trapConfig.description,
    trap_type: trapConfig.trap_type,
    difficulty: trapConfig.difficulty,
    grid_x: container.grid_x,
    grid_y: container.grid_y,
    detection_dc: trapConfig.detection_dc,
    is_area_effect: trapConfig.is_area_effect,
    effect_shape: trapConfig.effect_shape,
    effect_radius: trapConfig.effect_radius,
    damage: trapConfig.damage,
    damage_type: trapConfig.damage_type,
    save_ability: trapConfig.save_ability,
    save_dc: trapConfig.save_dc,
    status_effect: trapConfig.status_effect,
    is_armed: containerTrapActive(container),
    is_detected: container.is_trap_detected,
    is_triggered: container.is_trap_triggered,
    is_disarmed: container.is_trap_disarmed,
    is_visible_to_players: container.trap_visible_to_players,
    triggered_by_character_id: container.trap_triggered_by_character_id,
    triggered_at: container.trap_triggered_at,
    lore_context: container.lore_context,
    ai_payload: payload as Record<string, unknown>,
  };
}

export function isAdjacentToContainer(
  container: Pick<SessionBattlemapContainer, "grid_x" | "grid_y">,
  gridX: number,
  gridY: number,
  maxCells = 1,
): boolean {
  return chebyshevDistance(gridX, gridY, container.grid_x, container.grid_y) <= maxCells;
}

export function isContainerTrapDisarmableByPlayerAt(
  container: SessionBattlemapContainer,
  gridX: number,
  gridY: number,
): boolean {
  return (
    containerTrapActive(container) &&
    container.is_trap_detected &&
    container.trap_visible_to_players &&
    !container.is_trap_triggered &&
    !container.is_trap_disarmed &&
    isAdjacentToContainer(container, gridX, gridY)
  );
}

export function findAdjacentInteractableContainers(
  containers: SessionBattlemapContainer[],
  gridX: number,
  gridY: number,
): SessionBattlemapContainer[] {
  return containers.filter((c) => {
    if (!isAdjacentToContainer(c, gridX, gridY)) return false;
    if (c.is_open) return false;
    if (c.is_hidden && !c.is_discovered) return false;
    return true;
  });
}

export function findAdjacentDisarmableContainerTraps(
  containers: SessionBattlemapContainer[],
  gridX: number,
  gridY: number,
): SessionBattlemapContainer[] {
  return containers.filter((c) => isContainerTrapDisarmableByPlayerAt(c, gridX, gridY));
}

export function canOpenContainer(container: SessionBattlemapContainer): boolean {
  if (container.is_open) return false;
  if (containerTrapActive(container) && !container.is_trap_disarmed) return false;
  return true;
}

export function containerTrapWouldTriggerOnUnsafeAction(
  container: SessionBattlemapContainer,
): boolean {
  return containerTrapActive(container);
}

/** Spieler sehen sichtbare Behälter oder entdeckte Versteckte. */
export function isContainerVisibleToPlayers(
  container: Pick<SessionBattlemapContainer, "is_hidden" | "is_discovered" | "is_open">,
): boolean {
  if (container.is_open) return true;
  if (!container.is_hidden) return true;
  return container.is_discovered === true;
}

/** Passive Perception nur bei versteckten, noch nicht entdeckten Behältern. */
export function canPassivelyDiscoverHiddenContainer(
  container: Pick<
    SessionBattlemapContainer,
    "is_hidden" | "is_discovered" | "detection_dc" | "grid_x" | "grid_y"
  >,
  gridX: number,
  gridY: number,
  passivePerception: number,
): boolean {
  if (!container.is_hidden || container.is_discovered) return false;
  if (!isAdjacentToContainer(container, gridX, gridY)) return false;
  return passivePerception >= Math.max(1, container.detection_dc ?? 15);
}
