/**
 * Charakter-TÜV — Typen & Hilfen für KI-gestützte Blattprüfung (D&D 2024).
 */

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
  };
  derived: unknown;
  previousAnswers?: Record<string, string>;
  previousFindings?: CharacterTuvFinding[];
  locale: "de" | "en";
}): CharacterTuvSheetSnapshot {
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
      abilities: input.sheet.abilities,
      savingThrows: input.sheet.savingThrows,
      skills: input.sheet.skills,
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
    derived: input.derived,
    previousAnswers: input.previousAnswers,
    previousFindings: input.previousFindings,
    locale: input.locale,
  };
}
