/**
 * Kaiser-Plays → Pressure-Events (dünnes Modul ohne NPC-/History-Zyklus).
 */

import type { CitySimEvent } from "./aurenfurt-pressure";
import { findKaiserCard, kaiserCardToCityEffects } from "./aurenfurt-kaiser-cards";
import {
  getActiveKaiserPlays,
  pruneExpiredKaiserPlays,
  remainingDaysForPlay,
} from "./aurenfurt-verwaltung-store";
import { parseDay } from "./aurenfurt-time";

export function kaiserPlaysAsEvents(dayIso: string): CitySimEvent[] {
  pruneExpiredKaiserPlays(dayIso);
  const events: CitySimEvent[] = [];
  for (const play of getActiveKaiserPlays()) {
    if (remainingDaysForPlay(play, dayIso) <= 0) continue;
    const card = findKaiserCard(play.cardId);
    if (!card) continue;
    const mapped = kaiserCardToCityEffects(card, play.districtId);
    events.push({
      id: play.playId,
      title: card.title,
      body: card.description,
      imageUrl: null,
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
