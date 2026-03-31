/**
 * Standard-Handels-Typen (D&D-5e-orientiert).
 * Archetyp-Shops teilen sich später eine globale Vorlagenliste; Unique-Shops nutzen eigene Waren.
 */
export const SHOP_ARCHETYPES = [
  { key: "bogenmacher", label: "Bogenmacher" },
  { key: "kraeuterkundler", label: "Kräuterkundler" },
  { key: "gemischtwaren", label: "Gemischtwarenhändler" },
  { key: "schankwirt", label: "Schankwirt" },
  { key: "baecker", label: "Bäcker" },
  { key: "fleischer", label: "Fleischer" },
  { key: "alchemist", label: "Alchemistenhändler" },
  { key: "magierbedarf", label: "Magierbedarf" },
  { key: "waffenmeister", label: "Waffenmeister" },
  { key: "rustungsschmied", label: "Rüstungschmied" },
  { key: "abenteurbedarf", label: "Abenteurbedarf" },
] as const;

export type ShopArchetypeKey = (typeof SHOP_ARCHETYPES)[number]["key"];

export const SHOP_ARCHETYPE_KEYS = new Set<string>(
  SHOP_ARCHETYPES.map((a) => a.key),
);

export function shopArchetypeLabel(key: string | null | undefined): string {
  if (!key) return "—";
  const row = SHOP_ARCHETYPES.find((a) => a.key === key);
  return row?.label ?? key;
}

export function isValidShopArchetypeKey(key: string): key is ShopArchetypeKey {
  return SHOP_ARCHETYPE_KEYS.has(key);
}

/** Kassandra / D&D – Anzeige (Phase später: Goldbeutel) */
export const KASSANDRA_COINS = [
  { code: "cp", dnd: "Kupfer (cp)", name: "Scherben" },
  { code: "sp", dnd: "Silber (sp)", name: "Lunate" },
  { code: "ep", dnd: "Elektrum (ep)", name: "Farum" },
  { code: "gp", dnd: "Gold (gp)", name: "Auren" },
  { code: "pp", dnd: "Platin (pp)", name: "Vattrus" },
] as const;
