import type { CharacterSheetLocale } from "@/src/lib/i18n/character-sheet/types";
import type { AbilityKey, Dnd5eFeatureEntry, Dnd5eSpellEntry, Dnd5eSpellSlots } from "./types";
import { stripFoundryEnrichers } from "./foundry-enrichers";

/** Wie die Klasse Zauber handhabt (Vorbereitung vs. bekannt vs. Pakt). */
export type SpellPreparationStyle = "prepared" | "known" | "pact" | "none";

const PREPARED_CLASS_RE =
  /magier|wizard|kleriker|cleric|druide|druid|paladin|artificer|inventor/;
const KNOWN_CLASS_RE =
  /barde|bard|zauberer|sorcerer|waldläufer|waldlaeufer|ranger/;
const PACT_CLASS_RE = /hexer|warlock|hexenmeister/;
const CASTER_CLASS_RE =
  /magier|wizard|zauberer|sorcerer|kleriker|cleric|paladin|barde|bard|hexer|warlock|druide|druid|waldläufer|waldlaeufer|ranger|artificer|inventor|hexenmeister/;
const THIRD_CASTER_SUBCLASS_RE =
  /arcane.?trickster|arkaner.?tricks[te]er|eldritch.?knight|mystischer.?ritter/;

export function isCasterClass(
  className: string | null | undefined,
  subclass?: string | null,
): boolean {
  const c = (className ?? "").toLowerCase();
  if (c.length > 0 && CASTER_CLASS_RE.test(c)) return true;
  const s = (subclass ?? "").toLowerCase();
  return s.length > 0 && THIRD_CASTER_SUBCLASS_RE.test(s);
}

export function getSpellPreparationStyle(
  className: string | null | undefined,
  subclass?: string | null,
): SpellPreparationStyle {
  const c = (className ?? "").toLowerCase();
  if (!c && !subclass) return "none";
  if (PACT_CLASS_RE.test(c)) return "pact";
  if (PREPARED_CLASS_RE.test(c)) return "prepared";
  if (KNOWN_CLASS_RE.test(c)) return "known";
  if (THIRD_CASTER_SUBCLASS_RE.test((subclass ?? "").toLowerCase())) return "known";
  return "none";
}

/** Max. vorbereitbare Zauber (ohne Zaubertricks / always). null = nicht relevant. */
export function preparedSpellLimit(
  className: string | null | undefined,
  level: number,
  abilityMod: number,
): number | null {
  if (getSpellPreparationStyle(className) !== "prepared") return null;
  const c = (className ?? "").toLowerCase();
  const lvl = Math.max(1, Math.floor(level));
  const mod = Math.floor(abilityMod);
  if (/paladin|waldläufer|waldlaeufer|ranger/.test(c)) {
    return Math.max(1, Math.floor(lvl / 2) + mod);
  }
  return Math.max(1, lvl + mod);
}

export function spellRequiresPreparation(
  spell: Dnd5eSpellEntry,
  style: SpellPreparationStyle,
): boolean {
  if (style !== "prepared") return false;
  if (spell.level <= 0) return false;
  const mode = spell.preparationMode ?? "prepared";
  return mode === "prepared" || mode === "known";
}

export function localizedSpellName(
  spell: Dnd5eSpellEntry,
  locale: CharacterSheetLocale,
): string {
  if (locale === "de") {
    return spell.nameDe?.trim() || spell.name?.trim() || spell.nameEn?.trim() || "";
  }
  return spell.nameEn?.trim() || spell.name?.trim() || spell.nameDe?.trim() || "";
}

export function localizedSpellDescription(
  spell: Dnd5eSpellEntry,
  locale: CharacterSheetLocale,
): string | null {
  if (locale === "de") {
    return (
      spell.descriptionDe?.trim() ||
      spell.description?.trim() ||
      spell.descriptionEn?.trim() ||
      null
    );
  }
  return (
    spell.descriptionEn?.trim() ||
    spell.description?.trim() ||
    spell.descriptionDe?.trim() ||
    null
  );
}

export function localizedFeatureName(
  feature: Dnd5eFeatureEntry,
  locale: CharacterSheetLocale,
): string {
  if (locale === "de") {
    return feature.nameDe?.trim() || feature.name?.trim() || feature.nameEn?.trim() || "";
  }
  return feature.nameEn?.trim() || feature.name?.trim() || feature.nameDe?.trim() || "";
}

export function localizedFeatureDescription(
  feature: Dnd5eFeatureEntry,
  locale: CharacterSheetLocale,
): string | null {
  const raw =
    locale === "de"
      ? feature.descriptionDe?.trim() ||
        feature.description?.trim() ||
        feature.descriptionEn?.trim() ||
        null
      : feature.descriptionEn?.trim() ||
        feature.description?.trim() ||
        feature.descriptionDe?.trim() ||
        null;
  if (!raw) return null;
  const cleaned = stripFoundryEnrichers(raw);
  return cleaned || null;
}

const SCHOOL_LABELS: Record<string, { de: string; en: string }> = {
  abj: { de: "Bannmagie", en: "Abjuration" },
  con: { de: "Beschwörung", en: "Conjuration" },
  div: { de: "Weissagung", en: "Divination" },
  enc: { de: "Verzauberung", en: "Enchantment" },
  evo: { de: "Hervorrufung", en: "Evocation" },
  ill: { de: "Illusion", en: "Illusion" },
  nec: { de: "Nekromantie", en: "Necromancy" },
  trs: { de: "Verwandlung", en: "Transmutation" },
};

export const SPELL_SCHOOL_KEYS = Object.keys(SCHOOL_LABELS) as Array<keyof typeof SCHOOL_LABELS>;

export const SPELL_DAMAGE_TYPES = [
  "acid",
  "bludgeoning",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "piercing",
  "poison",
  "psychic",
  "radiant",
  "slashing",
  "thunder",
] as const;

export type SpellDamageType = (typeof SPELL_DAMAGE_TYPES)[number];

const DAMAGE_TYPE_LABELS: Record<SpellDamageType, { de: string; en: string }> = {
  acid: { de: "Säure", en: "Acid" },
  bludgeoning: { de: "Wucht", en: "Bludgeoning" },
  cold: { de: "Kälte", en: "Cold" },
  fire: { de: "Feuer", en: "Fire" },
  force: { de: "Kraft", en: "Force" },
  lightning: { de: "Blitz", en: "Lightning" },
  necrotic: { de: "Nekrotisch", en: "Necrotic" },
  piercing: { de: "Stich", en: "Piercing" },
  poison: { de: "Gift", en: "Poison" },
  psychic: { de: "Psychisch", en: "Psychic" },
  radiant: { de: "Strahlend", en: "Radiant" },
  slashing: { de: "Hieb", en: "Slashing" },
  thunder: { de: "Donner", en: "Thunder" },
};

export function spellSchoolLabel(
  school: string | null | undefined,
  locale: CharacterSheetLocale,
): string | null {
  if (!school) return null;
  const key = school.toLowerCase().slice(0, 3);
  const entry = SCHOOL_LABELS[key];
  if (entry) return locale === "en" ? entry.en : entry.de;
  return school;
}

export function spellDamageTypeLabel(
  damageType: string | null | undefined,
  locale: CharacterSheetLocale,
): string | null {
  if (!damageType) return null;
  const key = damageType.toLowerCase() as SpellDamageType;
  const entry = DAMAGE_TYPE_LABELS[key];
  if (entry) return locale === "en" ? entry.en : entry.de;
  return damageType;
}

/** Komponenten-String aus V/S/M-Flags (D&D 5e). */
export function formatSpellComponents(spell: Pick<
  Dnd5eSpellEntry,
  "componentVocal" | "componentSomatic" | "componentMaterial" | "materials" | "components"
>): string | null {
  const parts: string[] = [];
  if (spell.componentVocal) parts.push("V");
  if (spell.componentSomatic) parts.push("S");
  if (spell.componentMaterial) {
    const mat = spell.materials?.trim();
    parts.push(mat ? `M (${mat})` : "M");
  }
  if (parts.length > 0) return parts.join(", ");
  return spell.components?.trim() || null;
}

export function parseComponentFlagsFromString(components: string | null | undefined): {
  componentVocal: boolean;
  componentSomatic: boolean;
  componentMaterial: boolean;
  materials: string | null;
} {
  const raw = String(components ?? "");
  const materialMatch = raw.match(/\bM\s*\(([^)]*)\)/i);
  return {
    componentVocal: /\bV\b/i.test(raw),
    componentSomatic: /\bS\b/i.test(raw),
    componentMaterial: /\bM\b/i.test(raw),
    materials: materialMatch?.[1]?.trim() || null,
  };
}

export function hydrateSpellComponentFlags(spell: Dnd5eSpellEntry): Dnd5eSpellEntry {
  if (
    spell.componentVocal != null ||
    spell.componentSomatic != null ||
    spell.componentMaterial != null
  ) {
    return spell;
  }
  const parsed = parseComponentFlagsFromString(spell.components);
  return {
    ...spell,
    ...parsed,
    materials: spell.materials ?? parsed.materials,
  };
}

export function createEmptySpell(partial?: Partial<Dnd5eSpellEntry>): Dnd5eSpellEntry {
  return {
    id: crypto.randomUUID(),
    name: "",
    nameDe: null,
    nameEn: null,
    description: null,
    descriptionDe: null,
    descriptionEn: null,
    level: 1,
    school: "evo",
    preparationMode: "prepared",
    prepared: false,
    ritual: false,
    concentration: false,
    castingTime: "1 action",
    range: "30 feet",
    duration: "Instantaneous",
    target: null,
    components: "V, S",
    componentVocal: true,
    componentSomatic: true,
    componentMaterial: false,
    materials: null,
    damage: null,
    damageType: null,
    saveAbility: null,
    attackType: "none",
    higherLevels: null,
    source: "manual",
    ...partial,
  };
}

export function normalizeSpellEntry(spell: Dnd5eSpellEntry): Dnd5eSpellEntry {
  const level = Math.max(0, Math.min(9, Math.floor(Number(spell.level) || 0)));
  const name = String(spell.name ?? "").trim();
  const next: Dnd5eSpellEntry = {
    ...spell,
    name,
    level,
    school: spell.school?.trim() || null,
    castingTime: spell.castingTime?.trim() || null,
    range: spell.range?.trim() || null,
    duration: spell.duration?.trim() || null,
    target: spell.target?.trim() || null,
    materials: spell.materials?.trim() || null,
    damage: spell.damage?.trim() || null,
    damageType: spell.damageType?.trim() || null,
    higherLevels: spell.higherLevels?.trim() || null,
    nameDe: spell.nameDe?.trim() || null,
    nameEn: spell.nameEn?.trim() || null,
    description: spell.description?.trim() || null,
    descriptionDe: spell.descriptionDe?.trim() || null,
    descriptionEn: spell.descriptionEn?.trim() || null,
  };
  next.components = formatSpellComponents(next);
  return next;
}

export const SPELL_SLOT_LEVEL_KEYS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
] as const;

export function sortSpellsByLevel(spells: Dnd5eSpellEntry[]): Dnd5eSpellEntry[] {
  return [...spells].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" });
  });
}

export function groupSpellsByLevel(
  spells: Dnd5eSpellEntry[],
): Map<number, Dnd5eSpellEntry[]> {
  const map = new Map<number, Dnd5eSpellEntry[]>();
  for (const spell of sortSpellsByLevel(spells)) {
    const list = map.get(spell.level) ?? [];
    list.push(spell);
    map.set(spell.level, list);
  }
  return map;
}

export function slotRemaining(slots: Dnd5eSpellSlots | undefined, key: string): number {
  const block = slots?.[key];
  if (!block) return 0;
  return Math.max(0, block.max - block.used);
}

export function defaultSpellAbilityForClass(
  className: string | null | undefined,
): AbilityKey {
  const c = (className ?? "").toLowerCase();
  if (/kleriker|cleric|druide|druid|waldläufer|waldlaeufer|ranger/.test(c)) return "wis";
  if (/barde|bard|hexer|warlock|zauberer|sorcerer|paladin|hexenmeister/.test(c)) return "cha";
  return "int";
}
