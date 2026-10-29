/**
 * Tageswerte der Stadt aus knappen Zuflüssen und dem Inhalt der Viertel.
 *
 * Vattrak kommt aus den Bergen und wird nach Priorität verteilt:
 * Adel, dann Wachen, dann zu gleichen Teilen Geistliche, Akademie und Handwerk, zuletzt Bürger.
 * Malanthir kommt als gestrecktes Schmuggelpulver herein und hält länger.
 * Es kann Vattrak ersetzen und treibt danach Kriminalität, Habgier und Untergrundzellen.
 * Die Zähler wirken erst am nächsten Tag aufeinander: der Vortag verschiebt das heutige Ziel,
 * approach zieht den Stand nur ein Stück dorthin. So entsteht ein Ausschlag ohne Schleife im selben Tag.
 * Fraktionsmacht liest die fertigen Zähler und schreibt nicht zurück.
 *
 * Aufgeteilt in aurenfurt-city-sim-{types,store,magic,meters,feedback,range}.
 * Diese Datei bleibt die öffentliche Schnittstelle.
 */

export type {
  CitySimContext,
  CitySimLive,
  HistoryShift,
  MagicBucket,
  NpcSimSnap,
  SimBuilding,
  SimPoi,
  SimStreet,
} from "./aurenfurt-city-sim-types";

export {
  bindCityBonds,
  bindCityPressure,
  bindNpcSnaps,
  buildingWeights,
  cityBonds,
  cityPressureActors,
  cityPressureEvents,
  citySimVersion,
  liveSectorCrimeDeltas,
  liveSectorFaithDeltas,
  setCitySimLive,
  simBuildingFromCity,
  subscribeCitySim,
} from "./aurenfurt-city-sim-store";

export { magicBucket, malanthirCrimePush, needsMagicSource } from "./aurenfurt-city-sim-magic";

export { applyDistrictFeedback, undergroundRoom } from "./aurenfurt-city-sim-feedback";

export { simulateCityRange } from "./aurenfurt-city-sim-range";
