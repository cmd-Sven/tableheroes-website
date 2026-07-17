import type {
  Dnd5eFeatureEntry,
  Dnd5eSheetData,
  Dnd5eSpellEntry,
  Dnd5eSpellSlots,
} from "../types";
import {
  buildItemDescription,
  createEmptyCustomItemMeta,
  metaToInventoryCategory,
  parseDnd5eMetaFromDescription,
  type Dnd5eItemMeta,
} from "../item-meta";
import { defaultSpellAbilityForClass } from "../spellcasting";
import {
  cantripsKnownForClass,
  slotsForClassLevel,
  spellsKnownForClass,
} from "./spell-slots";
import { resolveClassId } from "./class-ids";
import { CLASS_NAME_DE } from "./labels-de";
import {
  getClassProgression,
  getFeatById,
  getFeats,
  getSpells,
  getSpellsForClass,
} from "./catalog";
import type { ClassId, FeatDefinition, SpellDefinition } from "./types";
import type { CharacterItem } from "@/src/types/inventory";
import { lookupWeaponStatsByName } from "../weapon-catalog-lookup";
import {
  buildCatalogTag,
  parseCatalogTagFromDescription,
  resolveCharacterItemStats,
} from "../item-resolve";
import { getCatalogForArchetype, type ShopCatalogItem } from "@/src/lib/shop-catalog";
import type { ShopArchetypeKey } from "@/src/lib/shop-archetypes";

function normalizeMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function spellDefinitionToSheetEntry(def: SpellDefinition): Dnd5eSpellEntry {
  return {
    id: def.id.startsWith("srd-") ? def.id : `srd-${def.id}`,
    name: def.nameDe || def.nameEn,
    nameDe: def.nameDe,
    nameEn: def.nameEn,
    description: def.descriptionDe || def.descriptionEn || null,
    descriptionDe: def.descriptionDe ?? null,
    descriptionEn: def.descriptionEn ?? null,
    level: def.level,
    school: def.school || null,
    ritual: Boolean(def.ritual),
    concentration: Boolean(def.concentration),
    preparationMode: def.level <= 0 ? "always" : "prepared",
    prepared: def.level <= 0,
    source: "srd",
  };
}

export function featDefinitionToFeatureEntry(feat: FeatDefinition): Dnd5eFeatureEntry {
  return {
    id: feat.id.startsWith("feat-") ? feat.id : `feat-${feat.id}`,
    name: feat.nameDe || feat.nameEn,
    nameDe: feat.nameDe,
    nameEn: feat.nameEn,
    description: feat.descriptionDe || feat.descriptionEn || null,
    descriptionDe: feat.descriptionDe ?? null,
    descriptionEn: feat.descriptionEn ?? null,
    source: "srd-feat",
  };
}

export function findFeatByName(name: string): FeatDefinition | null {
  const bare = normalizeMatch(name.replace(/^feat[-_]/i, ""));
  if (!bare) return null;
  const feats = getFeats();
  for (const f of feats) {
    if (
      normalizeMatch(f.id) === bare ||
      normalizeMatch(f.nameEn) === bare ||
      normalizeMatch(f.nameDe) === bare
    ) {
      return f;
    }
  }
  const scored = feats
    .map((f) => {
      const keys = [f.id, f.nameEn, f.nameDe].map(normalizeMatch);
      const hit = keys.some((k) => k && (bare.includes(k) || k.includes(bare)));
      return hit ? { f, len: Math.max(...keys.map((k) => k.length)) } : null;
    })
    .filter(Boolean) as Array<{ f: FeatDefinition; len: number }>;
  scored.sort((a, b) => b.len - a.len);
  return scored[0]?.f ?? null;
}

export function matchSheetFeatureToFeat(
  feature: Dnd5eFeatureEntry,
): FeatDefinition | null {
  if (feature.id.startsWith("feat-")) {
    const byId = getFeatById(feature.id.replace(/^feat-/, ""));
    if (byId) return byId;
  }
  return (
    findFeatByName(feature.name) ||
    findFeatByName(feature.nameEn ?? "") ||
    findFeatByName(feature.nameDe ?? "")
  );
}

/** Höchster Zaubergrad mit Slot-max > 0 */
export function maxSlotLevelFromSheet(sheet: Dnd5eSheetData): number {
  const slots = sheet.spellcasting?.slots ?? {};
  let max = 0;
  for (const [k, v] of Object.entries(slots)) {
    if (k === "pact") continue;
    if ((v?.max ?? 0) > 0) max = Math.max(max, Number(k) || 0);
  }
  return max;
}

export function countSpellsOfLevel(
  spells: Dnd5eSpellEntry[],
  level: number,
): number {
  return spells.filter((s) => s.level === level).length;
}

export function slotMaxForLevel(sheet: Dnd5eSheetData, level: number): number {
  if (level <= 0) return Number.POSITIVE_INFINITY;
  const key = String(level);
  return sheet.spellcasting?.slots?.[key]?.max ?? 0;
}

/** Sync spell slot maxima from class + level (keeps used capped). */
export function syncSpellSlotsFromClass(
  sheet: Dnd5eSheetData,
  className: string | null,
  level: number,
  subclass?: string | null,
): Dnd5eSheetData {
  const classId = resolveClassId(className);
  if (!classId) return sheet;
  const computed = slotsForClassLevel(classId, level, subclass);
  if (Object.keys(computed).length === 0 && classId !== "warlock") {
    return sheet;
  }
  const prev = sheet.spellcasting?.slots ?? {};
  const nextSlots: Dnd5eSpellSlots = { ...prev };
  for (const [key, max] of Object.entries(computed)) {
    const m = Math.max(0, max ?? 0);
    const used = Math.min(prev[key]?.used ?? 0, m);
    nextSlots[key] = { max: m, used };
  }
  return {
    ...sheet,
    spellcasting: {
      ability:
        sheet.spellcasting?.ability ?? defaultSpellAbilityForClass(className),
      spellSaveDcOverride: sheet.spellcasting?.spellSaveDcOverride ?? null,
      spellAttackBonusOverride:
        sheet.spellcasting?.spellAttackBonusOverride ?? null,
      slots: nextSlots,
    },
  };
}

/** Klasse gewählt → Trefferwürfel, Zauberattribut und Slots aus dem Katalog. */
export function applyClassBasicsFromCatalog(
  sheet: Dnd5eSheetData,
  className: string | null,
  level: number,
  subclass?: string | null,
): Dnd5eSheetData {
  const classId = resolveClassId(className);
  const prog = getClassProgression(classId);
  let next = syncSpellSlotsFromClass(sheet, className, level, subclass);
  if (!prog) return next;

  const ability = defaultSpellAbilityForClass(className);
  const hitDice = `${Math.max(1, level)}d${prog.hitDie}`;
  next = {
    ...next,
    combat: {
      ...next.combat,
      hitDice,
    },
  };
  if (ability || next.spellcasting) {
    next = {
      ...next,
      spellcasting: {
        ability: ability ?? next.spellcasting?.ability ?? "int",
        spellSaveDcOverride: next.spellcasting?.spellSaveDcOverride ?? null,
        spellAttackBonusOverride:
          next.spellcasting?.spellAttackBonusOverride ?? null,
        slots: next.spellcasting?.slots ?? {},
      },
    };
  }
  return next;
}

export function canLearnSpellFromCatalog(
  sheet: Dnd5eSheetData,
  def: SpellDefinition,
  className: string | null,
  characterLevel: number,
): { ok: boolean; reason?: string } {
  const classId = resolveClassId(className);
  if (!classId) return { ok: false, reason: "no-class" };
  if (!def.classes.includes(classId)) return { ok: false, reason: "wrong-class" };

  const existing = sheet.spells ?? [];
  if (
    existing.some(
      (s) =>
        s.id === def.id ||
        s.id === `srd-${def.id}` ||
        normalizeMatch(s.name) === normalizeMatch(def.nameEn) ||
        normalizeMatch(s.name) === normalizeMatch(def.nameDe),
    )
  ) {
    return { ok: false, reason: "duplicate" };
  }

  const maxSlot = maxSlotLevelFromSheet(sheet);
  if (def.level > 0 && def.level > maxSlot) {
    return { ok: false, reason: "level-too-high" };
  }

  if (def.level <= 0) {
    const cap = cantripsKnownForClass(classId, characterLevel);
    if (cap != null) {
      const current = countSpellsOfLevel(existing, 0);
      if (current >= cap) return { ok: false, reason: "cantrip-limit" };
    }
    return { ok: true };
  }

  const slotMax = slotMaxForLevel(sheet, def.level);
  if (slotMax <= 0) return { ok: false, reason: "no-slots" };
  const atLevel = countSpellsOfLevel(existing, def.level);
  if (atLevel >= slotMax) return { ok: false, reason: "slot-limit" };

  const knownCap = spellsKnownForClass(classId, characterLevel);
  if (knownCap != null) {
    const leveled = existing.filter((s) => s.level >= 1).length;
    if (leveled >= knownCap) return { ok: false, reason: "known-limit" };
  }

  return { ok: true };
}

export function catalogSpellsForPicker(
  className: string | null,
  sheet: Dnd5eSheetData,
): SpellDefinition[] {
  const classId = resolveClassId(className);
  if (!classId) return [];
  const maxLvl = Math.max(0, maxSlotLevelFromSheet(sheet));
  return getSpellsForClass(classId, maxLvl || undefined).sort(
    (a, b) => a.level - b.level || a.nameEn.localeCompare(b.nameEn),
  );
}

export function classDisplayName(classId: ClassId, locale: "de" | "en"): string {
  if (locale === "de") return CLASS_NAME_DE[classId];
  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

function shopEntryToMeta(entry: ShopCatalogItem): Dnd5eItemMeta {
  const base = createEmptyCustomItemMeta(entry.kind);
  return {
    ...base,
    kind: entry.kind,
    weightLb: entry.weightLb ?? 0,
    damage: entry.damage ?? null,
    damageType: entry.damageType ?? null,
    properties: entry.properties ?? [],
    acFormula: entry.acFormula ?? null,
    isShield: Boolean(entry.isShield),
    attunement: Boolean(entry.attunement),
    isMagical: entry.kind === "magic" || Boolean(entry.attunement),
    effect: entry.effect ?? null,
    strRequirement: entry.strRequirement ?? null,
    rangeMeters: entry.rangeMeters ?? null,
    rarity: entry.rarity ?? null,
    inventoryCategory:
      entry.kind === "weapon"
        ? "weapons"
        : entry.kind === "armor"
          ? "armor"
          : entry.kind === "consumable"
            ? "potions"
            : entry.kind === "tool"
              ? "tools"
              : "gear",
  };
}

/** Baut Description + Kategorie für ein Katalog-Item (Inventar). */
export function buildInventoryPayloadFromCatalog(
  archetypeKey: ShopArchetypeKey,
  entry: ShopCatalogItem,
): { name: string; description: string; category: ReturnType<typeof metaToInventoryCategory> } {
  const meta = shopEntryToMeta(entry);
  return {
    name: entry.name,
    description:
      buildItemDescription({
        tags: [buildCatalogTag(archetypeKey, entry.id)],
        meta,
        userText: entry.effect ?? null,
      }) ?? "",
    category: metaToInventoryCategory(meta),
  };
}

/**
 * Stempelt Waffen-/Rüstungsdaten aus Shop-/Namenskatalog in die Item-Description.
 * Überschreibt falsche Foundry-Kampfwerte, behält magische Boni.
 */
export function enrichItemDescriptionFromCatalog(
  item: CharacterItem,
): string | null {
  const existingMeta = parseDnd5eMetaFromDescription(item.description);
  const tag = parseCatalogTagFromDescription(item.description);
  const stats = resolveCharacterItemStats(item);

  let meta: Dnd5eItemMeta = {
    ...createEmptyCustomItemMeta(
      stats.kind === "unknown" ? "equipment" : stats.kind,
    ),
    ...(existingMeta ?? {}),
    weightLb: existingMeta?.weightLb || stats.weightLb,
    damage: existingMeta?.damage ?? stats.damage,
    damageType:
      (existingMeta?.damageType as Dnd5eItemMeta["damageType"]) ??
      (stats.damageType as Dnd5eItemMeta["damageType"]) ??
      null,
    properties: existingMeta?.properties?.length
      ? existingMeta.properties
      : stats.properties,
    acFormula: existingMeta?.acFormula ?? stats.acFormula,
    acBonus: existingMeta?.acBonus ?? stats.acBonus,
    magicalBonus: existingMeta?.magicalBonus ?? stats.magicalBonus,
    isShield: existingMeta?.isShield ?? stats.isShield,
    attunement: existingMeta?.attunement ?? stats.attunement,
    isMagical: existingMeta?.isMagical ?? stats.isMagical,
    effect: existingMeta?.effect ?? stats.effect,
    strRequirement: existingMeta?.strRequirement ?? stats.strRequirement,
    rangeMeters: existingMeta?.rangeMeters ?? stats.rangeMeters,
  };

  let changed = false;

  if (tag) {
    const list = getCatalogForArchetype(tag.archetypeKey);
    const entry = list.find((e) => e.id === tag.catalogId);
    if (entry) {
      if (entry.damage && entry.damage !== meta.damage) {
        meta.damage = entry.damage;
        changed = true;
      }
      if (entry.damageType && entry.damageType !== meta.damageType) {
        meta.damageType = entry.damageType;
        changed = true;
      }
      if (entry.properties?.length) {
        meta.properties = entry.properties;
        changed = true;
      }
      if (entry.acFormula && entry.acFormula !== meta.acFormula) {
        meta.acFormula = entry.acFormula;
        changed = true;
      }
      if (entry.weightLb && !meta.weightLb) {
        meta.weightLb = entry.weightLb;
        changed = true;
      }
      if (entry.kind === "weapon" || entry.kind === "armor") {
        meta.kind = entry.kind;
        changed = true;
      }
    }
  }

  const lookup = lookupWeaponStatsByName(item.name);
  if (lookup?.damage) {
    if (meta.damage !== lookup.damage) {
      meta.damage = lookup.damage ?? meta.damage;
      changed = true;
    }
    if (lookup.damageType && meta.damageType !== lookup.damageType) {
      meta.damageType = lookup.damageType as Dnd5eItemMeta["damageType"];
      changed = true;
    }
    if (lookup.properties?.length) {
      meta.properties = lookup.properties;
      changed = true;
    }
    if (lookup.weightLb && !meta.weightLb) {
      meta.weightLb = lookup.weightLb;
      changed = true;
    }
    if (lookup.rangeMeters != null) {
      meta.rangeMeters = lookup.rangeMeters;
      changed = true;
    }
    meta.kind = "weapon";
  }

  if (!changed && existingMeta?.damage) return null;

  const catalogTag = tag
    ? buildCatalogTag(tag.archetypeKey, tag.catalogId)
    : null;

  const userText =
    item.description
      ?.replace(/\[dnd5e-meta\][\s\S]*?\[\/dnd5e-meta\]/gi, "")
      .replace(/\[catalog:[^\]]+\]/gi, "")
      .replace(/\[catalog-enriched\]/gi, "")
      .trim() || null;

  return buildItemDescription({
    tags: [...(catalogTag ? [catalogTag] : []), "[catalog-enriched]"],
    meta,
    userText,
  });
}

const ITEM_CATALOG_ARCHETYPES: ShopArchetypeKey[] = [
  "waffenmeister",
  "bogenmacher",
  "rustungsschmied",
  "gemischtwaren",
  "alchemist",
];

export function listShopCatalogOptions(): Array<{
  archetypeKey: ShopArchetypeKey;
  catalogId: string;
  name: string;
  damage: string | null;
  damageType: string | null;
  kind: string;
  categoryLabel: string;
}> {
  const out: Array<{
    archetypeKey: ShopArchetypeKey;
    catalogId: string;
    name: string;
    damage: string | null;
    damageType: string | null;
    kind: string;
    categoryLabel: string;
  }> = [];
  for (const key of ITEM_CATALOG_ARCHETYPES) {
    const list = getCatalogForArchetype(key);
    for (const e of list) {
      out.push({
        archetypeKey: key,
        catalogId: e.id,
        name: e.name,
        damage: e.damage ?? null,
        damageType: e.damageType ?? null,
        kind: e.kind,
        categoryLabel: e.categoryLabel,
      });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export function getShopCatalogEntry(
  archetypeKey: ShopArchetypeKey,
  catalogId: string,
): ShopCatalogItem | null {
  return getCatalogForArchetype(archetypeKey).find((e) => e.id === catalogId) ?? null;
}

export { getFeats, getFeatById, getSpells, getSpellsForClass, getClassProgression };
