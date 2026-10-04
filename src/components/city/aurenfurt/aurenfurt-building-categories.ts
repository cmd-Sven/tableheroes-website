import type { BuildingKind } from "./aurenfurt-districts";

/**
 * Festes Kategorie-Set für Aurenfurt-Kartengebäude.
 * Entspricht dem Lore-/Location-`type` beim Anlegen über den Editor.
 */
export const BUILDING_CATEGORIES = [
  "Geschäft",
  "Werkstatt",
  "Taverne",
  "Schmiede",
  "Kontor",
  "Tempel",
  "Akademie",
  "Wache",
  "Palast",
  "Wohnhaus",
  "Bibliothek",
  "Markt",
  "Lager",
  "Tor",
] as const;

export type BuildingCategory = (typeof BUILDING_CATEGORIES)[number];

export function isBuildingCategory(value: unknown): value is BuildingCategory {
  return typeof value === "string" && (BUILDING_CATEGORIES as readonly string[]).includes(value);
}

/** Zuordnung der bestehenden Karten-Gebäude (Slug-Id → Kategorie). */
export const BUILDING_CATEGORY_BY_ID: Record<string, BuildingCategory> = {
  hofwache: "Wache",
  hofkanzlei: "Kontor",
  silberkapelle: "Tempel",
  nordtor: "Tor",
  "blaue-gaerten": "Wohnhaus",
  "blauer-hirsch": "Taverne",
  seidensalon: "Kontor",
  tempel: "Tempel",
  ostbrunnen: "Tempel",
  "rose-hof": "Tempel",
  "konklave-saal": "Tempel",
  observatorium: "Akademie",
  schwertschule: "Akademie",
  "grosse-bibliothek": "Bibliothek",
  schmiede: "Schmiede",
  zunft: "Kontor",
  seidenkontor: "Kontor",
  gauklerbuehne: "Markt",
  loewentor: "Tor",
  allee: "Taverne",
  westmarkt: "Markt",
  "rote-laterne": "Taverne",
  "malanthir-umschlagplatz": "Lager",
  "wachenstube-rot": "Wache",
};

export function buildingCategoryForId(buildingId: string, fallbackType?: string | null): BuildingCategory {
  // Gespeicherter Lore-/Location-Typ hat Vorrang vor dem Code-Default.
  if (isBuildingCategory(fallbackType)) return fallbackType;
  const mapped = BUILDING_CATEGORY_BY_ID[buildingId];
  if (mapped) return mapped;
  // Ältere DB-Typen auf das feste Set abbilden
  switch (fallbackType) {
    case "Kathedrale":
      return "Tempel";
    case "Kaserne":
      return "Wache";
    case "Gebäude":
      return "Wohnhaus";
    default:
      return "Wohnhaus";
  }
}

/** Kategorie → Marker-Kind für die Holo-Pins. */
export function categoryToBuildingKind(category: BuildingCategory): BuildingKind {
  switch (category) {
    case "Palast":
      return "palace";
    case "Tempel":
      return "temple";
    case "Tor":
    case "Wache":
      return "gate";
    case "Schmiede":
    case "Werkstatt":
      return "smithy";
    case "Taverne":
      return "tavern";
    case "Markt":
    case "Geschäft":
      return "market";
    case "Wohnhaus":
      return "manor";
    case "Kontor":
    case "Lager":
    case "Bibliothek":
    case "Akademie":
      return "guild";
    default:
      return "manor";
  }
}

export function buildingCategoryLabel(category: BuildingCategory): string {
  return category;
}
