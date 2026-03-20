/**
 * Orte (geografische/hierarchische Locations)
 * Hierarchie: Region → Land → Stadt/Dorf → Gebäude (Taverne, Tempel, etc.)
 */
export const LOCATION_TYPES = [
  "Ort",
  "Stadt",
  "Gebiet",
  "Region",
  "Land",
  "Insel",
  "Dorf",
  "Stadtteil",
  "Gebäude",
  "Tempel",
  "Kathedrale",
  "Akademie",
  "Taverne",
  "Kaserne",
  "Kontor",
  "Hafen",
  "Schmiede",
  "Geschäft",
] as const;

export type LocationType = (typeof LOCATION_TYPES)[number];

/** Große/übergeordnete Orte (für Onboarding-UI) */
export const LARGE_LOCATION_TYPES = ["Stadt", "Region", "Ort", "Land", "Insel"] as const;

/** Gebäude/Institutionen (für Onboarding & Child-Locations) */
export const BUILDING_LOCATION_TYPES = [
  "Gebäude",
  "Tempel",
  "Kathedrale",
  "Akademie",
  "Taverne",
  "Kaserne",
  "Kontor",
  "Hafen",
  "Schmiede",
  "Geschäft",
] as const;

/**
 * Lore (nicht-geografisch) – Kultur, Religion, Mythos etc.
 */
export const LORE_TYPES = [
  "Kultur",
  "Sprache",
  "Religion",
  "Gottheit",
  "Regierung",
  "Rasse",
  "Mythos",
  "Magie",
  "Ereignis",
  "Artefakt",
  "Geschichten & Legenden",
] as const;

export type LoreType = (typeof LORE_TYPES)[number];

/** Alle gültigen world_lore Typen (für Abwärtskompatibilität) */
export const VALID_LORE_TYPES = [...LOCATION_TYPES, ...LORE_TYPES] as const;

/**
 * Prüft ob ein Typ ein Ort (Location) ist
 */
export function isLocationType(type: string): boolean {
  return (LOCATION_TYPES as readonly string[]).includes(type);
}

/**
 * Prüft ob ein Typ ein reiner Lore-Eintrag ist
 */
export function isLoreType(type: string): boolean {
  return (LORE_TYPES as readonly string[]).includes(type);
}

/**
 * Empfohlene Parent-Typen für den Location-Wizard.
 * Z.B. Stadt kann unter Land/Region liegen, Gebäude unter Stadt/Dorf.
 */
export const SUGGESTED_PARENT_TYPES: Record<string, string[]> = {
  Stadt: ["Land", "Region", "Insel"],
  Dorf: ["Land", "Region", "Stadt"],
  Stadtteil: ["Stadt"],
  Gebäude: ["Stadt", "Dorf", "Stadtteil"],
  Tempel: ["Stadt", "Dorf", "Stadtteil"],
  Kathedrale: ["Stadt", "Dorf", "Stadtteil"],
  Akademie: ["Stadt", "Dorf", "Stadtteil"],
  Taverne: ["Stadt", "Dorf", "Stadtteil"],
  Kaserne: ["Stadt", "Dorf", "Stadtteil"],
  Kontor: ["Stadt", "Dorf", "Stadtteil"],
  Hafen: ["Stadt", "Dorf"],
  Schmiede: ["Stadt", "Dorf", "Stadtteil"],
  Geschäft: ["Stadt", "Dorf", "Stadtteil"],
  Ort: ["Land", "Region", "Insel"],
  Gebiet: ["Land", "Region"],
  Region: ["Land"],
  Land: [],
  Insel: [],
};

/**
 * Empfohlene Child-Typen für GM-Aktionen auf der Orts-Detailseite.
 * Z.B. Stadt kann Kind-Orte haben: Gebäude, Tempel, Kathedrale, Stadtteil, Dorf.
 */
export const SUGGESTED_CHILD_TYPES: Record<string, string[]> = {
  Land: ["Region", "Stadt", "Dorf", "Insel"],
  Region: ["Land", "Stadt", "Dorf", "Ort", "Gebiet"],
  Insel: ["Stadt", "Dorf", "Ort"],
  Stadt: ["Stadtteil", "Gebäude", "Tempel", "Kathedrale", "Akademie", "Taverne", "Kaserne", "Kontor", "Hafen", "Schmiede", "Geschäft"],
  Dorf: ["Gebäude", "Tempel", "Taverne", "Schmiede", "Geschäft"],
  Stadtteil: ["Gebäude", "Tempel", "Kathedrale", "Akademie", "Taverne", "Kaserne", "Kontor", "Schmiede", "Geschäft"],
};

/**
 * Mapping: UI Filter Categories -> Database Types (für Kampagnen-Lore)
 */
export const TYPE_MAPPING: Record<string, string[]> = {
  Location: [...LOCATION_TYPES],
  Organization: ["Regierung"],
  Magic: ["Magie", "Artefakt"],
  Religion: ["Gottheit", "Religion", "Tempel", "Kathedrale"],
  Culture: ["Rasse", "Kultur", "Sprache"],
  History: ["Ereignis", "Mythos", "Geschichten & Legenden"],
  Other: [],
};

/** Reihenfolge der Kategorien für die Spieler-Ansicht (Welt & Lore). */
export const CATEGORY_ORDER = [
  "Location",
  "Religion",
  "Culture",
  "Organization",
  "History",
  "Magic",
  "Other",
] as const;

/** Liefert die Kategorie für einen Lore-Typ (für Gruppierung). */
export function getCategoryForType(type: string): string {
  for (const [cat, types] of Object.entries(TYPE_MAPPING)) {
    if (cat === "Other") continue;
    if (types.includes(type)) return cat;
  }
  return "Other";
}
