/**
 * Charakter-TÜV — Typen & Hilfen für KI-gestützte Blattprüfung (D&D 2024).
 */

import {
  ABILITY_KEYS,
  ABILITY_LABELS_DE,
  ABILITY_LABELS_EN,
  type AbilityKey,
  type Dnd5eSkillEntry,
  type Dnd5eSkillKey,
  type SkillProficiency,
} from "./types";
import { DND5E_SKILLS, DND5E_SKILL_BY_KEY } from "./skills";
import type { Dnd5eEquipmentState, Dnd5eEquipmentSlot } from "./equipment-types";
import {
  DND5E_EQUIPMENT_SLOTS,
  DND5E_GENERAL_EQUIPMENT_SLOTS,
  EQUIPMENT_SLOT_LABELS_DE,
  EQUIPMENT_SLOT_LABELS_EN,
  GENERAL_SLOT_LABELS_DE,
  GENERAL_SLOT_LABELS_EN,
} from "./equipment-types";
import { parseDnd5eMetaFromDescription, stripMachineTags } from "./item-meta";
import { resolveCharacterItemStats } from "./item-resolve";
import type { CharacterItem } from "@/src/types/inventory";
import { clampExhaustionLevel, exhaustionD20Penalty } from "./exhaustion";
import {
  abilityModifier,
  formatSigned,
  proficiencyBonus,
  skillProficiencyBonus,
  skillTotalModifier,
} from "./formulas";
import {
  BACKGROUND_SOURCE,
  classFeaturesUpToLevel,
  getClassProgression,
  matchSubclassOption,
  resolveClassId,
} from "./progression";
import type { ProgressionFeature } from "./progression/types";

export type CharacterTuvFindingSeverity = "error" | "warning" | "hint" | "info";

export type CharacterTuvFinding = {
  id: string;
  severity: CharacterTuvFindingSeverity;
  /** z. B. attributes | combat | skills | saves | features | overrides | hp | level */
  category: string;
  title: string;
  detail: string;
  /** Pfad im Sheet, z. B. combat.acOverride */
  fieldPath?: string | null;
  resolved?: boolean;
};

export type CharacterTuvQuestion = {
  id: string;
  findingId?: string | null;
  prompt: string;
  fieldPath?: string | null;
  required: boolean;
};

export type CharacterTuvStatus =
  | "idle"
  | "checked"
  | "pending_answers"
  | "answered"
  | "clean";

export type CharacterTuvState = {
  checkedAt: string | null;
  status: CharacterTuvStatus;
  findings: CharacterTuvFinding[];
  questions: CharacterTuvQuestion[];
  /** questionId → Antworttext */
  answers: Record<string, string>;
  /** Offene Hinweise (ungelöste Findings + unbeantwortete Pflichtfragen) */
  openHintCount: number;
  /** Anzahl Findings beim letzten Check (ohne resolved) */
  totalHintCount: number;
  summary?: string | null;
};

/** Übungsstatus — menschenlesbar für Snapshot + Findings. */
export const SKILL_PROFICIENCY_LABELS: Record<
  SkillProficiency,
  { labelDe: string; labelEn: string }
> = {
  none: { labelDe: "keine Übung", labelEn: "none" },
  half: { labelDe: "halbe Übung", labelEn: "half proficiency" },
  proficient: { labelDe: "geübt", labelEn: "proficient" },
  expertise: { labelDe: "Expertise (doppelt geübt)", labelEn: "expertise" },
};

export function skillProficiencyDisplay(
  proficiency: SkillProficiency,
  locale: "de" | "en" = "de",
): string {
  const labels = SKILL_PROFICIENCY_LABELS[proficiency] ?? SKILL_PROFICIENCY_LABELS.none;
  return locale === "en"
    ? `${labels.labelEn} (${labels.labelDe})`
    : `${labels.labelDe} (${labels.labelEn})`;
}

export function abilityDisplayName(
  key: AbilityKey,
  locale: "de" | "en" = "de",
): string {
  const de = ABILITY_LABELS_DE[key];
  const en = ABILITY_LABELS_EN[key];
  return locale === "en" ? `${en} (${de})` : `${de} (${en})`;
}

export function skillDisplayName(
  key: Dnd5eSkillKey,
  locale: "de" | "en" = "de",
): string {
  const def = DND5E_SKILL_BY_KEY[key];
  if (!def) return key;
  return locale === "en"
    ? `${def.labelEn} (${def.labelDe})`
    : `${def.labelDe} (${def.labelEn})`;
}

export type CharacterTuvEquipmentSummary = {
  torsoSlot: {
    slotKey: "chest";
    /** UI-Label (Ausrüstungs-Tab) */
    labelUi: "Torso";
    labelDe: string;
    labelEn: string;
    empty: boolean;
    itemId: string | null;
  };
  mainHand: { empty: boolean; itemId: string | null; labelDe: string; labelEn: string };
  offHand: { empty: boolean; itemId: string | null; labelDe: string; labelEn: string };
  /** true wenn Haupthand und Nebenhand leer */
  noWeaponsEquipped: boolean;
  /** true wenn Torso/chest leer → keine Rüstung in der RK-Berechnung */
  noTorsoArmorEquipped: boolean;
  slotsOverview: Array<{
    slotKey: Dnd5eEquipmentSlot;
    labelDe: string;
    labelEn: string;
    empty: boolean;
    itemId: string | null;
  }>;
  /** Angelegte Gegenstände (Slots + Gürtel + General), inkl. Magie-Hinweis für Attributprüfung */
  equippedItems: CharacterTuvEquippedItemSummary[];
  /** Nur magische angelegte Gegenstände */
  equippedMagicalItems: CharacterTuvEquippedItemSummary[];
  abilityGearNoteDe: string;
  abilityGearNoteEn: string;
};

export type CharacterTuvEquippedItemSummary = {
  itemId: string;
  slotKey: string;
  slotLabelDe: string;
  slotLabelEn: string;
  name: string;
  isMagical: boolean;
  attunement: boolean;
  attuned: boolean;
  effect: string | null;
  acBonus: number | null;
  magicalBonus: number | null;
  rarity: string | null;
};

/** Deterministische Nachrechnung einer Fertigkeit (Gesamt ≠ Übungsbonus allein). */
export type CharacterTuvSkillMathEntry = {
  key: Dnd5eSkillKey;
  displayName: string;
  abilityKey: AbilityKey;
  abilityDisplayName: string;
  abilityScore: number;
  abilityMod: number;
  proficiency: SkillProficiency;
  proficiencyDisplay: string;
  proficiencyBonusApplied: number;
  flatBonus: number;
  manualBonus: number;
  bonusOverride: number | null;
  exhaustionPenalty: number;
  expectedTotal: number;
  displayedTotal: number | null;
  mathOk: boolean;
  /** Klartext-Rechnung für KI / Findings */
  breakdown: string;
};

export type CharacterTuvSkillMathAudit = {
  proficiencyBonus: number;
  exhaustionPenalty: number;
  allMathOk: boolean;
  /** Verbindliche Formel — Gesamt niemals mit Übungsbonus allein vergleichen */
  formulaNoteDe: string;
  formulaNoteEn: string;
  skills: CharacterTuvSkillMathEntry[];
};

export type CharacterTuvFeatureChecklistEntry = {
  id: string;
  level: number;
  nameDe: string;
  nameEn: string;
  displayName: string;
  present: boolean;
  subclassScoped: boolean;
};

export type CharacterTuvFeatureChecklist = {
  classId: string | null;
  classDisplayName: string | null;
  subclassId: string | null;
  subclassDisplayName: string | null;
  level: number;
  subclassRequired: boolean;
  subclassMissing: boolean;
  catalogAvailable: boolean;
  expectedCount: number;
  presentCount: number;
  missing: CharacterTuvFeatureChecklistEntry[];
  /** Alle erwarteten Merkmale (inkl. vorhanden) — für die KI */
  expected: CharacterTuvFeatureChecklistEntry[];
  noteDe: string;
  noteEn: string;
};

function slotItemId(
  equipment: Dnd5eEquipmentState | null | undefined,
  slot: Dnd5eEquipmentSlot,
): string | null {
  const id = equipment?.slots?.[slot];
  return typeof id === "string" && id.trim() ? id : null;
}

function summarizeEquippedItems(
  equipment: Dnd5eEquipmentState | null | undefined,
  inventoryItems: Array<Pick<CharacterItem, "id" | "name" | "description">> | undefined,
): CharacterTuvEquippedItemSummary[] {
  if (!equipment || !inventoryItems?.length) return [];
  const byId = new Map(inventoryItems.map((i) => [i.id, i]));
  const attuned = new Set(equipment.attunedItemIds ?? []);
  const seen = new Set<string>();
  const out: CharacterTuvEquippedItemSummary[] = [];

  const push = (
    itemId: string | null | undefined,
    slotKey: string,
    slotLabelDe: string,
    slotLabelEn: string,
  ) => {
    if (!itemId || seen.has(itemId)) return;
    const item = byId.get(itemId);
    if (!item) return;
    seen.add(itemId);
    const stats = resolveCharacterItemStats(item as CharacterItem);
    const meta = parseDnd5eMetaFromDescription(item.description);
    const effectRaw =
      stats.effect?.trim() ||
      (item.description ? stripMachineTags(item.description).trim() : "") ||
      null;
    const effect =
      effectRaw && effectRaw.length > 220
        ? `${effectRaw.slice(0, 217)}…`
        : effectRaw;
    out.push({
      itemId,
      slotKey,
      slotLabelDe,
      slotLabelEn,
      name: item.name,
      isMagical: Boolean(stats.isMagical),
      attunement: Boolean(stats.attunement),
      attuned: attuned.has(itemId),
      effect,
      acBonus: stats.acBonus,
      magicalBonus: stats.magicalBonus,
      rarity: meta?.rarity ?? null,
    });
  };

  for (const slot of DND5E_EQUIPMENT_SLOTS) {
    push(
      slotItemId(equipment, slot),
      slot,
      slot === "chest" ? "Torso" : EQUIPMENT_SLOT_LABELS_DE[slot],
      EQUIPMENT_SLOT_LABELS_EN[slot],
    );
  }
  for (const slot of DND5E_GENERAL_EQUIPMENT_SLOTS) {
    const id = equipment.generalSlots?.[slot];
    push(
      typeof id === "string" ? id : null,
      slot,
      GENERAL_SLOT_LABELS_DE[slot],
      GENERAL_SLOT_LABELS_EN[slot],
    );
  }
  (equipment.belt ?? []).forEach((id, idx) => {
    push(
      id,
      `belt:${idx}`,
      `Gürtel ${idx + 1}`,
      `Belt ${idx + 1}`,
    );
  });

  return out;
}

export function buildCharacterTuvEquipmentSummary(
  equipment: Dnd5eEquipmentState | null | undefined,
  inventoryItems?: Array<Pick<CharacterItem, "id" | "name" | "description">>,
): CharacterTuvEquipmentSummary {
  const chestId = slotItemId(equipment, "chest");
  const mainId = slotItemId(equipment, "mainHand");
  const offId = slotItemId(equipment, "offHand");
  const noTorsoArmorEquipped = !chestId;
  const noWeaponsEquipped = !mainId && !offId;

  const slotsOverview = (
    [
      "head",
      "eyes",
      "neck",
      "shoulders",
      "chest",
      "hands",
      "wrists",
      "waist",
      "legs",
      "feet",
      "mainHand",
      "offHand",
      "ring1",
      "ring2",
    ] as Dnd5eEquipmentSlot[]
  ).map((slotKey) => {
    const itemId = slotItemId(equipment, slotKey);
    return {
      slotKey,
      labelDe:
        slotKey === "chest" ? "Torso" : EQUIPMENT_SLOT_LABELS_DE[slotKey],
      labelEn: EQUIPMENT_SLOT_LABELS_EN[slotKey],
      empty: !itemId,
      itemId,
    };
  });

  const equippedItems = summarizeEquippedItems(equipment, inventoryItems);
  const equippedMagicalItems = equippedItems.filter((i) => i.isMagical);

  return {
    torsoSlot: {
      slotKey: "chest",
      labelUi: "Torso",
      labelDe: "Torso",
      labelEn: "Torso",
      empty: noTorsoArmorEquipped,
      itemId: chestId,
    },
    mainHand: {
      empty: !mainId,
      itemId: mainId,
      labelDe: EQUIPMENT_SLOT_LABELS_DE.mainHand,
      labelEn: EQUIPMENT_SLOT_LABELS_EN.mainHand,
    },
    offHand: {
      empty: !offId,
      itemId: offId,
      labelDe: EQUIPMENT_SLOT_LABELS_DE.offHand,
      labelEn: EQUIPMENT_SLOT_LABELS_EN.offHand,
    },
    noWeaponsEquipped,
    noTorsoArmorEquipped,
    slotsOverview,
    equippedItems,
    equippedMagicalItems,
    abilityGearNoteDe:
      "Angelegte magische Gegenstände (equipmentSummary.equippedMagicalItems) können Attributwerte erhöhen oder senken. Werte wie Geschicklichkeit 13 bei einem Barbaren sind völlig gültig — keine Build-/Meta-Kritik.",
    abilityGearNoteEn:
      "Equipped magical items (equipmentSummary.equippedMagicalItems) can raise or lower ability scores. Scores like Dexterity 13 on a Barbarian are fully valid — never criticize builds or meta.",
  };
}

function readFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeFeatureMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

function parseSkillProficiency(raw: unknown): SkillProficiency {
  const s = String(raw ?? "none");
  if (s === "half" || s === "proficient" || s === "expertise" || s === "none") {
    return s;
  }
  return "none";
}

function featureDisplayName(
  nameDe: string,
  nameEn: string,
  locale: "de" | "en",
): string {
  if (locale === "en") {
    return nameDe && nameDe !== nameEn ? `${nameEn} (${nameDe})` : nameEn;
  }
  return nameEn && nameEn !== nameDe ? `${nameDe} (${nameEn})` : nameDe;
}

/** ASI / Epic Boon / generische Unterklassen-Platzhalter — keine prüfbaren Kernmerkmale. */
function isNonCheckableProgressionFeature(f: ProgressionFeature): boolean {
  if (
    /ability-score-improvement|(^|-)asi($|-)|epic-boon/i.test(f.id) ||
    /ability score improvement|epic boon/i.test(f.nameEn)
  ) {
    return true;
  }
  if (
    /^subclass feature$/i.test(f.nameEn.trim()) ||
    /^unterklassenmerkmal$/i.test(f.nameDe.trim()) ||
    /barbarian subclass|rogue subclass|wizard subclass|cleric subclass|fighter subclass|monk subclass|paladin subclass|ranger subclass|bard subclass|druid subclass|sorcerer subclass|warlock subclass/i.test(
      f.nameEn,
    ) ||
    /-path-improvement-|primal-path$|subclass$/i.test(f.id)
  ) {
    return true;
  }
  return false;
}

function sheetFeatureMatchesProgression(
  entry: {
    id?: string | null;
    name?: string | null;
    nameDe?: string | null;
    nameEn?: string | null;
  },
  f: ProgressionFeature,
): boolean {
  if (entry.id && entry.id === f.id) return true;
  if (entry.nameEn && entry.nameEn === f.nameEn) return true;
  if (entry.nameDe && entry.nameDe === f.nameDe) return true;
  const names = [entry.name, entry.nameDe, entry.nameEn].filter(
    (n): n is string => typeof n === "string" && n.trim().length > 0,
  );
  for (const name of names) {
    if (name === f.nameDe || name === f.nameEn) return true;
    const norm = normalizeFeatureMatch(name);
    if (
      norm === normalizeFeatureMatch(f.nameDe) ||
      norm === normalizeFeatureMatch(f.nameEn)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Deterministische Fertigkeits-Nachrechnung.
 * Gesamt = Attributmod + Übungsanteil + Flat-/Manuell-Bonus (+ Erschöpfung), nicht Übungsbonus allein.
 */
export function buildCharacterTuvSkillMathAudit(
  snapshot: CharacterTuvSheetSnapshot,
): CharacterTuvSkillMathAudit {
  const locale = snapshot.locale ?? "de";
  const level = Math.max(1, Math.floor(Number(snapshot.meta.level) || 1));
  const pb = proficiencyBonus(level);
  const combat = asRecord(asRecord(snapshot.sheet).combat);
  const exhaustionLevel = clampExhaustionLevel(combat.exhaustionLevel);
  const exhaustionPenalty = exhaustionD20Penalty(exhaustionLevel);

  const abilitiesRaw = asRecord(snapshot.sheet).abilities;
  const abilityScores: Record<AbilityKey, number> = {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  };
  if (Array.isArray(abilitiesRaw)) {
    for (const row of abilitiesRaw) {
      const r = asRecord(row);
      const key = String(r.key ?? "") as AbilityKey;
      if (ABILITY_KEYS.includes(key)) {
        abilityScores[key] = readFiniteNumber(r.score, 10);
      }
    }
  } else {
    const map = asRecord(abilitiesRaw);
    for (const key of ABILITY_KEYS) {
      abilityScores[key] = readFiniteNumber(asRecord(map[key]).score, 10);
    }
  }

  const sheetSkillsRaw = asRecord(snapshot.sheet).skills;
  const sheetSkillByKey = new Map<string, Record<string, unknown>>();
  if (Array.isArray(sheetSkillsRaw)) {
    for (const row of sheetSkillsRaw) {
      const r = asRecord(row);
      if (r.key) sheetSkillByKey.set(String(r.key), r);
    }
  } else {
    const map = asRecord(sheetSkillsRaw);
    for (const key of Object.keys(map)) {
      sheetSkillByKey.set(key, asRecord(map[key]));
    }
  }

  const derivedSkillsRaw = asRecord(snapshot.derived).skills;
  const derivedTotalByKey = new Map<string, number>();
  if (Array.isArray(derivedSkillsRaw)) {
    for (const row of derivedSkillsRaw) {
      const r = asRecord(row);
      if (r.key != null && typeof r.total === "number") {
        derivedTotalByKey.set(String(r.key), Math.round(r.total));
      }
    }
  } else {
    const map = asRecord(derivedSkillsRaw);
    for (const key of Object.keys(map)) {
      const total = asRecord(map[key]).total;
      if (typeof total === "number") {
        derivedTotalByKey.set(key, Math.round(total));
      }
    }
  }

  const formulaNoteDe =
    "Fertigkeitsgesamtwert = Attributmodifikator + Übungsanteil (0 / halber / voller / doppelter Übungsbonus) + Flat-Bonus + manueller Bonus + Erschöpfungsabzug. Niemals den Gesamtwert mit dem Übungsbonus allein vergleichen.";
  const formulaNoteEn =
    "Skill total = ability modifier + proficiency portion (0 / half / full / double proficiency bonus) + flat bonus + manual bonus + exhaustion penalty. Never compare the skill total to the proficiency bonus alone.";

  const skills: CharacterTuvSkillMathEntry[] = DND5E_SKILLS.map((def) => {
    const entryRaw = sheetSkillByKey.get(def.key) ?? {};
    const proficiency = parseSkillProficiency(
      entryRaw.proficient ?? entryRaw.proficiency,
    );
    const flatBonus = readFiniteNumber(entryRaw.flatBonus, 0);
    const manualBonus = readFiniteNumber(entryRaw.manualBonus, 0);
    const overrideRaw = entryRaw.bonusOverride;
    const bonusOverride =
      overrideRaw != null && overrideRaw !== "" && Number.isFinite(Number(overrideRaw))
        ? Math.round(Number(overrideRaw))
        : null;
    const abilityScore = abilityScores[def.ability];
    const abilityMod = abilityModifier(abilityScore);
    const proficiencyBonusApplied = skillProficiencyBonus(proficiency, pb);
    const skillEntry: Dnd5eSkillEntry = {
      proficient: proficiency,
      flatBonus,
      manualBonus,
      bonusOverride,
    };
    const expectedTotal =
      skillTotalModifier(abilityMod, skillEntry, pb) + exhaustionPenalty;
    const displayedTotal = derivedTotalByKey.has(def.key)
      ? (derivedTotalByKey.get(def.key) as number)
      : null;
    const mathOk =
      displayedTotal == null ? true : displayedTotal === expectedTotal;

    const abilityName = abilityDisplayName(def.ability, locale);
    const skillName = skillDisplayName(def.key, locale);
    let breakdown: string;
    if (bonusOverride != null) {
      breakdown =
        locale === "en"
          ? `${skillName}: manual override ${formatSigned(bonusOverride)}` +
            (exhaustionPenalty
              ? ` + exhaustion ${formatSigned(exhaustionPenalty)}`
              : "") +
            ` = ${formatSigned(expectedTotal)}`
          : `${skillName}: manueller Override ${formatSigned(bonusOverride)}` +
            (exhaustionPenalty
              ? ` + Erschöpfung ${formatSigned(exhaustionPenalty)}`
              : "") +
            ` = ${formatSigned(expectedTotal)}`;
    } else {
      const parts =
        locale === "en"
          ? [
              `${abilityName} modifier ${formatSigned(abilityMod)}`,
              `proficiency portion ${formatSigned(proficiencyBonusApplied)} (${skillProficiencyDisplay(proficiency, locale)})`,
            ]
          : [
              `${abilityName}-Modifikator ${formatSigned(abilityMod)}`,
              `Übungsanteil ${formatSigned(proficiencyBonusApplied)} (${skillProficiencyDisplay(proficiency, locale)})`,
            ];
      if (flatBonus) {
        parts.push(
          locale === "en"
            ? `flat bonus ${formatSigned(flatBonus)}`
            : `Flat-Bonus ${formatSigned(flatBonus)}`,
        );
      }
      if (manualBonus) {
        parts.push(
          locale === "en"
            ? `manual bonus ${formatSigned(manualBonus)}`
            : `manueller Bonus ${formatSigned(manualBonus)}`,
        );
      }
      if (exhaustionPenalty) {
        parts.push(
          locale === "en"
            ? `exhaustion ${formatSigned(exhaustionPenalty)}`
            : `Erschöpfung ${formatSigned(exhaustionPenalty)}`,
        );
      }
      breakdown = `${skillName}: ${parts.join(" + ")} = ${formatSigned(expectedTotal)}`;
    }

    return {
      key: def.key,
      displayName: skillName,
      abilityKey: def.ability,
      abilityDisplayName: abilityName,
      abilityScore,
      abilityMod,
      proficiency,
      proficiencyDisplay: skillProficiencyDisplay(proficiency, locale),
      proficiencyBonusApplied,
      flatBonus,
      manualBonus,
      bonusOverride,
      exhaustionPenalty,
      expectedTotal,
      displayedTotal,
      mathOk,
      breakdown,
    };
  });

  return {
    proficiencyBonus: pb,
    exhaustionPenalty,
    allMathOk: skills.every((s) => s.mathOk),
    formulaNoteDe,
    formulaNoteEn,
    skills,
  };
}

/**
 * Erwartete Klassen-/Unterklassenmerkmale aus dem Progressionskatalog vs. Blatt.
 */
export function buildCharacterTuvFeatureChecklist(
  snapshot: CharacterTuvSheetSnapshot,
): CharacterTuvFeatureChecklist {
  const locale = snapshot.locale ?? "de";
  const level = Math.max(1, Math.floor(Number(snapshot.meta.level) || 1));
  const classId = resolveClassId(snapshot.meta.class);
  const prog = classId ? getClassProgression(classId) : null;

  const emptyNoteDe =
    "Kein passender Klassenkatalog — Merkmale können nicht deterministisch geprüft werden.";
  const emptyNoteEn =
    "No matching class catalog — features cannot be verified deterministically.";

  if (!classId || !prog) {
    return {
      classId: null,
      classDisplayName: null,
      subclassId: null,
      subclassDisplayName: null,
      level,
      subclassRequired: false,
      subclassMissing: false,
      catalogAvailable: false,
      expectedCount: 0,
      presentCount: 0,
      missing: [],
      expected: [],
      noteDe: emptyNoteDe,
      noteEn: emptyNoteEn,
    };
  }

  const classDisplayName =
    locale === "en"
      ? `${prog.nameEn} (${prog.nameDe})`
      : `${prog.nameDe} (${prog.nameEn})`;

  const subclassOpt = matchSubclassOption(
    snapshot.meta.subclass,
    prog.subclasses ?? [],
  );
  const subclassRequired = level >= prog.subclassLevel;
  const subclassMissing = subclassRequired && !subclassOpt;
  const subclassId = subclassOpt?.id ?? null;
  const subclassDisplayName = subclassOpt
    ? locale === "en"
      ? `${subclassOpt.nameEn} (${subclassOpt.nameDe})`
      : `${subclassOpt.nameDe} (${subclassOpt.nameEn})`
    : null;

  const sheetFeatures = Array.isArray(snapshot.sheet.features)
    ? snapshot.sheet.features
    : [];

  const expectedRaw = classFeaturesUpToLevel(
    classId,
    level,
    subclassId ?? snapshot.meta.subclass,
  ).filter((f) => !isNonCheckableProgressionFeature(f));

  // Ohne Unterklasse: keine unterklassenspezifischen Merkmale verlangen
  const expectedFiltered = subclassOpt
    ? expectedRaw
    : expectedRaw.filter((f) => !f.subclass);

  const expected: CharacterTuvFeatureChecklistEntry[] = expectedFiltered.map(
    (f) => {
      const present = sheetFeatures.some((entry) =>
        sheetFeatureMatchesProgression(entry, f),
      );
      return {
        id: f.id,
        level: f.level,
        nameDe: f.nameDe,
        nameEn: f.nameEn,
        displayName: featureDisplayName(f.nameDe, f.nameEn, locale),
        present,
        subclassScoped: Boolean(f.subclass),
      };
    },
  );

  const missing = expected.filter((e) => !e.present);
  const presentCount = expected.filter((e) => e.present).length;

  const noteDe = subclassMissing
    ? `Klasse ${classDisplayName}, Stufe ${level}: Unterklasse fehlt — nur Basisklassenmerkmale geprüft. Bitte Unterklasse setzen, damit Merkmale ab Stufe ${prog.subclassLevel} vollständig geprüft werden.`
    : `Klasse ${classDisplayName}${subclassDisplayName ? `, Unterklasse ${subclassDisplayName}` : ""}, Stufe ${level}: ${presentCount}/${expected.length} erwartete Katalogmerkmale gefunden.`;
  const noteEn = subclassMissing
    ? `Class ${classDisplayName}, level ${level}: subclass missing — only base class features checked. Set a subclass so features from level ${prog.subclassLevel} can be fully verified.`
    : `Class ${classDisplayName}${subclassDisplayName ? `, subclass ${subclassDisplayName}` : ""}, level ${level}: ${presentCount}/${expected.length} expected catalog features found.`;

  return {
    classId,
    classDisplayName,
    subclassId,
    subclassDisplayName,
    level,
    subclassRequired,
    subclassMissing,
    catalogAvailable: true,
    expectedCount: expected.length,
    presentCount,
    missing,
    expected,
    noteDe,
    noteEn,
  };
}

export function buildDeterministicSkillMathFindings(
  snapshot: CharacterTuvSheetSnapshot,
): CharacterTuvFinding[] {
  const locale = snapshot.locale ?? "de";
  const audit = snapshot.skillMathAudit ?? buildCharacterTuvSkillMathAudit(snapshot);
  const mismatches = audit.skills.filter((s) => !s.mathOk);
  if (mismatches.length === 0) return [];

  const findings: CharacterTuvFinding[] = [];
  for (const s of mismatches.slice(0, 8)) {
    const displayed =
      s.displayedTotal == null ? "—" : formatSigned(s.displayedTotal);
    if (locale === "en") {
      findings.push({
        id: `det-skill-math-${s.key}`,
        severity: "error",
        category: "skills",
        title: `System issue: skill total mismatch — ${s.displayName}`,
        detail: [
          "This is a system calculation/display issue, not a player rule mistake.",
          `Expected ${formatSigned(s.expectedTotal)}, sheet shows ${displayed}.`,
          s.breakdown,
          audit.formulaNoteEn,
        ].join(" "),
        fieldPath: `skills.${s.key}`,
        resolved: false,
      });
    } else {
      findings.push({
        id: `det-skill-math-${s.key}`,
        severity: "error",
        category: "skills",
        title: `Systemproblem: Fertigkeitsgesamtwert weicht ab — ${s.displayName}`,
        detail: [
          "Das ist ein System-/Berechnungsproblem, kein Spielerfehler bei den Regeln.",
          `Erwartet ${formatSigned(s.expectedTotal)}, auf dem Blatt steht ${displayed}.`,
          s.breakdown,
          audit.formulaNoteDe,
        ].join(" "),
        fieldPath: `skills.${s.key}`,
        resolved: false,
      });
    }
  }
  return findings;
}

/** Harte Attributregeln: Wertebereich + Modifikator-Mathe — keine Build-Kritik. */
export function buildDeterministicAbilityFindings(
  snapshot: CharacterTuvSheetSnapshot,
): CharacterTuvFinding[] {
  const locale = snapshot.locale ?? "de";
  const derivedMap = asRecord(snapshot.derived);
  const derivedAbs = derivedMap.abilities;
  const derivedByKey = new Map<string, { score?: number; modifier?: number }>();
  if (Array.isArray(derivedAbs)) {
    for (const row of derivedAbs) {
      const r = asRecord(row);
      if (r.key) derivedByKey.set(String(r.key), r as { score?: number; modifier?: number });
    }
  } else {
    const map = asRecord(derivedAbs);
    for (const key of ABILITY_KEYS) {
      derivedByKey.set(key, asRecord(map[key]) as { score?: number; modifier?: number });
    }
  }

  const sheetAbs = asRecord(snapshot.sheet).abilities;
  const scores: Record<AbilityKey, number> = {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  };
  if (Array.isArray(sheetAbs)) {
    for (const row of sheetAbs) {
      const r = asRecord(row);
      const key = String(r.key ?? "") as AbilityKey;
      if (ABILITY_KEYS.includes(key)) scores[key] = readFiniteNumber(r.score, 10);
    }
  } else {
    const map = asRecord(sheetAbs);
    for (const key of ABILITY_KEYS) {
      scores[key] = readFiniteNumber(asRecord(map[key]).score, 10);
    }
  }

  const findings: CharacterTuvFinding[] = [];
  for (const key of ABILITY_KEYS) {
    const score = scores[key];
    const expectedMod = abilityModifier(score);
    const displayName = abilityDisplayName(key, locale);
    const derived = derivedByKey.get(key);
    const derivedMod =
      derived && typeof derived.modifier === "number"
        ? Math.round(derived.modifier)
        : null;

    if (score < 1 || score > 30) {
      findings.push({
        id: `det-ability-range-${key}`,
        severity: "error",
        category: "attributes",
        title:
          locale === "en"
            ? `Ability score out of range — ${displayName}`
            : `Attributwert außerhalb des erlaubten Bereichs — ${displayName}`,
        detail:
          locale === "en"
            ? `${displayName} is ${score}. Valid sheet values are 1–30 (magic items may explain high scores — check equippedMagicalItems).`
            : `${displayName} ist ${score}. Erlaubte Blattwerte sind 1–30 (magische Gegenstände können hohe Werte erklären — siehe equippedMagicalItems).`,
        fieldPath: `abilities.${key}.score`,
        resolved: false,
      });
    }

    if (derivedMod != null && derivedMod !== expectedMod) {
      findings.push({
        id: `det-ability-mod-${key}`,
        severity: "error",
        category: "attributes",
        title:
          locale === "en"
            ? `System issue: ability modifier mismatch — ${displayName}`
            : `Systemproblem: Attributmodifikator weicht ab — ${displayName}`,
        detail:
          locale === "en"
            ? `This is a system calculation issue. Score ${score} → expected modifier ${formatSigned(expectedMod)}, sheet shows ${formatSigned(derivedMod)}.`
            : `Das ist ein System-/Berechnungsproblem. Wert ${score} → erwarteter Modifikator ${formatSigned(expectedMod)}, auf dem Blatt steht ${formatSigned(derivedMod)}.`,
        fieldPath: `abilities.${key}`,
        resolved: false,
      });
    }
  }
  return findings;
}

export function buildDeterministicFeatureFindings(
  snapshot: CharacterTuvSheetSnapshot,
): CharacterTuvFinding[] {
  const locale = snapshot.locale ?? "de";
  const checklist =
    snapshot.featureChecklist ?? buildCharacterTuvFeatureChecklist(snapshot);
  if (!checklist.catalogAvailable) return [];

  const findings: CharacterTuvFinding[] = [];

  if (checklist.subclassMissing) {
    if (locale === "en") {
      findings.push({
        id: "det-features-subclass-missing",
        severity: "warning",
        category: "features",
        title: "Subclass missing — subclass features cannot be fully verified",
        detail: checklist.noteEn,
        fieldPath: "meta.subclass",
        resolved: false,
      });
    } else {
      findings.push({
        id: "det-features-subclass-missing",
        severity: "warning",
        category: "features",
        title: "Unterklasse fehlt — Unterklassenmerkmale nicht vollständig prüfbar",
        detail: checklist.noteDe,
        fieldPath: "meta.subclass",
        resolved: false,
      });
    }
  }

  if (checklist.missing.length === 0) return findings;

  const listed = checklist.missing.slice(0, 12);
  const more =
    checklist.missing.length > listed.length
      ? checklist.missing.length - listed.length
      : 0;
  const bullet = listed
    .map((m) =>
      locale === "en"
        ? `• Level ${m.level}: ${m.displayName}${m.subclassScoped ? " [subclass]" : ""}`
        : `• Stufe ${m.level}: ${m.displayName}${m.subclassScoped ? " [Unterklasse]" : ""}`,
    )
    .join("\n");
  const moreLine =
    more > 0
      ? locale === "en"
        ? `\n… and ${more} more.`
        : `\n… und ${more} weitere.`
      : "";

  const scopeNote =
    locale === "en"
      ? `Always verified against class${checklist.subclassDisplayName ? ` + subclass ${checklist.subclassDisplayName}` : ""} at level ${checklist.level}.`
      : `Immer geprüft gegen Klasse${checklist.subclassDisplayName ? ` + Unterklasse ${checklist.subclassDisplayName}` : ""} auf Stufe ${checklist.level}.`;

  if (locale === "en") {
    findings.push({
      id: "det-features-missing",
      severity: "warning",
      category: "features",
      title: `Missing expected class/subclass features (${checklist.missing.length})`,
      detail: [
        checklist.noteEn,
        scopeNote,
        "Compared against the D&D 2024 progression catalog for this class, subclass, and level.",
        "Missing:",
        bullet + moreLine,
        "Custom/manual features beyond the catalog are allowed and not flagged as errors.",
      ].join("\n"),
      fieldPath: "features",
      resolved: false,
    });
  } else {
    findings.push({
      id: "det-features-missing",
      severity: "warning",
      category: "features",
      title: `Fehlende erwartete Klassen-/Unterklassenmerkmale (${checklist.missing.length})`,
      detail: [
        checklist.noteDe,
        scopeNote,
        "Verglichen mit dem D&D-2024-Progressionskatalog für diese Klasse, Unterklasse und Stufe.",
        "Es fehlen:",
        bullet + moreLine,
        "Eigene/manuelle Merkmale außerhalb des Katalogs sind erlaubt und werden nicht als Fehler gemeldet.",
      ].join("\n"),
      fieldPath: "features",
      resolved: false,
    });
  }

  return findings;
}

/** True wenn previousAnswers bereits eine Erklärung zu diesem Feldpfad haben. */
export function hasPreviousAnswerForField(
  snapshot: CharacterTuvSheetSnapshot,
  fieldPath: string,
): boolean {
  const prev = snapshot.previousAnswers ?? {};
  return Boolean((prev[`field:${fieldPath}`] ?? "").trim());
}

/**
 * D&D 2024: Background (Herkunft) ist Pflicht.
 * Erkennung: leeres meta.background UND kein angewandtes Background-Feature auf dem Blatt.
 */
export function isCharacterBackgroundMissing(
  snapshot: CharacterTuvSheetSnapshot,
): boolean {
  const metaBg =
    typeof snapshot.meta.background === "string"
      ? snapshot.meta.background.trim()
      : "";
  if (metaBg.length > 0) return false;

  const features = Array.isArray(snapshot.sheet.features)
    ? snapshot.sheet.features
    : [];
  for (const f of features) {
    const source = typeof f.source === "string" ? f.source : "";
    if (source === BACKGROUND_SOURCE) return false;
    const id = typeof f.id === "string" ? f.id : "";
    if (/^bg-[a-z0-9-]+-(feature|equipment)$/i.test(id)) return false;
  }
  return true;
}

export function buildDeterministicBackgroundFindings(
  snapshot: CharacterTuvSheetSnapshot,
): CharacterTuvFinding[] {
  if (!isCharacterBackgroundMissing(snapshot)) return [];
  const locale = snapshot.locale ?? "de";
  if (locale === "en") {
    return [
      {
        id: "det-background-missing",
        severity: "warning",
        category: "level",
        title: "Background missing — required in D&D 2024",
        detail:
          "In Dungeons & Dragons 2024 (Player's Handbook 2024) every character needs a Background (Herkunft). None is set on this sheet (meta.background empty and no background feature found). Please choose a background in the character header.",
        fieldPath: "meta.background",
        resolved: false,
      },
    ];
  }
  return [
    {
      id: "det-background-missing",
      severity: "warning",
      category: "level",
      title: "Background (Herkunft) fehlt — in D&D 2024 Pflicht",
      detail:
        "In Dungeons & Dragons 2024 (Player's Handbook 2024) braucht jeder Charakter einen Background (Herkunft). Auf diesem Blatt ist keiner gesetzt (meta.background leer und kein Background-Merkmal gefunden). Bitte im Charakterkopf einen Background wählen.",
      fieldPath: "meta.background",
      resolved: false,
    },
  ];
}

type ManualBonusHit = {
  kind: "skill" | "save" | "skillOverride";
  key: string;
  displayName: string;
  value: number;
  fieldPath: string;
  findingId: string;
};

function collectManualBonusHits(
  snapshot: CharacterTuvSheetSnapshot,
): ManualBonusHit[] {
  const locale = snapshot.locale ?? "de";
  const hits: ManualBonusHit[] = [];

  const skillsRaw = asRecord(snapshot.sheet).skills;
  const skillRows: Array<Record<string, unknown>> = Array.isArray(skillsRaw)
    ? skillsRaw.map((r) => asRecord(r))
    : Object.entries(asRecord(skillsRaw)).map(([key, v]) => ({
        ...asRecord(v),
        key,
      }));

  for (const row of skillRows) {
    const key = String(row.key ?? "");
    if (!key || !DND5E_SKILL_BY_KEY[key as Dnd5eSkillKey]) continue;
    const displayName =
      typeof row.displayName === "string" && row.displayName.trim()
        ? row.displayName
        : skillDisplayName(key as Dnd5eSkillKey, locale);
    const manualBonus = readFiniteNumber(row.manualBonus, 0);
    if (manualBonus !== 0) {
      hits.push({
        kind: "skill",
        key,
        displayName,
        value: manualBonus,
        fieldPath: `skills.${key}.manualBonus`,
        findingId: `det-manual-bonus-skill-${key}`,
      });
    }
    const overrideRaw = row.bonusOverride;
    if (
      overrideRaw != null &&
      overrideRaw !== "" &&
      Number.isFinite(Number(overrideRaw))
    ) {
      const ov = Math.round(Number(overrideRaw));
      hits.push({
        kind: "skillOverride",
        key,
        displayName,
        value: ov,
        fieldPath: `skills.${key}.bonusOverride`,
        findingId: `det-bonus-override-skill-${key}`,
      });
    }
  }

  const savesRaw = asRecord(snapshot.sheet).savingThrows;
  const saveRows: Array<Record<string, unknown>> = Array.isArray(savesRaw)
    ? savesRaw.map((r) => asRecord(r))
    : Object.entries(asRecord(savesRaw)).map(([key, v]) => ({
        ...asRecord(v),
        key,
      }));

  for (const row of saveRows) {
    const key = String(row.key ?? "") as AbilityKey;
    if (!ABILITY_KEYS.includes(key)) continue;
    const displayName =
      typeof row.displayName === "string" && row.displayName.trim()
        ? row.displayName
        : abilityDisplayName(key, locale);
    const manualBonus = readFiniteNumber(row.manualBonus, 0);
    if (manualBonus !== 0) {
      hits.push({
        kind: "save",
        key,
        displayName,
        value: manualBonus,
        fieldPath: `savingThrows.${key}.manualBonus`,
        findingId: `det-manual-bonus-save-${key}`,
      });
    }
  }

  return hits;
}

/**
 * Jeder manuelle Bonus / Override ≠ 0 braucht Finding + Pflichtfrage
 * (außer previousAnswers erklären den fieldPath bereits).
 */
export function buildDeterministicManualBonusFindings(
  snapshot: CharacterTuvSheetSnapshot,
): CharacterTuvFinding[] {
  const locale = snapshot.locale ?? "de";
  const hits = collectManualBonusHits(snapshot).slice(0, 10);
  return hits.map((hit) => {
    const answered = hasPreviousAnswerForField(snapshot, hit.fieldPath);
    const signed = formatSigned(hit.value);
    if (locale === "en") {
      const what =
        hit.kind === "skillOverride"
          ? `manual total override ${signed}`
          : `manual bonus ${signed} in the bonus column`;
      const where =
        hit.kind === "save"
          ? `saving throw ${hit.displayName}`
          : `skill ${hit.displayName}`;
      return {
        id: hit.findingId,
        severity: "warning" as const,
        category: hit.kind === "save" ? "saves" : "overrides",
        title: `Unexplained ${hit.kind === "skillOverride" ? "override" : "manual bonus"} — ${hit.displayName}`,
        detail: [
          `The sheet has ${what} for ${where}.`,
          "Please explain the source (item, class/subclass feature, feat, spell, or other rule).",
          "Bonuses from items or features are fine once explained.",
        ].join(" "),
        fieldPath: hit.fieldPath,
        resolved: answered,
      };
    }
    const what =
      hit.kind === "skillOverride"
        ? `manueller Gesamt-Override ${signed}`
        : `manueller Bonus ${signed} in der Bonus-Spalte`;
    const where =
      hit.kind === "save"
        ? `Rettungswurf ${hit.displayName}`
        : `Fertigkeit ${hit.displayName}`;
    return {
      id: hit.findingId,
      severity: "warning" as const,
      category: hit.kind === "save" ? "saves" : "overrides",
      title: `Ungeklärter ${hit.kind === "skillOverride" ? "Override" : "manueller Bonus"} — ${hit.displayName}`,
      detail: [
        `Auf dem Blatt steht ${what} bei ${where}.`,
        "Bitte die Quelle erklären (Gegenstand, Klassen-/Unterklassenmerkmal, Talent, Zauber oder andere Regel).",
        "Boni durch Gegenstände oder Merkmale sind in Ordnung, sobald sie erklärt sind.",
      ].join(" "),
      fieldPath: hit.fieldPath,
      resolved: answered,
    };
  });
}

export function buildDeterministicBackgroundQuestions(
  snapshot: CharacterTuvSheetSnapshot,
): CharacterTuvQuestion[] {
  if (!isCharacterBackgroundMissing(snapshot)) return [];
  // Bereits beantwortet → keine erneute Frage; Finding bleibt bis Background gesetzt ist
  if (hasPreviousAnswerForField(snapshot, "meta.background")) return [];
  const locale = snapshot.locale ?? "de";
  return [
    {
      id: "q-det-background-missing",
      // Kein findingId: Antwort allein löst das Finding nicht auf — nur gesetzter Background
      findingId: null,
      prompt:
        locale === "en"
          ? "Which Background (Herkunft) should this character have? Please set one in the character header (required in D&D 2024)."
          : "Welchen Background (Herkunft) soll dieser Charakter haben? Bitte im Charakterkopf einen setzen (in D&D 2024 Pflicht).",
      fieldPath: "meta.background",
      required: true,
    },
  ];
}

export function buildDeterministicManualBonusQuestions(
  snapshot: CharacterTuvSheetSnapshot,
): CharacterTuvQuestion[] {
  const locale = snapshot.locale ?? "de";
  const hits = collectManualBonusHits(snapshot).slice(0, 10);
  const questions: CharacterTuvQuestion[] = [];
  for (const hit of hits) {
    if (hasPreviousAnswerForField(snapshot, hit.fieldPath)) continue;
    const signed = formatSigned(hit.value);
    if (locale === "en") {
      questions.push({
        id: `q-${hit.findingId}`,
        findingId: hit.findingId,
        prompt:
          hit.kind === "skillOverride"
            ? `Where does the manual total override ${signed} for skill ${hit.displayName} come from? (item, feature, feat, …)`
            : hit.kind === "save"
              ? `Where does the manual bonus ${signed} for saving throw ${hit.displayName} come from? (item, feature, feat, …)`
              : `Where does the manual bonus ${signed} in the bonus column for skill ${hit.displayName} come from? (item, feature, feat, …)`,
        fieldPath: hit.fieldPath,
        required: true,
      });
    } else {
      questions.push({
        id: `q-${hit.findingId}`,
        findingId: hit.findingId,
        prompt:
          hit.kind === "skillOverride"
            ? `Woher kommt der manuelle Gesamt-Override ${signed} bei der Fertigkeit ${hit.displayName}? (Gegenstand, Merkmal, Talent, …)`
            : hit.kind === "save"
              ? `Woher kommt der manuelle Bonus ${signed} beim Rettungswurf ${hit.displayName}? (Gegenstand, Merkmal, Talent, …)`
              : `Woher kommt der manuelle Bonus ${signed} in der Bonus-Spalte bei der Fertigkeit ${hit.displayName}? (Gegenstand, Merkmal, Talent, …)`,
        fieldPath: hit.fieldPath,
        required: true,
      });
    }
  }
  return questions;
}

/** Alle deterministischen TÜV-Findings (Ausrüstung, Mathe, Merkmale, Background, manuelle Boni). */
export function buildDeterministicCharacterTuvFindings(
  snapshot: CharacterTuvSheetSnapshot,
): CharacterTuvFinding[] {
  return [
    ...buildDeterministicEquipmentFindings(snapshot),
    ...buildDeterministicAbilityFindings(snapshot),
    ...buildDeterministicSkillMathFindings(snapshot),
    ...buildDeterministicFeatureFindings(snapshot),
    ...buildDeterministicBackgroundFindings(snapshot),
    ...buildDeterministicManualBonusFindings(snapshot),
  ];
}

/** Pflichtfragen aus deterministischen Checks (Background, manuelle Boni). */
export function buildDeterministicCharacterTuvQuestions(
  snapshot: CharacterTuvSheetSnapshot,
): CharacterTuvQuestion[] {
  return [
    ...buildDeterministicBackgroundQuestions(snapshot),
    ...buildDeterministicManualBonusQuestions(snapshot),
  ];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function enrichAbilityMap(
  raw: unknown,
  locale: "de" | "en",
): Array<Record<string, unknown>> {
  const map = asRecord(raw);
  return ABILITY_KEYS.map((key) => {
    const entry = asRecord(map[key]);
    return {
      ...entry,
      key,
      labelDe: ABILITY_LABELS_DE[key],
      labelEn: ABILITY_LABELS_EN[key],
      displayName: abilityDisplayName(key, locale),
    };
  });
}

function enrichSaveMap(
  raw: unknown,
  locale: "de" | "en",
): Array<Record<string, unknown>> {
  const map = asRecord(raw);
  return ABILITY_KEYS.map((key) => {
    const entry = asRecord(map[key]);
    const proficient = Boolean(entry.proficient);
    return {
      ...entry,
      key,
      labelDe: ABILITY_LABELS_DE[key],
      labelEn: ABILITY_LABELS_EN[key],
      displayName: abilityDisplayName(key, locale),
      proficient,
      proficiencyLabelDe: proficient ? "geübt" : "nicht geübt",
      proficiencyLabelEn: proficient ? "proficient" : "not proficient",
      proficiencyDisplay: proficient
        ? locale === "en"
          ? "proficient (geübt)"
          : "geübt (proficient)"
        : locale === "en"
          ? "not proficient (nicht geübt)"
          : "nicht geübt (not proficient)",
    };
  });
}

function enrichSkillMap(
  raw: unknown,
  locale: "de" | "en",
): Array<Record<string, unknown>> {
  const map = asRecord(raw);
  return DND5E_SKILLS.map((def) => {
    const entry = asRecord(map[def.key]);
    const proficiency = (String(entry.proficient ?? "none") ||
      "none") as SkillProficiency;
    const safeProf: SkillProficiency =
      proficiency === "half" ||
      proficiency === "proficient" ||
      proficiency === "expertise" ||
      proficiency === "none"
        ? proficiency
        : "none";
    const ability = (entry.ability as AbilityKey) || def.ability;
    const labels = SKILL_PROFICIENCY_LABELS[safeProf];
    return {
      ...entry,
      key: def.key,
      labelDe: def.labelDe,
      labelEn: def.labelEn,
      displayName: skillDisplayName(def.key, locale),
      abilityKey: ability,
      abilityLabelDe: ABILITY_LABELS_DE[ability],
      abilityLabelEn: ABILITY_LABELS_EN[ability],
      abilityDisplayName: abilityDisplayName(ability, locale),
      proficiency: safeProf,
      /** Rohwert nur für Maschinen — in Texten proficiencyDisplay nutzen */
      proficient: safeProf,
      proficiencyLabelDe: labels.labelDe,
      proficiencyLabelEn: labels.labelEn,
      proficiencyDisplay: skillProficiencyDisplay(safeProf, locale),
    };
  });
}

function enrichDerived(
  derived: unknown,
  locale: "de" | "en",
): Record<string, unknown> {
  const d = asRecord(derived);
  return {
    ...d,
    abilities: enrichAbilityMap(d.abilities, locale),
    savingThrows: enrichSaveMap(d.savingThrows, locale),
    skills: enrichSkillMap(d.skills, locale),
  };
}

/**
 * Ersetzt interne Skill-/Attribut-Keys und ungeklärte EN-Übungsbegriffe
 * in TÜV-Texten durch menschenlesbare DE (+ EN) Namen.
 */
export function humanizeCharacterTuvText(
  text: string,
  locale: "de" | "en" = "de",
): string {
  if (!text) return text;
  let out = text;

  // Längere Skill-Keys zuerst (surv vor kürzeren)
  const skillKeys = [...DND5E_SKILLS.map((s) => s.key)].sort(
    (a, b) => b.length - a.length,
  );
  for (const key of skillKeys) {
    const display = skillDisplayName(key, locale);
    // 'itm', "itm", `itm`, sowie freistehende Keys
    out = out.replace(
      new RegExp(`['"\`]${key}['"\`]`, "gi"),
      locale === "en" ? `"${display}"` : `„${display}“`,
    );
    out = out.replace(new RegExp(`\\b${key}\\b`, "gi"), display);
  }

  for (const key of ABILITY_KEYS) {
    const display = abilityDisplayName(key, locale);
    out = out.replace(
      new RegExp(`['"\`]${key}['"\`]`, "gi"),
      locale === "en" ? `"${display}"` : `„${display}“`,
    );
    out = out.replace(new RegExp(`\\b${key}\\b`, "gi"), display);
  }

  // Übungsstatus — Rohbegriffe, nicht bereits in Klammern erklärte Formen
  if (locale === "en") {
    out = out.replace(
      /(?<!\()\bexpertise\b(?!\))/gi,
      "expertise (Expertise / doppelt geübt)",
    );
    out = out.replace(/(?<!\()\bproficient\b(?!\))/gi, "proficient (geübt)");
    out = out.replace(
      /(?<!\()\bhalf(?:\s+proficiency)?\b(?!\))/gi,
      "half proficiency (halbe Übung)",
    );
  } else {
    out = out.replace(
      /(?<!\()\bexpertise\b(?!\)|\s*\/)/gi,
      "Expertise / doppelt geübt (expertise)",
    );
    out = out.replace(/(?<!\()\bproficient\b(?!\))/gi, "geübt (proficient)");
    out = out.replace(
      /(?<!\()\bhalf(?:\s+proficiency)?\b(?!\))/gi,
      "halbe Übung (half proficiency)",
    );
  }

  return out;
}

export function humanizeCharacterTuvFinding(
  finding: CharacterTuvFinding,
  locale: "de" | "en",
): CharacterTuvFinding {
  return {
    ...finding,
    title: humanizeCharacterTuvText(finding.title, locale),
    detail: humanizeCharacterTuvText(finding.detail, locale),
  };
}

export function humanizeCharacterTuvQuestion(
  question: CharacterTuvQuestion,
  locale: "de" | "en",
): CharacterTuvQuestion {
  return {
    ...question,
    prompt: humanizeCharacterTuvText(question.prompt, locale),
  };
}

/** Deterministische Hinweise zu leerem Torso und fehlenden Waffen. */
export function buildDeterministicEquipmentFindings(
  snapshot: CharacterTuvSheetSnapshot,
): CharacterTuvFinding[] {
  const eq = snapshot.equipmentSummary;
  if (!eq) return [];

  const locale = snapshot.locale ?? "de";
  const derived = asRecord(snapshot.derived);
  const acRaw = derived.ac;
  const ac =
    typeof acRaw === "number" && Number.isFinite(acRaw) ? Math.round(acRaw) : null;
  const findings: CharacterTuvFinding[] = [];

  if (eq.noTorsoArmorEquipped) {
    if (locale === "en") {
      findings.push({
        id: "det-empty-torso",
        severity: "hint",
        category: "combat",
        title: "Torso slot empty — no armor in Armor Class",
        detail: [
          "The equipment slot „Torso“ (chest) is empty — no armor is equipped there.",
          "Therefore the Armor Class (Rüstungsklasse) is calculated without an armor base value,",
          "typically 10 + Dexterity modifier (Geschicklichkeitsmodifikator),",
          "or Unarmored Defense (Ungepanzerte Verteidigung) for classes such as Barbarian (Barbar) or Monk (Mönch).",
          ac != null
            ? `Current Armor Class (Rüstungsklasse) on the sheet: ${ac}.`
            : null,
        ]
          .filter(Boolean)
          .join(" "),
        fieldPath: "equipment.slots.chest",
        resolved: false,
      });
    } else {
      findings.push({
        id: "det-empty-torso",
        severity: "hint",
        category: "combat",
        title: "Torso-Slot leer — keine Rüstung in der Rüstungsklasse",
        detail: [
          "Im Ausrüstungs-Slot „Torso“ ist nichts angelegt — es ist keine Rüstung (Armor) ausgerüstet.",
          "Die Rüstungsklasse (Armor Class) wird daher ohne Rüstungs-Basiswert berechnet,",
          "typischerweise 10 + Geschicklichkeitsmodifikator (Dexterity modifier),",
          "bzw. Unarmored Defense / Ungepanzerte Verteidigung bei Klassen wie Barbar (Barbarian) oder Mönch (Monk).",
          ac != null
            ? `Aktuelle Rüstungsklasse (Armor Class) laut Blatt: ${ac}.`
            : null,
        ]
          .filter(Boolean)
          .join(" "),
        fieldPath: "equipment.slots.chest",
        resolved: false,
      });
    }
  }

  if (eq.noWeaponsEquipped) {
    if (locale === "en") {
      findings.push({
        id: "det-no-weapons",
        severity: "hint",
        category: "combat",
        title: "No weapons equipped",
        detail:
          "Neither Main Hand (Haupthand) nor Off Hand (Nebenhand) has a weapon equipped. For melee or ranged combat there is currently no equipped weapon.",
        fieldPath: "equipment.slots.mainHand",
        resolved: false,
      });
    } else {
      findings.push({
        id: "det-no-weapons",
        severity: "hint",
        category: "combat",
        title: "Keine Waffen angelegt",
        detail:
          "Weder Haupthand (Main Hand) noch Nebenhand (Off Hand) haben eine Waffe ausgerüstet. Für Nah- oder Fernkampf fehlt damit aktuell eine angelegte Waffe.",
        fieldPath: "equipment.slots.mainHand",
        resolved: false,
      });
    }
  }

  return findings;
}

/**
 * Entfernt KI-Findings, die dieselben Equipment-Hinweise schon abdecken
 * (deterministische Findings haben Vorrang).
 */
export function dedupeEquipmentFindingsAgainstDeterministic(
  aiFindings: CharacterTuvFinding[],
  deterministicIds: Set<string>,
): CharacterTuvFinding[] {
  const hasTorso = deterministicIds.has("det-empty-torso");
  const hasWeapons = deterministicIds.has("det-no-weapons");
  if (!hasTorso && !hasWeapons) return aiFindings;

  return aiFindings.filter((f) => {
    const blob = `${f.fieldPath ?? ""} ${f.title} ${f.detail}`.toLowerCase();
    if (
      hasTorso &&
      (/equipment\.slots\.chest|torso|brust|keine\s+rüstung|no\s+armor|unarmored|ungepanzerte/i.test(
        blob,
      ) &&
        /leer|empty|ohne|not\s+equipped|nicht\s+angelegt|keine\s+rüstung/i.test(blob))
    ) {
      return false;
    }
    if (
      hasWeapons &&
      (/keine\s+waffe|no\s+weapon|ohne\s+waffe|main\s*hand|haupthand|nebenhand|off\s*hand/i.test(
        blob,
      ) &&
        /leer|empty|keine|ohne|not\s+equipped|nicht\s+angelegt/i.test(blob))
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Entfernt KI-False-Positives zu Fertigkeitsgesamtwerten vs. Übungsbonus allein,
 * sowie vage „bitte Stufe-X-Merkmale prüfen“-Hinweise ohne konkrete Namen.
 */
export function filterFalsePositiveAiFindings(
  snapshot: CharacterTuvSheetSnapshot,
  aiFindings: CharacterTuvFinding[],
): CharacterTuvFinding[] {
  const skillAudit =
    snapshot.skillMathAudit ?? buildCharacterTuvSkillMathAudit(snapshot);
  const featureChecklist =
    snapshot.featureChecklist ?? buildCharacterTuvFeatureChecklist(snapshot);
  const hasDetFeatures = featureChecklist.catalogAvailable;

  return aiFindings.filter((f) => {
    const blob = `${f.category} ${f.title} ${f.detail}`;
    const lower = blob.toLowerCase();

    // Skill total vs proficiency bonus alone — only drop when math is correct
    if (skillAudit.allMathOk) {
      const skillish =
        /skills?|fertigkeit|einschüchtern|intimidation|nachforschung|investigation|wahrnehmung|perception|überreden|persuasion|athletik|acrobatics/i.test(
          blob,
        ) || f.category.toLowerCase() === "skills";
      const comparesTotalToPbAlone =
        skillish &&
        /(übungsbonus|proficiency\s*bonus|(?<![a-zäöü])pb(?![a-zäöü]))/i.test(
          blob,
        ) &&
        /(gesamt|total|modifikator|modifier)/i.test(blob) &&
        /(nicht\s+(überein)?stimm|passen\s+nicht|don'?t\s+match|does\s+not\s+match|abweich|fehler|error|mismatch|mögliche[rn]?\s+berechnung)/i.test(
          blob,
        );
      if (comparesTotalToPbAlone) return false;
    }

    // Vague "verify level X features" without naming what's missing
    if (hasDetFeatures && (f.category.toLowerCase() === "features" || /merkmal|feature|kernmerkmal/i.test(blob))) {
      const vagueVerify =
        /(sollte\s+)?(prüfen|verify|check|überprüfen).{0,40}(stufe|level)\s*\d+/i.test(
          blob,
        ) ||
        /(stufe|level)\s*\d+.{0,40}(prüfen|verify|check|korrekt|richtig|vollständig)/i.test(
          blob,
        ) ||
        /fehlende\s+kernmerkmale/i.test(lower) ||
        /missing\s+core\s+features/i.test(lower) ||
        /should\s+verify\s+whether/i.test(lower);
      const namesConcreteMissing =
        featureChecklist.missing.length > 0 &&
        featureChecklist.missing.some(
          (m) =>
            lower.includes(m.nameDe.toLowerCase()) ||
            lower.includes(m.nameEn.toLowerCase()),
        );
      // Drop vague feature nags; deterministic findings already list concrete names
      if (vagueVerify && !namesConcreteMissing) return false;
      // Also drop generic "features present but verify…" when checklist has no missing
      if (
        featureChecklist.missing.length === 0 &&
        !featureChecklist.subclassMissing &&
        /(kernmerkmal|core\s+feature|klassenmerkmal|class\s+feature)/i.test(blob) &&
        /(prüfen|verify|check|sollte|should)/i.test(blob)
      ) {
        return false;
      }
    }

    // Build/playstyle/optimization nags about ability scores — never keep
    const abilityish =
      f.category.toLowerCase() === "attributes" ||
      /attribut|ability\s*score|stärke|strength|geschick|dexterity|konstitution|constitution|intelligenz|intelligence|weisheit|wisdom|charisma/i.test(
        blob,
      );
    if (abilityish) {
      const playstyleNag =
        /untypisch|atypical|unplausibel|implausible|suboptimal|nicht\s+optimal|playstyle|spielstil|oft\s+höher|usually\s+higher|typically\s+higher|dump\s+stat|archetyp|meta\b|build\b|für\s+einen\s+barbar|for\s+a\s+barbarian|für\s+einen\s+(kämpfer|magier|schurken|waldläufer|paladin|mönch|barde|kleriker|druiden|hexer|zauberer)|affect\s+playstyle|beeinflussen\s+den\s+spielstil|könnte\s+den\s+spielstil/i.test(
          blob,
        );
      const hardRule =
        /modifikator\s*(stimmt\s+nicht|weicht|falsch)|modifier\s*(mismatch|wrong|incorrect)|außerhalb|out\s+of\s+range|unter\s+1|über\s+30|below\s+1|above\s+30|floor\s*\(\s*\(\s*wert/i.test(
          blob,
        );
      if (playstyleNag && !hardRule) return false;
    }

    // Background fehlt: deterministische Prüfung hat Vorrang — KI-Duplikate droppen
    if (
      isCharacterBackgroundMissing(snapshot) &&
      /background|herkunft/i.test(blob) &&
      /(fehlt|missing|leer|empty|nicht\s+gesetzt|not\s+set|pflicht|required)/i.test(
        blob,
      )
    ) {
      return false;
    }

    return true;
  });
}

export function createEmptyCharacterTuvState(): CharacterTuvState {
  return {
    checkedAt: null,
    status: "idle",
    findings: [],
    questions: [],
    answers: {},
    openHintCount: 0,
    totalHintCount: 0,
    summary: null,
  };
}

export function parseCharacterTuvState(raw: unknown): CharacterTuvState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<CharacterTuvState>;
  const findings = Array.isArray(o.findings) ? (o.findings as CharacterTuvFinding[]) : [];
  const questions = Array.isArray(o.questions)
    ? (o.questions as CharacterTuvQuestion[])
    : [];
  const answers =
    o.answers && typeof o.answers === "object" && !Array.isArray(o.answers)
      ? (o.answers as Record<string, string>)
      : {};

  const base: CharacterTuvState = {
    checkedAt: typeof o.checkedAt === "string" ? o.checkedAt : null,
    status: (o.status as CharacterTuvStatus) ?? "idle",
    findings,
    questions,
    answers,
    openHintCount: Number(o.openHintCount) || 0,
    totalHintCount: Number(o.totalHintCount) || 0,
    summary: typeof o.summary === "string" ? o.summary : null,
  };
  return {
    ...base,
    openHintCount: computeOpenHintCount(base),
  };
}

export function computeOpenHintCount(state: Pick<
  CharacterTuvState,
  "findings" | "questions" | "answers"
>): number {
  const unresolvedFindings = state.findings.filter(
    (f) => !f.resolved && f.severity !== "info",
  ).length;
  const unansweredRequired = state.questions.filter((q) => {
    if (!q.required) return false;
    const a = (state.answers[q.id] ?? "").trim();
    return a.length === 0;
  }).length;
  return unresolvedFindings + unansweredRequired;
}

export function withAnswersApplied(
  state: CharacterTuvState,
  answers: Record<string, string>,
): CharacterTuvState {
  const mergedAnswers = { ...state.answers, ...answers };
  const answeredFindingIds = new Set<string>();
  for (const q of state.questions) {
    if ((mergedAnswers[q.id] ?? "").trim().length > 0 && q.findingId) {
      answeredFindingIds.add(q.findingId);
    }
  }
  const findings = state.findings.map((f) =>
    answeredFindingIds.has(f.id) ? { ...f, resolved: true } : f,
  );
  const next: CharacterTuvState = {
    ...state,
    answers: mergedAnswers,
    findings,
  };
  const openHintCount = computeOpenHintCount(next);
  const unansweredRequired = next.questions.some(
    (q) => q.required && !(mergedAnswers[q.id] ?? "").trim(),
  );
  return {
    ...next,
    openHintCount,
    status:
      openHintCount === 0
        ? "clean"
        : unansweredRequired
          ? "pending_answers"
          : "answered",
  };
}

export function withFindingResolved(
  state: CharacterTuvState,
  findingId: string,
): CharacterTuvState {
  const findings = state.findings.map((f) =>
    f.id === findingId ? { ...f, resolved: true } : f,
  );
  const next = { ...state, findings };
  const openHintCount = computeOpenHintCount(next);
  return {
    ...next,
    openHintCount,
    status: openHintCount === 0 ? "clean" : next.status === "idle" ? "checked" : next.status,
  };
}

/** Schlankes Snapshot für die KI (ohne schwere Equipment-Container-Details). */
export type CharacterTuvSheetSnapshot = {
  meta: {
    name: string;
    class: string | null;
    subclass: string | null;
    race: string | null;
    background: string | null;
    level: number;
    experiencePoints: number;
  };
  sheet: {
    abilities: unknown;
    savingThrows: unknown;
    skills: unknown;
    combat: unknown;
    proficiencies: unknown;
    features: Array<{
      id?: string | null;
      name: string;
      nameDe?: string | null;
      nameEn?: string | null;
      source?: string | null;
    }>;
    spells?: Array<{ name: string; level: number; prepared?: boolean }>;
    attacks: unknown;
    spellcasting?: unknown;
    classResources?: unknown;
    notes?: string | null;
  };
  /** Ausrüstungsslots (Torso/Waffen) — für deterministische Hinweise */
  equipmentSummary?: CharacterTuvEquipmentSummary;
  /** Deterministische Fertigkeits-Nachrechnung (Gesamt ≠ Übungsbonus allein) */
  skillMathAudit?: CharacterTuvSkillMathAudit;
  /** Erwartete Klassenmerkmale vs. Blatt */
  featureChecklist?: CharacterTuvFeatureChecklist;
  /** Kurze Legende: interne Keys → Anzeigenamen (Fallback für die KI) */
  labelLegend?: {
    skills: Array<{ key: string; labelDe: string; labelEn: string; displayName: string }>;
    abilities: Array<{ key: string; labelDe: string; labelEn: string; displayName: string }>;
    proficiencyStates: Array<{
      key: string;
      labelDe: string;
      labelEn: string;
      displayName: string;
    }>;
  };
  derived: unknown;
  previousAnswers?: Record<string, string>;
  previousFindings?: CharacterTuvFinding[];
  locale: "de" | "en";
};

export function buildCharacterTuvSnapshot(input: {
  name: string;
  className: string | null;
  subclass: string | null;
  race: string | null;
  background: string | null;
  level: number;
  experiencePoints: number;
  sheet: {
    abilities: unknown;
    savingThrows: unknown;
    skills: unknown;
    combat: unknown;
    proficiencies: unknown;
    features: Array<{
      id?: string | null;
      name: string;
      nameDe?: string | null;
      nameEn?: string | null;
      source?: string | null;
    }>;
    spells?: Array<{
      name: string;
      level: number;
      prepared?: boolean;
    }>;
    attacks: unknown;
    spellcasting?: unknown;
    classResources?: unknown;
    notes?: string | null;
    equipment?: Dnd5eEquipmentState | null;
  };
  /** Inventar für angelegte Magiegegenstände im Snapshot */
  inventoryItems?: Array<Pick<CharacterItem, "id" | "name" | "description">>;
  derived: unknown;
  previousAnswers?: Record<string, string>;
  previousFindings?: CharacterTuvFinding[];
  locale: "de" | "en";
}): CharacterTuvSheetSnapshot {
  const locale = input.locale;
  const equipmentSummary = buildCharacterTuvEquipmentSummary(
    input.sheet.equipment ?? null,
    input.inventoryItems,
  );

  const base: CharacterTuvSheetSnapshot = {
    meta: {
      name: input.name,
      class: input.className,
      subclass: input.subclass,
      race: input.race,
      background: input.background,
      level: input.level,
      experiencePoints: input.experiencePoints,
    },
    sheet: {
      abilities: enrichAbilityMap(input.sheet.abilities, locale),
      savingThrows: enrichSaveMap(input.sheet.savingThrows, locale),
      skills: enrichSkillMap(input.sheet.skills, locale),
      combat: input.sheet.combat,
      proficiencies: input.sheet.proficiencies,
      features: input.sheet.features.map((f) => ({
        id: f.id ?? null,
        name: f.nameDe || f.nameEn || f.name,
        nameDe: f.nameDe ?? null,
        nameEn: f.nameEn ?? null,
        source: f.source ?? null,
      })),
      spells: (input.sheet.spells ?? []).map((s) => ({
        name: s.name,
        level: s.level,
        prepared: s.prepared,
      })),
      attacks: input.sheet.attacks,
      spellcasting: input.sheet.spellcasting,
      classResources: input.sheet.classResources,
      notes: input.sheet.notes ?? null,
    },
    equipmentSummary,
    labelLegend: {
      skills: DND5E_SKILLS.map((s) => ({
        key: s.key,
        labelDe: s.labelDe,
        labelEn: s.labelEn,
        displayName: skillDisplayName(s.key, locale),
      })),
      abilities: ABILITY_KEYS.map((key) => ({
        key,
        labelDe: ABILITY_LABELS_DE[key],
        labelEn: ABILITY_LABELS_EN[key],
        displayName: abilityDisplayName(key, locale),
      })),
      proficiencyStates: (
        ["none", "half", "proficient", "expertise"] as SkillProficiency[]
      ).map((key) => ({
        key,
        labelDe: SKILL_PROFICIENCY_LABELS[key].labelDe,
        labelEn: SKILL_PROFICIENCY_LABELS[key].labelEn,
        displayName: skillProficiencyDisplay(key, locale),
      })),
    },
    derived: enrichDerived(input.derived, locale),
    previousAnswers: input.previousAnswers,
    previousFindings: input.previousFindings,
    locale,
  };

  return {
    ...base,
    skillMathAudit: buildCharacterTuvSkillMathAudit(base),
    featureChecklist: buildCharacterTuvFeatureChecklist(base),
  };
}
