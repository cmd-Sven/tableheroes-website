/** Reines Datenmodell + Parser (ohne "use server") — darf von Client-Komponenten importiert werden. */

import type { InventoryDisplayCategory } from "@/src/lib/characters/dnd5e/item-meta";
import type { LootMechanicsFields } from "@/src/lib/characters/dnd5e/loot-mechanics";

export type LootItemRow = {
  id: string;
  name: string;
  desc: string;
  rarity: string;
  price: number;
  isMagical: boolean;
  /** true = voller Name/Beschreibung (magisch); bei magisch ohne Identifikation: mundane* / unbekannt */
  identified?: boolean;
  /** Vor Identifikation: deutscher Tarntitel (z. B. „Eine dreckige Flasche …“) — darf den echten Typ nicht verraten. */
  mundaneName?: string;
  mundaneDesc?: string;
  /** Inventar-Grid-Kategorie (weapons, armor, potions, …) */
  inventoryCategory?: InventoryDisplayCategory;
  /** D&D-5e-Item-Art für [dnd5e-meta] */
  kind?: string;
  weightLb?: number;
} & LootMechanicsFields;

export type LootIdentifyRequestRow = {
  id: string;
  character_id: string;
  character_name: string;
  item_id: string;
  item_label: string;
  created_at: string;
};

export type LootDraftPayload = {
  name: string;
  gp: number;
  sp: number;
  items: LootItemRow[];
};

export const LOOT_UNIDENTIFIED_NAME_FALLBACK = "Unbestimmter Fund";

export const LOOT_UNIDENTIFIED_DESC_FALLBACK =
  "Aussehen, Material und Zweck lassen sich nicht sicher erkennen — nichts verrät offenbar die wahre Natur.";

/** Bühnen- / Inventar-Anzeige vor Identifikation (magisch + !identified). */
export function disguisedLootTitle(it: LootItemRow): string {
  if (!it.isMagical || it.identified) return it.name;
  const m = it.mundaneName?.trim();
  return m && m.length > 0 ? m.slice(0, 160) : LOOT_UNIDENTIFIED_NAME_FALLBACK;
}

export function disguisedLootDesc(it: LootItemRow): string {
  if (!it.isMagical || it.identified) return it.desc;
  const m = it.mundaneDesc?.trim();
  return m && m.length > 0 ? m : LOOT_UNIDENTIFIED_DESC_FALLBACK;
}

export function parseLootItemRow(raw: unknown): LootItemRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "").trim();
  if (!id) return null;
  const isMagical = Boolean(o.isMagical ?? o.is_magical);
  const identifiedRaw = o.identified;
  const identified = !isMagical || identifiedRaw === true;
  const inventoryCategoryRaw = o.inventoryCategory ?? o.inventory_category;
  const inventoryCategory =
    inventoryCategoryRaw != null ? String(inventoryCategoryRaw).trim().toLowerCase() : undefined;
  const kindRaw = o.kind ?? o.item_type;
  const kind = kindRaw != null ? String(kindRaw).trim().toLowerCase() : undefined;
  const weightLb =
    o.weightLb != null || o.weight_lb != null
      ? Math.max(0, Number(o.weightLb ?? o.weight_lb ?? 0))
      : undefined;
  const referenceId = o.referenceId ?? o.reference_id;
  const parseStr = (v: unknown) => (v != null ? String(v).trim() : undefined);
  const parseStrArr = (v: unknown) =>
    Array.isArray(v) ? v.map(String).filter(Boolean) : undefined;

  return {
    id,
    name: String(o.name ?? "Gegenstand").slice(0, 160),
    desc: String(o.desc ?? ""),
    rarity: String(o.rarity ?? "common").toLowerCase(),
    price: Math.max(0, Math.round(Number(o.price ?? 0))),
    isMagical,
    identified,
    mundaneName: o.mundaneName != null ? String(o.mundaneName).slice(0, 160) : undefined,
    mundaneDesc: o.mundaneDesc != null ? String(o.mundaneDesc).slice(0, 800) : undefined,
    inventoryCategory: inventoryCategory as LootItemRow["inventoryCategory"],
    kind,
    weightLb,
    referenceId: parseStr(referenceId),
    attunement: o.attunement != null ? Boolean(o.attunement) : undefined,
    damage: parseStr(o.damage) ?? null,
    damageType: parseStr(o.damageType ?? o.damage_type) ?? null,
    properties: parseStrArr(o.properties),
    rangeMeters: parseStr(o.rangeMeters ?? o.range_meters) ?? null,
    acFormula: parseStr(o.acFormula ?? o.ac_formula) ?? null,
    strRequirement:
      o.strRequirement != null || o.str_requirement != null
        ? Math.max(0, Number(o.strRequirement ?? o.str_requirement ?? 0))
        : null,
    isShield: o.isShield != null || o.is_shield != null ? Boolean(o.isShield ?? o.is_shield) : undefined,
    effect: parseStr(o.effect) ?? null,
  };
}

export function parseIdentifyRequests(raw: unknown): LootIdentifyRequestRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row): LootIdentifyRequestRow | null => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = String(o.id ?? "").trim();
      const character_id = String(o.character_id ?? "").trim();
      const item_id = String(o.item_id ?? "").trim();
      if (!id || !character_id || !item_id) return null;
      return {
        id,
        character_id,
        character_name: String(o.character_name ?? "Spieler").slice(0, 120),
        item_id,
        item_label: String(o.item_label ?? "Gegenstand").slice(0, 160),
        created_at: String(o.created_at ?? new Date().toISOString()),
      };
    })
    .filter((x): x is LootIdentifyRequestRow => x != null);
}

export function lootItemToJson(it: LootItemRow): Record<string, unknown> {
  return {
    id: it.id,
    name: it.name,
    desc: it.desc,
    rarity: it.rarity,
    price: it.price,
    isMagical: it.isMagical,
    identified: it.identified ?? !it.isMagical,
    mundaneName: it.mundaneName ?? null,
    mundaneDesc: it.mundaneDesc ?? null,
    inventoryCategory: it.inventoryCategory ?? null,
    kind: it.kind ?? null,
    weightLb: it.weightLb ?? null,
    referenceId: it.referenceId ?? null,
    attunement: it.attunement ?? null,
    damage: it.damage ?? null,
    damageType: it.damageType ?? null,
    properties: it.properties ?? null,
    rangeMeters: it.rangeMeters ?? null,
    acFormula: it.acFormula ?? null,
    strRequirement: it.strRequirement ?? null,
    isShield: it.isShield ?? null,
    effect: it.effect ?? null,
  };
}
