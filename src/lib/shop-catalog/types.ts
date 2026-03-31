/**
 * Standardkatalog-Einträge pro Shop-Archetyp (D&D 5e / deutsch).
 * Werden in der App angezeigt; Buchungen/Goldbeutel folgen später.
 */

export type ShopItemKind =
  | "weapon"
  | "armor"
  | "equipment"
  | "magic"
  | "consumable"
  | "tool"
  | "supply";

/** Schadensart für Waffen (PHB-deutsch üblich) */
export type DamageTypeDe = "Wucht" | "Hieb" | "Stich";

export type ShopCatalogItem = {
  /** Stabiler Schlüssel (Slug) */
  id: string;
  name: string;
  kind: ShopItemKind;
  /** z. B. Waffe, Rüstung, Verbrauchsgut */
  categoryLabel: string;
  rarity?: string;
  priceGp?: number;
  priceSp?: number;
  priceCp?: number;
  /** Wenn gesetzt, wird dieser Text statt berechneter Münzen angezeigt */
  priceLabel?: string;
  weightLb?: number;
  /** Waffe */
  damage?: string;
  damageType?: DamageTypeDe;
  properties?: string[];
  /** Reichweite in m, z. B. "6/18" oder "24/96" */
  rangeMeters?: string;
  /** Rüstung */
  acFormula?: string;
  strRequirement?: number;
  stealthDisadvantage?: boolean;
  /** Schild: RK-Bonus statt Formel */
  isShield?: boolean;
  /** Magie / Tränke / Werkzeug */
  attunement?: boolean;
  effect?: string;
  charges?: string;
  duration?: string;
  /** Tabellen-Überschrift (z. B. einfache vs. kriegerische Waffen) */
  catalogGroup?: string;
  notes?: string;
};
