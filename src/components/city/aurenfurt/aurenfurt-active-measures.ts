/**
 * Aktive Maßnahmen am Kalendertag: Stadtereignisse, Kaiser-Befehle,
 * NPC-Karten und Automatismen (auch wenn sie durch hohe Meter gerade greifen).
 */

import { CITY_METER_LABELS, type MeterEffect, type NpcAbility } from "@/src/lib/npcs/city-simulation";
import { listActiveCityCardEffects } from "./aurenfurt-active-city-events";
import { cityPressureActors } from "./aurenfurt-city-sim";
import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { districtMetricsOn, pressureNotesOn } from "./aurenfurt-history";
import type { PressureNote } from "./aurenfurt-pressure";
import { parseDay } from "./aurenfurt-time";
import { isAutomationDisabled } from "./aurenfurt-verwaltung-store";

export type ActiveMeasureKind = PressureNote["kind"] | "kaiser";

export type ActiveMeasure = {
  id: string;
  title: string;
  detail: string;
  kind: ActiveMeasureKind;
  effectsLabel: string | null;
  /** Viertel für Kartenmarker (Heimat / Wirkungsort). */
  districtIds: CityDistrictId[];
};

/** Auf der 3D-Karte als gelbes „!“ — nicht als Blitz (das bleiben Stadt-/Kaiser-Ereignisse). */
export type ActiveMeasureMapMarker = ActiveMeasure & {
  kind: "ability" | "counter" | "npc-card";
  districtId: CityDistrictId;
};

function actorDistrictIdsFromNoteId(noteId: string): CityDistrictId[] {
  const actors = cityPressureActors();
  const actor = actors.find((entry) => noteId === entry.id || noteId.startsWith(`${entry.id}:`));
  return actor ? [actor.districtId] : [];
}

export function listActiveMeasureMapMarkers(dayIso: string): ActiveMeasureMapMarker[] {
  return listActiveMeasures(dayIso).flatMap((measure) => {
    if (measure.kind !== "ability" && measure.kind !== "counter" && measure.kind !== "npc-card") {
      return [];
    }
    const districtId = measure.districtIds[0];
    if (!districtId) return [];
    return [{ ...measure, kind: measure.kind, districtId }];
  });
}

const KIND_LABEL: Record<ActiveMeasureKind, string> = {
  ability: "Automatismus",
  counter: "Gegenreaktion",
  "npc-card": "NPC-Karte",
  "city-event": "Stadtereignis",
  kaiser: "Kaiser",
};

const KIND_ORDER: Record<ActiveMeasureKind, number> = {
  ability: 0,
  counter: 1,
  "npc-card": 2,
  kaiser: 3,
  "city-event": 4,
};

export function activeMeasureKindLabel(kind: ActiveMeasureKind) {
  return KIND_LABEL[kind];
}

type MeterSnap = Record<keyof typeof CITY_METER_LABELS, number>;

function effectsLabel(effects: MeterEffect[] | undefined | null): string | null {
  if (!effects || effects.length === 0) return null;
  return effects
    .map((effect) => {
      const label = CITY_METER_LABELS[effect.meter] ?? effect.meter;
      const sign = effect.delta > 0 ? "+" : "";
      return `${label} ${sign}${effect.delta}`;
    })
    .join(" · ");
}

function opLabel(op: "gt" | "lt" | "gte" | "lte") {
  if (op === "gte") return "≥";
  if (op === "lte") return "≤";
  if (op === "gt") return ">";
  return "<";
}

function meterMeets(
  condition: NpcAbility["conditions"][number],
  meters: MeterSnap,
) {
  const value = meters[condition.meter];
  if (condition.op === "gt") return value > condition.value;
  if (condition.op === "lt") return value < condition.value;
  if (condition.op === "gte") return value >= condition.value;
  return value <= condition.value;
}

function conditionsPass(ability: NpcAbility, meters: MeterSnap) {
  return ability.conditions.every((condition) => meterMeets(condition, meters));
}

function profileToMeters(districtId: CityDistrictId, dayMs: number): MeterSnap {
  const profile = districtMetricsOn(districtId, dayMs);
  return {
    crime: profile.crime,
    guard: profile.guard,
    vattrak: profile.vattrak,
    malanthir: profile.malanthir,
    economy: profile.economy,
    unemployment: profile.unemployment,
    refugees: profile.refugees,
    elysia: profile.elysia,
    chromus: profile.chromus,
  };
}

function abilityTriggeredSomewhere(ability: NpcAbility, dayMs: number, homeId: CityDistrictId) {
  if (ability.conditionScope === "city") {
    return AURENFURT_DISTRICTS.some((district) =>
      conditionsPass(ability, profileToMeters(district.id, dayMs)),
    );
  }
  return conditionsPass(ability, profileToMeters(homeId, dayMs));
}

function conditionDetail(ability: NpcAbility) {
  const parts = ability.conditions.map((condition) => {
    const label = CITY_METER_LABELS[condition.meter] ?? condition.meter;
    return `${label} ${opLabel(condition.op)} ${condition.value}`;
  });
  const where =
    ability.conditionScope === "city"
      ? "in betroffenen Vierteln stadtweit"
      : "im Heimatviertel";
  return parts.length > 0 ? `Greift bei ${parts.join(", ")} (${where}).` : "Automatismus aktiv.";
}

/** Alles, was am gewählten Tag wirkt oder durch Meter gerade ausgelöst ist. */
export function listActiveMeasures(dayIso: string): ActiveMeasure[] {
  const dayMs = parseDay(dayIso);
  if (!Number.isFinite(dayMs)) return [];

  const out: ActiveMeasure[] = [];
  const seen = new Set<string>();

  for (const note of pressureNotesOn(dayMs)) {
    if (seen.has(note.id)) continue;
    seen.add(note.id);
    out.push({
      id: note.id,
      title: note.title,
      detail: note.detail,
      kind: note.kind,
      effectsLabel: null,
      districtIds: actorDistrictIdsFromNoteId(note.id),
    });
  }

  // NPC-Automatismen, deren Bedingungen heute greifen (z. B. Sperrstunde bei Crime).
  for (const actor of cityPressureActors()) {
    if (!actor.alive) continue;
    for (const ability of actor.abilities) {
      if (!ability.enabled || isAutomationDisabled(actor.id, ability.id)) continue;
      if (ability.conditions.length === 0 || ability.effects.length === 0) continue;
      if (!abilityTriggeredSomewhere(ability, dayMs, actor.districtId)) continue;
      const id = `${actor.id}:${ability.id}`;
      if (seen.has(id)) {
        // Note schon da — Effekte ergänzen, falls fehlend.
        const existing = out.find((entry) => entry.id === id);
        if (existing && !existing.effectsLabel) {
          existing.effectsLabel = effectsLabel(ability.effects);
          if (!existing.detail || existing.detail === existing.title) {
            existing.detail = conditionDetail(ability);
          }
          if (existing.districtIds.length === 0) {
            existing.districtIds = [actor.districtId];
          }
        }
        continue;
      }
      seen.add(id);
      out.push({
        id,
        title: `${actor.name}: ${ability.title}`,
        detail: conditionDetail(ability),
        kind: "ability",
        effectsLabel: effectsLabel(ability.effects),
        districtIds: [actor.districtId],
      });
    }
  }

  for (const card of listActiveCityCardEffects(dayIso)) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    out.push({
      id: card.id,
      title: card.title,
      detail: card.body?.trim() || card.title,
      kind: card.source === "kaiser" ? "kaiser" : "city-event",
      effectsLabel: effectsLabel(card.effects),
      districtIds: card.districtId ? [card.districtId] : [],
    });
  }

  return out.sort((a, b) => {
    const kindDiff = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (kindDiff !== 0) return kindDiff;
    return a.title.localeCompare(b.title, "de");
  });
}
