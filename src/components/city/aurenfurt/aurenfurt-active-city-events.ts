/**
 * Aktive Stadt-Ereigniskarten (city_sim_events + Kaiser-Plays),
 * die am Betrachtungsdatum noch wirken.
 */

import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { cityPressureEvents } from "./aurenfurt-city-sim";
import { kaiserPlaysAsEvents } from "./aurenfurt-kaiser-plays";
import type { CitySimEvent } from "./aurenfurt-pressure";
import { parseDay } from "./aurenfurt-time";

const DAY_MS = 86_400_000;

export type ActiveCityCardEffect = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  scope: "city" | "district" | "sector";
  districtId: CityDistrictId | null;
  sectorLabel: string | null;
  effects: CitySimEvent["effects"];
  durationDays: number | null;
  startOn: number;
  endMs: number;
  source: "city-sim" | "kaiser";
};

function affectedDistricts(event: Pick<CitySimEvent, "scope" | "districtId">): CityDistrictId[] {
  if (event.scope === "city") return AURENFURT_DISTRICTS.map((d) => d.id);
  if (event.districtId && AURENFURT_DISTRICTS.some((d) => d.id === event.districtId)) {
    return [event.districtId];
  }
  return [];
}

function isLingeringOnDay(event: CitySimEvent, dayMs: number): boolean {
  if (!event.active || event.effects.length === 0) return false;
  if (!Number.isFinite(event.startOn) || dayMs < event.startOn) return false;
  const days = event.durationDays ?? 30;
  const endMs = event.startOn + days * DAY_MS;
  return dayMs < endMs;
}

function toActive(
  event: CitySimEvent,
  source: ActiveCityCardEffect["source"],
): ActiveCityCardEffect | null {
  const districts = affectedDistricts(event);
  if (districts.length === 0) return null;
  const days = event.durationDays ?? 30;
  return {
    id: event.id,
    title: event.title,
    body: event.body,
    imageUrl: event.imageUrl,
    scope: event.scope,
    districtId: event.districtId,
    sectorLabel: event.sectorLabel,
    effects: event.effects,
    durationDays: event.durationDays,
    startOn: event.startOn,
    endMs: event.startOn + days * DAY_MS,
    source,
  };
}

/** Alle noch wirkenden Stadt-/Kaiser-Ereigniskarten am Kalendertag. */
export function listActiveCityCardEffects(dayIso: string): ActiveCityCardEffect[] {
  const dayMs = parseDay(dayIso);
  if (!Number.isFinite(dayMs)) return [];

  const out: ActiveCityCardEffect[] = [];
  const seen = new Set<string>();

  for (const event of cityPressureEvents()) {
    if (!isLingeringOnDay(event, dayMs)) continue;
    const mapped = toActive(event, "city-sim");
    if (!mapped || seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    out.push(mapped);
  }

  for (const event of kaiserPlaysAsEvents(dayIso)) {
    if (!isLingeringOnDay(event, dayMs)) continue;
    const mapped = toActive(event, "kaiser");
    if (!mapped || seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    out.push(mapped);
  }

  return out;
}

/** Viertel → aktive Karten, die dieses Viertel beeinflussen. */
export function activeCityCardsByDistrict(
  dayIso: string,
): Map<CityDistrictId, ActiveCityCardEffect[]> {
  const map = new Map<CityDistrictId, ActiveCityCardEffect[]>();
  for (const district of AURENFURT_DISTRICTS) map.set(district.id, []);

  for (const card of listActiveCityCardEffects(dayIso)) {
    for (const districtId of affectedDistricts(card)) {
      map.get(districtId)?.push(card);
    }
  }
  return map;
}

export function districtsAffectedByCard(card: ActiveCityCardEffect): CityDistrictId[] {
  return affectedDistricts(card);
}

/** Anker-Viertel für den Blitz-Marker (Stadt → Palast als Zentrum). */
export function markerDistrictForCard(card: ActiveCityCardEffect): CityDistrictId | null {
  if (card.scope === "city") return "palast";
  if (card.districtId && AURENFURT_DISTRICTS.some((d) => d.id === card.districtId)) {
    return card.districtId;
  }
  return null;
}
