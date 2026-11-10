/**
 * Herrschende / präsente Fraktionen an öffentlichen POIs (kein Betreiber-NPC).
 * Märkte können mehrere Fraktionen tragen (Stände, Standgelder, Schattenhandel).
 */

import type { CityDistrictId } from "./aurenfurt-districts";
import {
  factionName,
  isCityFactionId,
  type FactionId,
} from "./aurenfurt-factions";
import type { AurenfurtMapPoi, PoiKind } from "./aurenfurt-map-pois";

export type PoiFactionPresence = {
  id: FactionId;
  name: string;
  /** Kurz: warum die Fraktion hier sichtbar ist. */
  note: string;
};

/** Feste Zuordnung für bekannte öffentliche Orte (Name, case-insensitive). */
const POI_FACTION_BY_NAME: Record<string, Array<{ id: FactionId; note: string }>> = {
  "der große marktplatz": [
    { id: "haus-der-seide", note: "Standgelder & Handelsaufsicht" },
    { id: "goldkelchen", note: "Gaukler- und Infostände" },
    { id: "rotes-auge", note: "Schattenstände & Hehlerware" },
  ],
  "der kupfermarkt": [
    { id: "zunftbund", note: "Handwerksstände" },
    { id: "haus-der-seide", note: "Zwischenhandel & Zölle" },
  ],
  "der seidenmarkt": [
    { id: "haus-der-seide", note: "Luxusware & Salonzufuhr" },
    { id: "haeuser-des-nordens", note: "Adelige Käufermacht" },
  ],
  "der runenmarkt": [
    { id: "zirkel-observatorium", note: "Schrift, Artefakte, Wissen" },
    { id: "haus-der-seide", note: "Seltene Importe" },
  ],
  "der geizhof": [
    { id: "zunftbund", note: "Hof der kleinen Meister" },
    { id: "haus-der-seide", note: "Kredit und Ware" },
  ],
  "brunnen der elysia": [{ id: "bund-silberne-rose", note: "Heiliger Ort der Elysia" }],
  "der schicksalsbrunnen": [
    { id: "bund-silberne-rose", note: "Wallfahrt & Almosen" },
    { id: "konklave-ewige-ordnung", note: "Chromus-Aufsicht" },
  ],
  "der lustige vagabund": [{ id: "goldkelchen", note: "Barden & Gaukler am Brunnen" }],
  "die heldenterasse": [
    { id: "zirkel-observatorium", note: "Akademie-Prestige" },
    { id: "stadtwachen", note: "Ordnung am Platz" },
  ],
  "statue der elysia": [{ id: "bund-silberne-rose", note: "Andachtsort" }],
  "chrmusstatue in der unterstadt": [
    { id: "konklave-ewige-ordnung", note: "Chromus-Präsenz" },
    { id: "rotes-auge", note: "Unterstadt-Spannung" },
  ],
  "kapelle von chromus": [{ id: "konklave-ewige-ordnung", note: "Kultort" }],
  "rosenkapelle von elysia": [{ id: "bund-silberne-rose", note: "Rosenkapelle" }],
  "die heiligen bäume der elysia": [{ id: "bund-silberne-rose", note: "Heiliger Hain" }],
  "die dunklen gärten": [
    { id: "haeuser-des-nordens", note: "Private Parks der Häuser" },
    { id: "bund-silberne-rose", note: "Heimliche Andacht" },
  ],
  "die verlorene gasse": [{ id: "rotes-auge", note: "Schattenpfad der Unterstadt" }],
  "elysische obdachlosenzuflucht": [{ id: "bund-silberne-rose", note: "Zuflucht & Almosen" }],
};

const DISTRICT_DEFAULT: Partial<Record<CityDistrictId, FactionId[]>> = {
  unterstadt: ["rotes-auge", "haus-der-seide", "goldkelchen"],
  handwerkerviertel: ["zunftbund", "haus-der-seide"],
  adelsviertel: ["haeuser-des-nordens", "haus-der-seide"],
  tempelbezirk: ["bund-silberne-rose", "konklave-ewige-ordnung"],
  akademieviertel: ["zirkel-observatorium", "stadtwachen"],
  palast: ["haeuser-des-nordens", "stadtwachen"],
  suedtor: ["stadtwachen", "zunftbund"],
};

/** POI-Arten ohne festen Inhaber-NPC — Fraktion(en) statt Portrait. */
export function poiShowsFactionsNotNpc(kind: PoiKind): boolean {
  return kind !== "Laden/Geschäft";
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function toPresence(entries: Array<{ id: FactionId; note: string }>): PoiFactionPresence[] {
  const seen = new Set<string>();
  const out: PoiFactionPresence[] = [];
  for (const entry of entries) {
    if (!isCityFactionId(entry.id) || seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push({ id: entry.id, name: factionName(entry.id), note: entry.note });
  }
  return out;
}

/**
 * Fraktionen, die an diesem POI „regieren“ bzw. sichtbar Stände/Präsenz haben.
 * Für Laden/Geschäft leer — dort gilt der verknüpfte Händler-NPC.
 */
export function rulingFactionsForPoi(poi: AurenfurtMapPoi | null | undefined): PoiFactionPresence[] {
  if (!poi || !poiShowsFactionsNotNpc(poi.kind)) return [];

  const byName = POI_FACTION_BY_NAME[normalizeName(poi.name)];
  if (byName?.length) return toPresence(byName);

  const name = normalizeName(poi.name);

  if (/markt|geizhof/.test(name) || poi.kind === "Platz") {
    const defaults = DISTRICT_DEFAULT[poi.districtId] ?? [];
    if (/markt/.test(name)) {
      const marketBias: FactionId[] =
        poi.districtId === "unterstadt"
          ? ["haus-der-seide", "goldkelchen", "rotes-auge"]
          : poi.districtId === "handwerkerviertel"
            ? ["zunftbund", "haus-der-seide"]
            : poi.districtId === "adelsviertel"
              ? ["haus-der-seide", "haeuser-des-nordens"]
              : poi.districtId === "akademieviertel"
                ? ["zirkel-observatorium", "haus-der-seide"]
                : defaults;
      return toPresence(marketBias.map((id) => ({ id, note: "Marktpräsenz / Stände" })));
    }
    return toPresence(
      defaults.slice(0, 2).map((id) => ({ id, note: "Ortsherrschaft im Viertel" })),
    );
  }

  if (/elysia|rose/.test(name)) {
    return toPresence([{ id: "bund-silberne-rose", note: "Elysia-Bezug" }]);
  }
  if (/chromus|chrmus|konklave/.test(name)) {
    return toPresence([{ id: "konklave-ewige-ordnung", note: "Chromus-Bezug" }]);
  }
  if (poi.kind === "Brunnen" || poi.kind === "Statue" || poi.kind === "Denkmal") {
    const defaults = DISTRICT_DEFAULT[poi.districtId] ?? ["stadtwachen"];
    return toPresence([{ id: defaults[0]!, note: "Öffentlicher Ort" }]);
  }
  if (poi.kind === "Parkanlage") {
    const defaults = DISTRICT_DEFAULT[poi.districtId] ?? [];
    return toPresence(
      defaults.slice(0, 2).map((id) => ({ id, note: "Geländepräsenz" })),
    );
  }

  const defaults = DISTRICT_DEFAULT[poi.districtId] ?? [];
  return toPresence(
    defaults.slice(0, 2).map((id) => ({ id, note: "Dominanz im Viertel" })),
  );
}
