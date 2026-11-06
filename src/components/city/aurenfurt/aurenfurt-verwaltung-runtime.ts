/**
 * Pressure-Actor-Anreicherung (für Server-Load). Kein History-Import.
 */

import type { CityActor } from "./aurenfurt-pressure";
import { enrichNpcEventContent } from "./aurenfurt-npc-event-content";
import { isAutomationDisabled } from "./aurenfurt-verwaltung-store";

export { kaiserPlaysAsEvents } from "./aurenfurt-kaiser-plays";

/** Decks/Fähigkeiten anreichern + Automations-Toggle anwenden. */
export function enrichPressureActors(
  actors: CityActor[],
  catalogByName?: Map<
    string,
    { id: string; tier: CityActor["tier"]; isLeader: boolean; factionId: string | null }
  >,
): CityActor[] {
  return actors.map((actor) => {
    const catalog = catalogByName?.get(actor.name.trim().toLowerCase());
    const enriched = enrichNpcEventContent({
      id: actor.id,
      catalogId: catalog?.id ?? null,
      name: actor.name,
      role: actor.role,
      districtId: actor.districtId,
      tier: actor.tier ?? catalog?.tier ?? null,
      isLeader:
        catalog?.isLeader ?? /anführer|hauptmann|kaiser|meister|prior|magister/i.test(actor.role),
      factionId: actor.factionId ?? catalog?.factionId ?? null,
      cards: actor.cards,
      abilities: actor.abilities,
    });

    return {
      ...actor,
      cards: enriched.cards,
      abilities: enriched.abilities.map((ability) => ({
        ...ability,
        enabled: ability.enabled && !isAutomationDisabled(actor.id, ability.id),
      })),
    };
  });
}
