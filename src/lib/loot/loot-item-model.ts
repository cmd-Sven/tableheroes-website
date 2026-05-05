/** Reines Datenmodell + Parser (ohne "use server") — darf von Client-Komponenten importiert werden. */

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
};

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
  };
}
