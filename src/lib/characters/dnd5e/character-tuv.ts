/**
 * Charakter-TÜV — Typen & Hilfen für KI-gestützte Blattprüfung (D&D 2024).
 */

import {
  ABILITY_KEYS,
  ABILITY_LABELS_DE,
  ABILITY_LABELS_EN,
  type AbilityKey,
  type Dnd5eSkillKey,
  type SkillProficiency,
} from "./types";
import { DND5E_SKILLS, DND5E_SKILL_BY_KEY } from "./skills";
import type { Dnd5eEquipmentState, Dnd5eEquipmentSlot } from "./equipment-types";
import {
  EQUIPMENT_SLOT_LABELS_DE,
  EQUIPMENT_SLOT_LABELS_EN,
} from "./equipment-types";

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
};

function slotItemId(
  equipment: Dnd5eEquipmentState | null | undefined,
  slot: Dnd5eEquipmentSlot,
): string | null {
  const id = equipment?.slots?.[slot];
  return typeof id === "string" && id.trim() ? id : null;
}

export function buildCharacterTuvEquipmentSummary(
  equipment: Dnd5eEquipmentState | null | undefined,
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
  };
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
    features: Array<{ name: string; source?: string | null }>;
    spells?: Array<{ name: string; level: number; prepared?: boolean }>;
    attacks: unknown;
    spellcasting?: unknown;
    classResources?: unknown;
    notes?: string | null;
  };
  /** Ausrüstungsslots (Torso/Waffen) — für deterministische Hinweise */
  equipmentSummary?: CharacterTuvEquipmentSummary;
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
  derived: unknown;
  previousAnswers?: Record<string, string>;
  previousFindings?: CharacterTuvFinding[];
  locale: "de" | "en";
}): CharacterTuvSheetSnapshot {
  const locale = input.locale;
  const equipmentSummary = buildCharacterTuvEquipmentSummary(
    input.sheet.equipment ?? null,
  );

  return {
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
        name: f.nameDe || f.nameEn || f.name,
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
}
