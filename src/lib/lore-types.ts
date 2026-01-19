/**
 * Single Source of Truth für Lore-Typen
 * Diese Werte entsprechen den deutschen Datenbank-Werten
 */
export const VALID_LORE_TYPES = [
  'Stadt',
  'Region',
  'Land',
  'Insel',
  'Gebäude',
  'Tempel',
  'Akademie',
  'Markt',
  'Gilde',
  'Laden',
  'Regierung',
  'Gottheit',
  'Religion',
  'Glaube',
  'Magie',
  'Artefakt',
  'Rasse',
  'Kultur',
  'Sprache',
  'Ereignis',
  'Mythos',
  'Ort',
] as const;

/**
 * Mapping: UI Filter Categories -> Database Types
 */
export const TYPE_MAPPING: Record<string, string[]> = {
  Location: ['Stadt', 'Region', 'Land', 'Insel', 'Gebäude', 'Tempel', 'Akademie', 'Markt', 'Laden', 'Ort'],
  Organization: ['Gilde', 'Regierung', 'Akademie', 'Militär', 'Politik', 'Enklave'],
  Magic: ['Magie', 'Artefakt', 'Zauber', 'Ritual'],
  Religion: ['Gottheit', 'Religion', 'Glaube', 'Tempel', 'Kirche'],
  Culture: ['Rasse', 'Kultur', 'Sprache', 'Volk'],
  History: ['Ereignis', 'Mythos', 'Geschichte'],
  Other: [], // Alles andere
};



