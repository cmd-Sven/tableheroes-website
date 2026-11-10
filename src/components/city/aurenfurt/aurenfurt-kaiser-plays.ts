/**
 * Kaiser-Plays → Pressure-Events (dünnes Modul ohne NPC-/History-Zyklus).
 */

import type { CitySimEvent } from "./aurenfurt-pressure";
import { kaiserCardToCityEffects } from "./aurenfurt-kaiser-cards";
import {
  getActiveKaiserPlays,
  pruneExpiredKaiserPlays,
  remainingDaysForPlay,
  resolveKaiserEventCard,
} from "./aurenfurt-verwaltung-store";
import { parseDay } from "./aurenfurt-time";

export function kaiserPlaysAsEvents(dayIso: string): CitySimEvent[] {
  pruneExpiredKaiserPlays(dayIso);
  const events: CitySimEvent[] = [];
  for (const play of getActiveKaiserPlays()) {
    if (remainingDaysForPlay(play, dayIso) <= 0) continue;
    const card = resolveKaiserEventCard(play.cardId);
    if (!card) continue;
    const mapped = kaiserCardToCityEffects(card, play.districtId);
    events.push({
      id: play.playId,
      title: card.title,
      body: card.description,
      imageUrl: card.imageUrl?.trim() ? card.imageUrl.trim() : null,
      scope: mapped.scope,
      districtId: mapped.districtId,
      sectorLabel: null,
      effects: mapped.effects,
      durationDays: card.durationDays,
      startOn: parseDay(play.startedOn),
      endWhen: null,
      active: true,
    });
  }
  return events;
}

/** Tägliche GP aus aktiven Kaiser-Anleihen (Stadtweite Kasse). */
export function kaiserTreasuryIncomeOn(dayIso: string): { income: number; titles: string[] } {
  pruneExpiredKaiserPlays(dayIso);
  let income = 0;
  const titles: string[] = [];
  for (const play of getActiveKaiserPlays()) {
    if (remainingDaysForPlay(play, dayIso) <= 0) continue;
    const card = resolveKaiserEventCard(play.cardId);
    const daily = card?.treasuryIncomePerDay ?? 0;
    if (!card || daily <= 0) continue;
    income += daily;
    titles.push(card.title);
  }
  return { income, titles };
}
