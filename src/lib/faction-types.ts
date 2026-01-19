/**
 * Single Source of Truth für Fraktions-Typen
 * Diese Werte entsprechen den deutschen Datenbank-Werten
 */
export const VALID_FACTION_TYPES = [
  'Gilde',
  'Militär',
  'Politik',
  'Religion',
  'Stamm',
  'Söldner',
  'Regierung',
  'Kult',
  'Akademie',
  'Organisation',
  'Königreich',
  'Allianz',
  'Orden',
  'Andere',
] as const;

/**
 * Single Source of Truth für Fraktions-Beziehungen (Status)
 */
export const VALID_RELATIONSHIPS = [
  'Neutral',
  'Verbündet',
  'Freundlich',
  'Feindlich',
  'Im Krieg',
] as const;



