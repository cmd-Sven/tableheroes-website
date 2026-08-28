import {
  getAllClassProgressions,
  getFeats,
  getSpells,
} from "@/src/lib/characters/dnd5e/progression/catalog";
import {
  CLASS_NAME_DE,
  CLASS_NAME_EN,
} from "@/src/lib/characters/dnd5e/progression/labels-de";
import type { ClassId, FeatDefinition, ProgressionFeature, SpellDefinition } from "@/src/lib/characters/dnd5e/progression/types";
import type { QuickRuleEntry } from "./types";
import { DND_2024_RULES_EDITION } from "./types";

const SOURCE = "PHB 2024";

const SCHOOL_DE: Record<string, string> = {
  Abjuration: "Bannmagie",
  Conjuration: "Herbeirufung",
  Divination: "Erkenntnis",
  Enchantment: "Verzauberung",
  Evocation: "Hervorrufung",
  Illusion: "Illusion",
  Necromancy: "Nekromantie",
  Transmutation: "Verwandlung",
};

function normalizeAlias(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss");
}

function truncateSummary(text: string | undefined, maxLen = 340): string {
  if (!text?.trim()) return "";
  const cleaned = text.replace(/\*\*\*[^*]+\*\*\*/g, "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  const cut = cleaned.slice(0, maxLen);
  const lastPeriod = cut.lastIndexOf(".");
  if (lastPeriod > maxLen * 0.45) return cut.slice(0, lastPeriod + 1);
  return `${cut.trimEnd()}…`;
}

function uniqueAliases(parts: Array<string | undefined | null>): string[] {
  const set = new Set<string>();
  for (const part of parts) {
    if (!part?.trim()) continue;
    const normalized = normalizeAlias(part);
    if (normalized.length < 2) continue;
    set.add(normalized);
    if (normalized.includes("-")) set.add(normalized.replace(/-/g, " "));
  }
  return [...set];
}

function claimId(usedIds: Set<string>, preferred: string, fallbackPrefix: string): string {
  if (!usedIds.has(preferred)) {
    usedIds.add(preferred);
    return preferred;
  }
  const fallback = `${fallbackPrefix}-${preferred}`;
  if (!usedIds.has(fallback)) {
    usedIds.add(fallback);
    return fallback;
  }
  let index = 2;
  while (usedIds.has(`${fallback}-${index}`)) index += 1;
  const finalId = `${fallback}-${index}`;
  usedIds.add(finalId);
  return finalId;
}

function spellLevelLabelDe(level: number): string {
  return level === 0 ? "Zaubertrick" : `Grad ${level}`;
}

function spellLevelLabelEn(level: number): string {
  return level === 0 ? "Cantrip" : `Level ${level}`;
}

function buildSpellMetaDe(spell: SpellDefinition): string {
  const school = SCHOOL_DE[spell.school] ?? spell.school;
  const classes = spell.classes.map((id) => CLASS_NAME_DE[id]).join(", ");
  const flags = [
    spell.concentration ? "Konzentration" : null,
    spell.ritual ? "Ritual" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return [spellLevelLabelDe(spell.level), school, classes ? `Klassen: ${classes}` : null, flags || null]
    .filter(Boolean)
    .join(" · ");
}

function buildSpellMetaEn(spell: SpellDefinition): string {
  const classes = spell.classes.map((id) => CLASS_NAME_EN[id]).join(", ");
  const flags = [
    spell.concentration ? "Concentration" : null,
    spell.ritual ? "Ritual" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return [
    spellLevelLabelEn(spell.level),
    spell.school,
    classes ? `Classes: ${classes}` : null,
    flags || null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function buildClassFeatureEntry(
  feature: ProgressionFeature,
  opts: {
    classId: ClassId;
    classNameDe: string;
    classNameEn: string;
    subclassId?: string;
    subclassNameDe?: string;
    subclassNameEn?: string;
    usedIds: Set<string>;
  },
): QuickRuleEntry {
  const {
    classId,
    classNameDe,
    classNameEn,
    subclassId,
    subclassNameDe,
    subclassNameEn,
    usedIds,
  } = opts;

  const idPrefix = subclassId ? `${classId}-${subclassId}` : classId;
  const id = claimId(usedIds, feature.id, idPrefix);

  const titleDe = subclassNameDe
    ? `${feature.nameDe} (${classNameDe} — ${subclassNameDe}, Stufe ${feature.level})`
    : `${feature.nameDe} (${classNameDe}, Stufe ${feature.level})`;
  const titleEn = subclassNameEn
    ? `${feature.nameEn} (${classNameEn} — ${subclassNameEn}, Level ${feature.level})`
    : `${feature.nameEn} (${classNameEn}, Level ${feature.level})`;

  const source = subclassNameDe
    ? `PHB 2024 — ${classNameDe} (${subclassNameDe})`
    : `PHB 2024 — ${classNameDe}`;

  return {
    id,
    category: "class-feature",
    titleDe,
    titleEn,
    summaryDe: truncateSummary(feature.descriptionDe),
    summaryEn: truncateSummary(feature.descriptionEn),
    aliases: uniqueAliases([
      feature.nameDe,
      feature.nameEn,
      feature.id,
      classNameDe,
      classNameEn,
      subclassNameDe,
      subclassNameEn,
      `${feature.nameDe} ${classNameDe}`,
      `${feature.nameEn} ${classNameEn}`,
    ]),
    source,
    rulesEdition: DND_2024_RULES_EDITION,
  };
}

function buildFeatEntry(feat: FeatDefinition, usedIds: Set<string>): QuickRuleEntry {
  const id = claimId(usedIds, feat.id, "feat");

  const prereqDe = feat.prerequisiteDe ? ` Voraussetzung: ${feat.prerequisiteDe}.` : "";
  const prereqEn = feat.prerequisiteEn ? ` Prerequisite: ${feat.prerequisiteEn}.` : "";

  return {
    id,
    category: "feat",
    titleDe: feat.nameDe,
    titleEn: feat.nameEn,
    summaryDe: `${truncateSummary(feat.descriptionDe)}${prereqDe}`.trim(),
    summaryEn: `${truncateSummary(feat.descriptionEn)}${prereqEn}`.trim(),
    aliases: uniqueAliases([
      feat.nameDe,
      feat.nameEn,
      feat.id,
      "talent",
      "feat",
      `${feat.nameDe} talent`,
      `${feat.nameEn} feat`,
    ]),
    source: `${SOURCE} — Talente`,
    rulesEdition: DND_2024_RULES_EDITION,
  };
}

function buildSpellEntry(spell: SpellDefinition, usedIds: Set<string>): QuickRuleEntry {
  const id = claimId(usedIds, spell.id, "spell");

  const bodyDe = truncateSummary(spell.descriptionDe, 280);
  const bodyEn = truncateSummary(spell.descriptionEn, 280);

  return {
    id,
    category: "spell",
    titleDe: spell.nameDe,
    titleEn: spell.nameEn,
    summaryDe: `${buildSpellMetaDe(spell)}. ${bodyDe}`.trim(),
    summaryEn: `${buildSpellMetaEn(spell)}. ${bodyEn}`.trim(),
    aliases: uniqueAliases([
      spell.nameDe,
      spell.nameEn,
      spell.id,
      "zauber",
      "spell",
      spellLevelLabelDe(spell.level),
      spellLevelLabelEn(spell.level),
      SCHOOL_DE[spell.school],
      spell.school,
      ...spell.classes.flatMap((classId) => [CLASS_NAME_DE[classId], CLASS_NAME_EN[classId]]),
    ]),
    source: `${SOURCE} — Zauber`,
    rulesEdition: DND_2024_RULES_EDITION,
  };
}

/** Build quick-rulebook entries from the D&D 2024 progression catalog (classes, feats, spells). */
export function buildCatalogQuickRules(reservedIds: Iterable<string> = []): QuickRuleEntry[] {
  const usedIds = new Set<string>(reservedIds);
  const entries: QuickRuleEntry[] = [];

  for (const classProg of getAllClassProgressions()) {
    for (const feature of classProg.features) {
      entries.push(
        buildClassFeatureEntry(feature, {
          classId: classProg.id,
          classNameDe: classProg.nameDe,
          classNameEn: classProg.nameEn,
          usedIds,
        }),
      );
    }

    for (const subclass of classProg.subclasses ?? []) {
      for (const feature of subclass.features) {
        entries.push(
          buildClassFeatureEntry(feature, {
            classId: classProg.id,
            classNameDe: classProg.nameDe,
            classNameEn: classProg.nameEn,
            subclassId: subclass.id,
            subclassNameDe: subclass.nameDe,
            subclassNameEn: subclass.nameEn,
            usedIds,
          }),
        );
      }
    }
  }

  for (const feat of getFeats()) {
    entries.push(buildFeatEntry(feat, usedIds));
  }

  for (const spell of getSpells()) {
    entries.push(buildSpellEntry(spell, usedIds));
  }

  return entries;
}
