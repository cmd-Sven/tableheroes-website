/**
 * Loot-Konfiguration für Battlemap-Behälter (gespeichert in ai_payload.loot).
 */
import type { LootDraftPayload, LootItemRow } from "@/src/lib/loot/loot-item-model";
import {
  LOOT_REFERENCE_ITEMS,
  findLootReferenceByRefId,
  type LootReferenceItem,
} from "@/src/lib/characters/dnd5e/loot-reference-catalog";
import type { ShopArchetypeKey } from "@/src/lib/shop-archetypes";

export type ContainerLootMode = "empty" | "preset" | "catalog";

export type ContainerLootPreset =
  | "junk"
  | "modest"
  | "magical"
  | "gold_valuable";

export const CONTAINER_LOOT_PRESET_LABELS: Record<ContainerLootPreset, string> = {
  junk: "Nur Plunder",
  modest: "Ein wenig Wertvolles",
  magical: "Etwas Magisches",
  gold_valuable: "Gold + wertvoller Gegenstand",
};

export type ContainerLootCatalogRef = {
  /** Listen-Schlüssel */
  id: string;
  archetypeKey: ShopArchetypeKey | string;
  catalogId: string;
  name: string;
  quantity: number;
  isMagical?: boolean;
};

export type ContainerLootConfig = {
  lootMode: ContainerLootMode;
  lootPreset: ContainerLootPreset | null;
  lootItems: ContainerLootCatalogRef[];
  /** Explizites Gold (Katalog-Modus oder Override) */
  goldGp: number;
  /** Von KI/Preset vorab aufgelöste Gegenstände */
  resolvedItems: LootItemRow[];
  /** Nach erfolgreichem Öffnen auf Bühne veröffentlicht */
  lootPublished: boolean;
  lootStageId: string | null;
};

export const EMPTY_CONTAINER_LOOT: ContainerLootConfig = {
  lootMode: "empty",
  lootPreset: null,
  lootItems: [],
  goldGp: 0,
  resolvedItems: [],
  lootPublished: false,
  lootStageId: null,
};

const PRESETS = new Set<ContainerLootPreset>([
  "junk",
  "modest",
  "magical",
  "gold_valuable",
]);

function asLootItemRow(raw: unknown): LootItemRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "").trim() || cryptoRandomId();
  const name = String(o.name ?? "").trim();
  if (!name) return null;
  return {
    id,
    name: name.slice(0, 160),
    desc: String(o.desc ?? o.description ?? "").slice(0, 2000),
    rarity: String(o.rarity ?? "common").toLowerCase(),
    price: Math.max(0, Math.round(Number(o.price ?? 0))),
    isMagical: Boolean(o.isMagical ?? o.is_magical),
    identified: o.identified === true || !Boolean(o.isMagical ?? o.is_magical),
    mundaneName: o.mundaneName != null ? String(o.mundaneName).slice(0, 160) : undefined,
    mundaneDesc: o.mundaneDesc != null ? String(o.mundaneDesc).slice(0, 800) : undefined,
    inventoryCategory: o.inventoryCategory != null
      ? (String(o.inventoryCategory) as LootItemRow["inventoryCategory"])
      : undefined,
    kind: o.kind != null ? String(o.kind) : undefined,
    weightLb: o.weightLb != null ? Math.max(0, Number(o.weightLb)) : undefined,
    referenceId: o.referenceId != null ? String(o.referenceId) : undefined,
    attunement: o.attunement != null ? Boolean(o.attunement) : undefined,
    damage: o.damage != null ? String(o.damage) : null,
    damageType: o.damageType != null ? String(o.damageType) : null,
    properties: Array.isArray(o.properties) ? o.properties.map(String) : undefined,
    rangeMeters: o.rangeMeters != null ? String(o.rangeMeters) : null,
    acFormula: o.acFormula != null ? String(o.acFormula) : null,
    strRequirement: o.strRequirement != null ? Number(o.strRequirement) : null,
    isShield: o.isShield != null ? Boolean(o.isShield) : undefined,
    effect: o.effect != null ? String(o.effect) : null,
  };
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `loot_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function parseContainerLootConfig(
  aiPayload: Record<string, unknown> | null | undefined,
): ContainerLootConfig {
  const root = aiPayload?.loot;
  const raw =
    root && typeof root === "object"
      ? (root as Record<string, unknown>)
      : (aiPayload ?? {});

  const modeRaw = String(raw.lootMode ?? raw.loot_mode ?? "empty");
  const lootMode: ContainerLootMode =
    modeRaw === "preset" || modeRaw === "catalog" || modeRaw === "empty"
      ? modeRaw
      : "empty";

  const presetRaw = String(raw.lootPreset ?? raw.loot_preset ?? "");
  const lootPreset: ContainerLootPreset | null = PRESETS.has(
    presetRaw as ContainerLootPreset,
  )
    ? (presetRaw as ContainerLootPreset)
    : null;

  const lootItems: ContainerLootCatalogRef[] = Array.isArray(raw.lootItems)
    ? raw.lootItems
        .map((row, index): ContainerLootCatalogRef | null => {
          if (!row || typeof row !== "object") return null;
          const o = row as Record<string, unknown>;
          const catalogId = String(o.catalogId ?? o.catalog_id ?? "").trim();
          const archetypeKey = String(o.archetypeKey ?? o.archetype_key ?? "").trim();
          const name = String(o.name ?? "").trim();
          if (!catalogId || !archetypeKey) return null;
          const stableId = String(o.id ?? "").trim() || `${archetypeKey}:${catalogId}:${index}`;
          return {
            id: stableId,
            archetypeKey,
            catalogId,
            name: name || catalogId,
            quantity: Math.max(1, Math.min(20, Math.round(Number(o.quantity ?? 1)))),
            isMagical: o.isMagical != null ? Boolean(o.isMagical) : undefined,
          };
        })
        .filter((x): x is ContainerLootCatalogRef => x != null)
    : [];

  const resolvedItems = Array.isArray(raw.resolvedItems)
    ? raw.resolvedItems.map(asLootItemRow).filter((x): x is LootItemRow => x != null)
    : [];

  return {
    lootMode,
    lootPreset: lootMode === "preset" ? lootPreset : lootMode === "catalog" ? null : lootPreset,
    lootItems,
    goldGp: Math.max(0, Math.round(Number(raw.goldGp ?? raw.gold_gp ?? 0))),
    resolvedItems,
    lootPublished: raw.lootPublished === true || raw.loot_published === true,
    lootStageId:
      raw.lootStageId != null || raw.loot_stage_id != null
        ? String(raw.lootStageId ?? raw.loot_stage_id)
        : null,
  };
}

export function containerLootToPayload(loot: ContainerLootConfig): Record<string, unknown> {
  return {
    lootMode: loot.lootMode,
    lootPreset: loot.lootPreset,
    lootItems: loot.lootItems,
    goldGp: loot.goldGp,
    resolvedItems: loot.resolvedItems,
    lootPublished: loot.lootPublished,
    lootStageId: loot.lootStageId,
  };
}

export function mergeLootIntoAiPayload(
  aiPayload: Record<string, unknown> | null | undefined,
  loot: ContainerLootConfig,
): Record<string, unknown> {
  return {
    ...(aiPayload ?? {}),
    loot: containerLootToPayload(loot),
  };
}

function refToLootItem(ref: LootReferenceItem, qtyIndex = 0): LootItemRow {
  return {
    id: cryptoRandomId(),
    name: qtyIndex > 0 ? `${ref.name}` : ref.name,
    desc: ref.effect ?? "",
    rarity: ref.isMagical ? "uncommon" : "common",
    price: ref.priceGp,
    isMagical: ref.isMagical,
    identified: !ref.isMagical,
    inventoryCategory: ref.inventoryCategory,
    kind: ref.kind,
    weightLb: ref.weightLb,
    referenceId: ref.refId,
    attunement: ref.attunement,
    damage: ref.damage ?? null,
    damageType: ref.damageType ?? null,
    properties: ref.properties,
    rangeMeters: ref.rangeMeters ?? null,
    acFormula: ref.acFormula ?? null,
    strRequirement: ref.strRequirement ?? null,
    isShield: ref.isShield,
    effect: ref.effect ?? null,
  };
}

export function catalogRefsToLootItems(refs: ContainerLootCatalogRef[]): LootItemRow[] {
  const out: LootItemRow[] = [];
  for (const row of refs) {
    const refId = `${row.archetypeKey}:${row.catalogId}`;
    const found = findLootReferenceByRefId(refId);
    const qty = Math.max(1, Math.min(20, row.quantity));
    for (let i = 0; i < qty; i++) {
      if (found) {
        out.push(refToLootItem(found, i));
      } else {
        out.push({
          id: cryptoRandomId(),
          name: row.name,
          desc: "",
          rarity: "common",
          price: 0,
          isMagical: Boolean(row.isMagical),
          identified: !row.isMagical,
          referenceId: refId,
        });
      }
    }
  }
  return out;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  if (n <= 0 || arr.length === 0) return [];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Deterministische/Preset-Auflösung aus dem Shop-/Loot-Referenzkatalog. */
export function generatePresetLootItems(
  preset: ContainerLootPreset,
  targetLevel = 3,
): { items: LootItemRow[]; goldGp: number } {
  const level = Math.max(1, Math.min(20, targetLevel));
  const junk = LOOT_REFERENCE_ITEMS.filter(
    (r) => !r.isMagical && r.priceGp <= 5 && r.kind !== "weapon" && r.kind !== "armor",
  );
  const modestGear = LOOT_REFERENCE_ITEMS.filter(
    (r) => !r.isMagical && r.priceGp > 0 && r.priceGp <= 50,
  );
  const simpleWeapons = LOOT_REFERENCE_ITEMS.filter(
    (r) => !r.isMagical && r.kind === "weapon" && r.priceGp <= 25,
  );
  const magical = LOOT_REFERENCE_ITEMS.filter((r) => r.isMagical);
  const valuable = LOOT_REFERENCE_ITEMS.filter(
    (r) => !r.isMagical && r.priceGp >= 25 && r.priceGp <= 200,
  );

  switch (preset) {
    case "junk": {
      const picks = pickRandom(junk.length ? junk : modestGear, randInt(2, 4));
      return {
        items: picks.map((r) => refToLootItem(r)),
        goldGp: randInt(0, 4 + Math.floor(level / 4)),
      };
    }
    case "modest": {
      const gear = pickRandom(modestGear, randInt(1, 2));
      const weapon = pickRandom(simpleWeapons, Math.random() < 0.6 ? 1 : 0);
      return {
        items: [...gear, ...weapon].map((r) => refToLootItem(r)),
        goldGp: randInt(5, 15 + level * 2),
      };
    }
    case "magical": {
      const magPool = magical.length ? magical : valuable;
      const mag = pickRandom(magPool, 1);
      const filler = pickRandom(junk, Math.random() < 0.4 ? 1 : 0);
      return {
        items: [...mag, ...filler].map((r) => refToLootItem(r)),
        goldGp: randInt(8, 20 + level * 2),
      };
    }
    case "gold_valuable": {
      const val = pickRandom(valuable.length ? valuable : modestGear, 1);
      const maybeMag =
        magical.length && Math.random() < 0.25 ? pickRandom(magical, 1) : [];
      return {
        items: [...val, ...maybeMag].map((r) => refToLootItem(r)),
        goldGp: randInt(40 + level * 3, 100 + level * 8),
      };
    }
    default:
      return { items: [], goldGp: 0 };
  }
}

/**
 * Baut den Loot-Draft für die Bühne (campaign_loot_containers / StageLootItemCards).
 */
export function buildContainerLootDraft(
  containerName: string,
  loot: ContainerLootConfig,
  targetLevel = 3,
): LootDraftPayload | null {
  if (loot.lootMode === "empty") return null;
  if (loot.lootPublished) return null;

  let items: LootItemRow[] = [];
  let goldGp = loot.goldGp;

  if (loot.resolvedItems.length > 0) {
    items = loot.resolvedItems.map((it) => ({
      ...it,
      id: it.id || cryptoRandomId(),
    }));
  } else if (loot.lootMode === "catalog") {
    items = catalogRefsToLootItems(loot.lootItems);
  } else if (loot.lootMode === "preset" && loot.lootPreset) {
    const generated = generatePresetLootItems(loot.lootPreset, targetLevel);
    items = generated.items;
    if (goldGp <= 0) goldGp = generated.goldGp;
  }

  if (items.length === 0 && goldGp <= 0) return null;

  return {
    name: containerName.trim().slice(0, 160) || "Behälter",
    gp: Math.max(0, Math.round(goldGp)),
    sp: 0,
    items,
  };
}

export function searchLootCatalogOptions(query: string, kindFilter: string | "all" = "all") {
  const q = query.trim().toLowerCase();
  return LOOT_REFERENCE_ITEMS.filter((o) => {
    if (kindFilter !== "all" && o.kind !== kindFilter) return false;
    if (!q) return true;
    return (
      o.name.toLowerCase().includes(q) ||
      o.catalogId.includes(q) ||
      o.inventoryCategory.toLowerCase().includes(q) ||
      o.refId.toLowerCase().includes(q)
    );
  }).slice(0, 80);
}
