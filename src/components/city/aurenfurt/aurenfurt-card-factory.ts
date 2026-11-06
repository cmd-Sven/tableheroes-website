/**
 * Leichte Factory für Event-Karten/Abilities ohne Import von city-simulation-Value
 * (vermeidet Zyklus factions ↔ history ↔ content).
 */

import type { CityEventCard, NpcAbility } from "@/src/lib/npcs/city-simulation";

function freshId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeEventCard(partial: Partial<CityEventCard> & Pick<CityEventCard, "title" | "text">): CityEventCard {
  return {
    id: partial.id ?? freshId("card"),
    title: partial.title,
    text: partial.text,
    trigger: partial.trigger ?? null,
    sortOrder: partial.sortOrder ?? 0,
    durationDays: partial.durationDays,
    range: partial.range,
    sectorLabel: partial.sectorLabel ?? null,
    extraDistrictIds: partial.extraDistrictIds ?? [],
    effects: partial.effects ?? [],
  };
}

export function makeAbility(
  partial: Partial<NpcAbility> & Pick<NpcAbility, "title" | "conditions" | "effects">,
): NpcAbility {
  return {
    id: partial.id ?? freshId("ability"),
    title: partial.title,
    enabled: partial.enabled ?? true,
    roleGate: partial.roleGate ?? null,
    factionGate: partial.factionGate ?? null,
    axisGate: partial.axisGate ?? null,
    conditions: partial.conditions,
    effects: partial.effects,
    durationDays: partial.durationDays ?? 5,
    cooldownDays: partial.cooldownDays ?? 14,
    relationshipTarget: partial.relationshipTarget ?? "none",
    relationshipDelta: partial.relationshipDelta ?? 0,
    counterFactionId: partial.counterFactionId ?? null,
    counterDelayDays: partial.counterDelayDays ?? 2,
    counterDurationDays: partial.counterDurationDays ?? 3,
    counterEffects: partial.counterEffects ?? [],
  };
}

export function tierDuration(tier: string | null | undefined) {
  if (tier === "apex_global") return 14;
  if (tier === "authority_faction") return 10;
  if (tier === "regional_economy") return 7;
  return 3;
}

export function tierRange(tier: string | null | undefined): CityEventCard["range"] {
  if (tier === "apex_global") return "city";
  if (tier === "authority_faction" || tier === "regional_economy") return "adjacent";
  return "district";
}
