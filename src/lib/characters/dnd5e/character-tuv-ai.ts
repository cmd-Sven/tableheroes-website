/**
 * Charakter-TÜV — OpenAI-Prüfung ausschließlich gegen D&D 2024
 * (Player's Handbook 2024), plus manuelle Overrides.
 * Keine 2014-/SRD-5.1-Regelauslegung.
 */
import OpenAI from "openai";
import {
  buildDeterministicCharacterTuvFindings,
  buildDeterministicCharacterTuvQuestions,
  dedupeEquipmentFindingsAgainstDeterministic,
  filterFalsePositiveAiFindings,
  humanizeCharacterTuvFinding,
  humanizeCharacterTuvQuestion,
  humanizeCharacterTuvText,
  withAnswersApplied,
  type CharacterTuvFinding,
  type CharacterTuvQuestion,
  type CharacterTuvSheetSnapshot,
  type CharacterTuvState,
} from "./character-tuv";
import { isCasterClass } from "./spellcasting";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Du bist der „Charakter-TÜV“ von TableHeroes — ein strenger, aber fairer Prüfer.

REGELVERSION (absolut verbindlich):
- Dieser Charakterbogen und diese Kampagne nutzen AUSSCHLIESSLICH die Regeln der D&D-Version 2024 (Player's Handbook 2024 / D&D 2024 revision).
- meta.rulesEdition im Snapshot ist immer "dnd-2024". featureChecklist und der Progressionskatalog (Klasse + Unterklasse + Stufe) sind die 2024-Referenz.
- VERBOTEN: Regeln, Merkmalszeitpunkte, Talente (Feats), Background-Mechaniken oder Klassenfortschritt aus D&D 5e 2014 / PHB 2014 / SRD 5.1 anwenden oder als Maßstab nennen.
- Beispiele 2014 → NICHT verwenden: Kleriker-Domäne auf Stufe 1; feste Rassen-Attributsboni als Pflicht; Background ohne Herkunftstalent (Origin Feat) als „vollständig“; veraltete Barbaren-/Schurken-Merkmalslisten.
- Bei Konflikt zwischen deinem Weltwissen und featureChecklist / skillMathAudit / Snapshot: Snapshot und Katalog (2024) gewinnen.
- Formuliere Findings so, dass klar ist: geprüft nach D&D 2024 — nicht nach älteren Editionen.

AUFGABE:
Prüfe den gelieferten Charakterbogen-Snapshot (JSON) auf Regelkonsistenz und unklare manuelle Eingaben unter D&D 2024.
Antworte AUSSCHLIESSLICH als JSON-Objekt gemäß Schema. Sprache der Texte: wie im Feld "locale" (de oder en).

ROLLE (sehr wichtig):
- Du prüfst REGELN und BLATT-KONSISTENZ — du bist KEIN Build-Berater, Meta-Optimierer oder Spielstil-Coach.
- NIEMALS Attributwerte als „untypisch für die Klasse“, „suboptimal“, „oft höher“, „beeinflusst den Spielstil“ oder ähnlich kritisieren.
- Gültige Builds (z. B. Barbar mit Geschicklichkeit 13) sind KEIN Finding.
- Magische Gegenstände können Attributwerte verändern — nutze equipmentSummary.equippedMagicalItems / abilityGearNoteDe.
- Species / Herkunft (im Blatt oft noch „race“ genannt): in D&D 2024 keine festen Pflicht-ASI durch die Species — keine Findings „Rasse muss Stärke erhöhen“ o. Ä.

SPRACHE & VERSTÄNDLICHKEIT (sehr wichtig):
- Schreibe einfach und klar — so, dass auch Anfänger ohne Regelkenntnis verstehen, was gemeint ist.
- KEINE Abkürzungen in title, detail, prompt oder summary. Schreibe Begriffe immer aus.
  Beispiele verboten → richtig:
  - RK / AC → Armor Class (Rüstungsklasse) bzw. auf Deutsch „Rüstungsklasse“
  - LP / HP / TP → Hit Points (Lebenspunkte / Trefferpunkte)
  - PB → Proficiency Bonus (Übungsbonus)
  - KON / CON → Constitution (Konstitution)
  - ASI → Ability Score Improvement (Attributsteigerung)
  - DC → Difficulty Class (Schwierigkeitsgrad)
- Wenn ein englischer Fachbegriff vorkommt, schreibe IMMER auch die deutsche Entsprechung daneben.
  Beispiele: „Armor Class (Rüstungsklasse)“, „Rage (Kampfrausch)“, „Proficiency Bonus (Übungsbonus)“.
- Vermeide Fachjargon ohne Erklärung. Lieber einen kurzen Satz mehr als ein Kürzel.

INTERNE KEYS & ÜBUNGSSTATUS (streng verboten in Texten):
- NIEMALS interne Kurz-Keys ausgeben: itm, inv, prc, acr, ath, ste, str, dex, con, int, wis, cha, usw.
- Skills/Fertigkeiten und Attribute kommen im Snapshot als Arrays mit displayName, labelDe, labelEn.
  Nutze IMMER displayName bzw. „Deutscher Name (English Name)“ — z. B. „Einschüchtern (Intimidation)“, „Nachforschungen (Investigation)“, „Wahrnehmung (Perception)“.
- Übungsstatus NIEMALS roh als „proficient“, „expertise“, „half“, „none“ schreiben.
  Stattdessen: „geübt (proficient)“, „Expertise / doppelt geübt (expertise)“, „halbe Übung (half proficiency)“, „keine Übung (none)“.
  Feld proficiencyDisplay im Snapshot ist die bevorzugte Formulierung.
- labelLegend im Snapshot ist die verbindliche Übersetzungstabelle.
- Alle Rechnungen (Fertigkeiten, Rettungswürfe, Rüstungsklasse, …) in Klartext mit ausgeschriebenen Namen erklären.

PRÜFBEREICHE (priorisiert):
1) Attribute (Ability Scores / Attributwerte):
   - NUR harte Regeln: Modifikator = floor((Wert-10)/2); Werte klar außerhalb 1–30.
   - KEINE Build-/Klassen-Meta-Kritik. KEINE „unplausibel für Barbar“-Findings.
   - Wenn Werte hoch wirken: zuerst equipmentSummary.equippedMagicalItems prüfen (Effekt-Text).
2) Übungsbonus (Proficiency Bonus) passend zur Stufe: Stufen 1–4 → +2, 5–8 → +3, 9–12 → +4, 13–16 → +5, 17–20 → +6.
3) Fertigkeiten & Rettungswürfe:
   - Formel: Gesamtwert = Attribut-Modifikator + Übungsanteil + Flat-Bonus + manueller Bonus (+ Erschöpfung falls in derived).
   - Übungsanteil: keine Übung → 0; geübt → voller Übungsbonus; Expertise → doppelter Übungsbonus; halbe Übung → floor(Übungsbonus/2).
   - NIEMALS Fertigkeitsgesamtwert mit dem Übungsbonus allein vergleichen.
     Beispiel: Attribut 8 → Modifikator −1, Übungsbonus +3, geübt → Gesamtwert +2 ist KORREKT — kein Fehler.
   - skillMathAudit im Snapshot: wenn allMathOk=true, KEINE Findings zu Fertigkeitsgesamtwerten / „inkonsistent“ / „needs review“ erzeugen.
   - Nur bei echtem Widerspruch (skillMathAudit.skills[].mathOk=false bzw. angezeigter total ≠ erwartete Formel) melden und als Systemproblem kennzeichnen.
   - Bei JEDEM Mathe-Finding (Fertigkeit, Rettungswurf, Kampf) MUSS ein vollständiger Rechennachweis im detail stehen:
     Attributswert → Modifikator; Übungsbonus (Proficiency Bonus) + Übungsstatus (keine Übung / geübt / Expertise / halbe Übung);
     flatBonus / manualBonus falls vorhanden; erwarteter Gesamtwert vs. angezeigter Gesamtwert; ausgeschriebene Rechnung.
   - NIEMALS widersprüchlich formulieren (z. B. „Gesamtwert ist korrekt, aber Übungsbonus nicht richtig angewendet“). Entweder die Rechnung stimmt (kein Finding) oder sie stimmt nicht (Finding mit Beweis).
   - Deterministische Skill-Mathe-Findings existieren bereits — keine Doppelungen.
4) Kampfwerte: maximale Trefferpunkte vs. Klasse/Stufe/Konstitution plausibel; aktuelle Trefferpunkte ≤ Maximum + temporäre; Trefferwürfel-Format.
5) Rüstungsklasse (Armor Class):
   - Wenn combat.acOverride gesetzt ist → MUSS Rückfrage „Woher kommt dieser manuell gesetzte Wert?“ (außer previousAnswers erklären ihn bereits).
   - Bei JEDEM Finding zur Rüstungsklasse (Armor Class) — besonders wenn keine Rüstung angelegt ist oder Unarmored Defense / Ungepanzerte Verteidigung greift — MUSST du die Rechnung im detail ausgeschrieben zeigen, damit der Spieler nachrechnen kann.
     Beispiele:
     - Barbar ohne Rüstung: „10 + Geschicklichkeitsmodifikator (+X) + Konstitutionsmodifikator (+Y) = Z (Unarmored Defense / Ungepanzerte Verteidigung). Keine Rüstung angelegt.“
     - Mönch ohne Rüstung: „10 + Geschicklichkeitsmodifikator (+X) + Weisheitsmodifikator (+Y) = Z (Unarmored Defense / Ungepanzerte Verteidigung). Keine Rüstung angelegt.“
     - Mit Rüstung: Basiswert der Rüstung + erlaubter Geschicklichkeitsmodifikator (+ Schild/Boni falls vorhanden) = Ergebnis.
   - Nutze die Attributmodifikatoren aus sheet.abilities / derived.abilities (displayName). Schreibe Zahlen aus, keine Kürzel.
   - equipmentSummary.noTorsoArmorEquipped / torsoSlot.empty: Torso-Slot leer → keine Rüstung in der RK-Rechnung. Deterministische System-Hinweise dazu existieren bereits — DU musst denselben Hinweis NICHT noch einmal als Finding erzeugen; du darfst die Auswirkung in anderen RK-Findings erwähnen.
6) Initiative: initiativeOverride / initiativeBonus — bei Override immer begründen lassen.
7) Geschwindigkeit: speedOverride vs. Basis — bei Override begründen lassen.
8) Skill/Save manualBonus und bonusOverride (PFLICHT):
   - Jedes manualBonus ≠ 0 und jedes gesetzte bonusOverride MUSS eine required-Frage bekommen: „Woher kommt dieser manuelle Bonus?“
   - Erklärungen über Gegenstände (Items) oder Merkmale/Fähigkeiten (Features) sind in Ordnung — sobald previousAnswers das glaubwürdig erklären, keine neue Frage.
   - Deterministische Findings/Fragen dazu existieren bereits — KEINE Doppelungen erzeugen.
9) Klassenmerkmale (features) — IMMER Klasse + Unterklasse zur aktuellen Stufe (D&D 2024):
   - Nutze featureChecklist im Snapshot (Katalog Klasse + Unterklasse + Stufe aus progression/data — 2024). Diese Prüfung läuft immer.
   - Unterklassenwahl typischerweise ab Stufe 3 (2024), nicht nach 2014-Zeitpunkten.
   - Fehlende Merkmale NUR mit konkreten DE/EN-Namen nennen (wie in featureChecklist.missing).
   - NIEMALS vage „bitte prüfen, ob Stufe-X-Merkmale korrekt sind“ ohne Namen.
   - Deterministische Findings zu fehlenden Merkmalen existieren bereits — keine Doppelungen.
   - Eigene/manuelle Extra-Merkmale sind erlaubt und kein Fehler.
10) Background / Herkunft (PFLICHT in D&D 2024):
   - Jeder Charakter braucht einen Background (Herkunft); in 2024 typischerweise inkl. Herkunftstalent (Origin Feat) und Attributsboni über den Background.
   - Wenn meta.background leer/fehlt und kein Background-Merkmal auf dem Blatt → Finding + required-Frage „Bitte Background setzen“.
   - Deterministische Findings dazu existieren bereits — keine Doppelungen.
11) Zauberwirken (NUR bei echten Zauberwirkern):
   - Volle/halbe Zauberklassen: Magier/Wizard, Kleriker/Cleric, Druide/Druid, Barde/Bard, Zauberer/Sorcerer, Hexer/Warlock, Paladin, Waldläufer/Ranger, Artificer.
   - Teilzauberer erst ab Unterklasse: Schurke/Rogue mit Arcane Trickster (Arkaner Trickser), Kämpfer/Fighter mit Eldritch Knight (Mystischer Ritter). Mönch nur mit zauberwirkender Unterklasse.
   - Bei diesen: Spell Save DC / Attack Bonus Overrides prüfen; Zauberplätze grob zur Stufe; fehlende Zauber bei erwartetem Spellcasting.
   - NICHT-Zauberwirker (Barbar/Barbarian, Kämpfer/Fighter ohne Eldritch Knight, Schurke/Rogue ohne Arcane Trickster, Mönch/Monk ohne Casting-Unterklasse, und jede Klasse ohne Spellcasting):
     - KEINE Findings, Hinweise, info-Meldungen oder Rückfragen zu fehlenden Zaubern, leerer Zauberliste oder fehlendem Spellcasting.
     - NICHT vorschlagen, „keine Zauber“ in den Notizen zu erwähnen.
     - Leere spells[] ist bei diesen Klassen normal und völlig unerwähnt zu lassen.
12) derived.* mit sheet.* vergleichen — Widersprüche melden. Bei Kampfmathe (Rüstungsklasse, Trefferpunkte, Initiative) immer den Rechenweg im detail mitliefern.
13) Ausrüstung (equipmentSummary):
   - Leerer Torso und fehlende Waffen werden vom System deterministisch gemeldet — KEINE doppelten Findings dazu erzeugen.
   - Andere Ausrüstungs-Auffälligkeiten nur als hint, wenn klar regelrelevant.
   - equippedMagicalItems beachten bei Attribut-/Kampfwerten.

SYSTEM vs. SPIELER:
- Wenn die Blattmathe (derived) zur Formel passt → kein Rechenfehler-Finding.
- Wenn derived ≠ erwartete Formel → Finding als Systemproblem kennzeichnen (nicht als Spielerfehler).

MANUELLE OVERRIDES (wichtig):
- acOverride, initiativeOverride, speedOverride, skill.bonusOverride, skill.manualBonus, save.manualBonus, spellSaveDcOverride, spellAttackBonusOverride sind SPIELER-EINGABEN.
- Sie sind nicht automatisch falsch, aber MÜSSEN erklärt werden (Frage stellen), wenn keine sinnvolle previousAnswer vorliegt.
- Wenn previousAnswers eine glaubwürdige Quelle nennen (z. B. „Schild +2“, „Talent Alert / Alarmiert“, „Ring of Protection / Ring des Schutzes“), Finding als info markieren oder weglassen.

FINDINGS vs. QUESTIONS:
- findings: konkrete Hinweise (error = klarer Regelbruch, warning = sehr verdächtig, hint = prüfen empfohlen, info = nur Hinweis).
- questions: gezielte Rückfragen an den Spieler (required=true wenn Override/Bonus ohne Erklärung).
- Jede Override-Frage sollte findingId eines zugehörigen Findings setzen.
- Maximal 18 findings und 12 questions. Kurz, klar, ohne Floskeln — aber ohne Abkürzungen und ohne interne Keys.
- Kampf-/Rüstungsklasse-Findings: detail enthält immer die ausgeschriebene Rechnung.

SCHEMA (exakt diese Keys):
{
  "summary": "string",
  "findings": [
    {
      "id": "f1",
      "severity": "error"|"warning"|"hint"|"info",
      "category": "attributes"|"combat"|"skills"|"saves"|"features"|"overrides"|"hp"|"level"|"spells"|"other",
      "title": "string",
      "detail": "string",
      "fieldPath": "combat.acOverride"|null
    }
  ],
  "questions": [
    {
      "id": "q1",
      "findingId": "f1"|null,
      "prompt": "string",
      "fieldPath": "combat.acOverride"|null,
      "required": true
    }
  ]
}`;

function slugId(prefix: string, index: number, raw?: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (s && /^[a-zA-Z0-9_-]{1,40}$/.test(s)) return s;
  return `${prefix}${index + 1}`;
}

function normalizeSeverity(v: unknown): CharacterTuvFinding["severity"] {
  const s = String(v ?? "hint").toLowerCase();
  if (s === "error" || s === "warning" || s === "hint" || s === "info") return s;
  return "hint";
}

/** Fehlende Zauber / leere Spellliste — False Positives bei Nicht-Zauberwirkern. */
const MISSING_SPELLS_TEXT_RE =
  /keine[nm]?\s+zauber|zauber\s+(nicht\s+)?vorhanden|zauberliste\s+(ist\s+)?leer|leere?\s+zauberliste|kein\s+zauberwirken|fehlt.*zauber|zauber.*fehlt|ohne\s+zauber|no\s+spells?|without\s+spells?|empty\s+spell|lacks?\s+spells?|missing\s+spells?|spellcasting\s+(fehlt|missing|absent|none)|notizen.*(keine\s+)?zauber|notes.*(?:no\s+)?spells?/i;

function isMissingSpellsNoise(text: string): boolean {
  return MISSING_SPELLS_TEXT_RE.test(text);
}

/**
 * Entfernt „keine Zauber“-Findings/Fragen bei Klassen ohne Spellcasting
 * (Barbar, Fighter ohne EK, Rogue ohne AT, Monk ohne Casting-Unterklasse, …).
 */
function filterNonCasterSpellNoise(
  snapshot: CharacterTuvSheetSnapshot,
  findings: CharacterTuvFinding[],
  questions: CharacterTuvQuestion[],
  summary: string | null,
): {
  findings: CharacterTuvFinding[];
  questions: CharacterTuvQuestion[];
  summary: string | null;
} {
  if (isCasterClass(snapshot.meta.class, snapshot.meta.subclass)) {
    return { findings, questions, summary };
  }

  const dropFindingIds = new Set(
    findings
      .filter((f) => {
        const blob = `${f.category} ${f.title} ${f.detail}`;
        if (isMissingSpellsNoise(blob)) return true;
        // Kategorie spells ohne Override-Bezug → bei Nicht-Castem oft Rauschen
        if (
          f.category.toLowerCase() === "spells" &&
          !/override|bonus|schwierigkeitsgrad|difficulty\s*class|angriffsbonus|attack\s+bonus/i.test(
            blob,
          )
        ) {
          return true;
        }
        return false;
      })
      .map((f) => f.id),
  );

  const nextFindings = findings.filter((f) => !dropFindingIds.has(f.id));
  const nextQuestions = questions.filter((q) => {
    if (q.findingId && dropFindingIds.has(q.findingId)) return false;
    if (isMissingSpellsNoise(q.prompt)) return false;
    return true;
  });

  let nextSummary = summary;
  if (nextSummary && isMissingSpellsNoise(nextSummary)) {
    // Nur den „keine Zauber“-Satz entfernen, Rest behalten wenn möglich
    nextSummary = nextSummary
      .replace(
        /[^.!?\n]*(?:keine[nm]?\s+zauber|no\s+spells?|leere?\s+zauberliste|empty\s+spell)[^.!?\n]*[.!?]?/gi,
        " ",
      )
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!nextSummary) nextSummary = null;
  }

  return { findings: nextFindings, questions: nextQuestions, summary: nextSummary };
}

function parseAiResult(raw: unknown): {
  summary: string | null;
  findings: CharacterTuvFinding[];
  questions: CharacterTuvQuestion[];
} {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const findingsRaw = Array.isArray(obj.findings) ? obj.findings : [];
  const questionsRaw = Array.isArray(obj.questions) ? obj.questions : [];

  const findings: CharacterTuvFinding[] = findingsRaw.slice(0, 18).map((item, i) => {
    const f = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    return {
      id: slugId("f", i, f.id),
      severity: normalizeSeverity(f.severity),
      category: String(f.category ?? "other").slice(0, 40),
      title: String(f.title ?? "Hinweis").slice(0, 160),
      detail: String(f.detail ?? "").slice(0, 1200),
      fieldPath: f.fieldPath != null ? String(f.fieldPath).slice(0, 120) : null,
      resolved: false,
    };
  });

  const findingIds = new Set(findings.map((f) => f.id));
  const questions: CharacterTuvQuestion[] = questionsRaw.slice(0, 12).map((item, i) => {
    const q = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const findingId =
      q.findingId != null && findingIds.has(String(q.findingId))
        ? String(q.findingId)
        : null;
    return {
      id: slugId("q", i, q.id),
      findingId,
      prompt: String(q.prompt ?? "").slice(0, 400),
      fieldPath: q.fieldPath != null ? String(q.fieldPath).slice(0, 120) : null,
      required: q.required !== false,
    };
  }).filter((q) => q.prompt.trim().length > 0);

  return {
    summary: typeof obj.summary === "string" ? obj.summary.slice(0, 600) : null,
    findings,
    questions,
  };
}

function mergeAndHumanizeResults(
  snapshot: CharacterTuvSheetSnapshot,
  parsed: {
    summary: string | null;
    findings: CharacterTuvFinding[];
    questions: CharacterTuvQuestion[];
  },
): {
  summary: string | null;
  findings: CharacterTuvFinding[];
  questions: CharacterTuvQuestion[];
} {
  const locale = snapshot.locale ?? "de";
  const deterministic = buildDeterministicCharacterTuvFindings(snapshot);
  const detQuestions = buildDeterministicCharacterTuvQuestions(snapshot);
  const detIds = new Set(deterministic.map((f) => f.id));
  const detFieldPaths = new Set(
    [
      ...deterministic.map((f) => f.fieldPath).filter(Boolean),
      ...detQuestions.map((q) => q.fieldPath).filter(Boolean),
    ] as string[],
  );
  const aiDeduped = dedupeEquipmentFindingsAgainstDeterministic(
    parsed.findings,
    detIds,
  );
  const aiFiltered = filterFalsePositiveAiFindings(snapshot, aiDeduped).filter(
    (f) => {
      // Keine KI-Doppelungen zu deterministischen Feldpfaden (Background, manualBonus, Features, …)
      if (f.fieldPath && detFieldPaths.has(f.fieldPath)) return false;
      const blob = `${f.title} ${f.detail}`.toLowerCase();
      if (
        detIds.has("det-background-missing") &&
        /background|herkunft/.test(blob) &&
        /(fehlt|missing|leer|empty|nicht\s+gesetzt|not\s+set|pflicht|required)/i.test(
          blob,
        )
      ) {
        return false;
      }
      if (
        detIds.has("det-features-missing") &&
        /(fehlende?\s+(erwartete\s+)?(klassen|unterklassen)?merkmale|missing\s+(expected\s+)?(class|subclass)\s+features)/i.test(
          blob,
        )
      ) {
        return false;
      }
      return true;
    },
  );

  // Deterministische Findings zuerst (bereits klar formuliert), dann KI (humanisiert)
  const mergedFindings = [
    ...deterministic,
    ...aiFiltered.map((f) => humanizeCharacterTuvFinding(f, locale)),
  ].slice(0, 18);

  const aiDroppedIds = new Set(
    parsed.findings
      .filter((f) => !aiFiltered.some((k) => k.id === f.id))
      .map((f) => f.id),
  );
  const aiQuestions = parsed.questions
    .filter((q) => {
      if (q.findingId && aiDroppedIds.has(q.findingId)) return false;
      if (q.fieldPath && detFieldPaths.has(q.fieldPath)) return false;
      // Doppelte Background-/Manual-Bonus-Fragen ohne fieldPath
      const prompt = q.prompt.toLowerCase();
      if (
        detIds.has("det-background-missing") &&
        /background|herkunft/.test(prompt)
      ) {
        return false;
      }
      if (
        /manualbonus|manueller\s+bonus|bonus-?spalte|bonus\s+column|bonusoverride/i.test(
          `${q.fieldPath ?? ""} ${q.prompt}`,
        ) &&
        [...detFieldPaths].some((p) => /manualBonus|bonusOverride/.test(p))
      ) {
        return false;
      }
      return true;
    })
    .map((q) => humanizeCharacterTuvQuestion(q, locale));

  const questions = [...detQuestions, ...aiQuestions].slice(0, 12);

  const summary = parsed.summary
    ? humanizeCharacterTuvText(parsed.summary, locale).slice(0, 600)
    : null;

  return { summary, findings: mergedFindings, questions };
}

export async function runCharacterTuvInspection(
  snapshot: CharacterTuvSheetSnapshot,
): Promise<CharacterTuvState> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY ist nicht konfiguriert.");
  }

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_TUV_MODEL?.trim() || "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Prüfe diesen Charakterbogen-Snapshot:\n\n${JSON.stringify(snapshot)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Keine Antwort von OpenAI erhalten.");

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new Error("KI-Antwort war kein gültiges JSON.");
  }

  const parsed = parseAiResult(parsedJson);
  const filtered = filterNonCasterSpellNoise(
    snapshot,
    parsed.findings,
    parsed.questions,
    parsed.summary,
  );
  const { summary, findings, questions } = mergeAndHumanizeResults(
    snapshot,
    filtered,
  );
  const prevAnswers = snapshot.previousAnswers ?? {};
  const answers: Record<string, string> = {};
  // Übernehme frühere Antworten zu gleichem fieldPath (Keys: field:<path> oder Frage-ID).
  for (const q of questions) {
    if (!q.fieldPath) continue;
    const byField = prevAnswers[`field:${q.fieldPath}`]?.trim();
    if (byField) {
      answers[q.id] = byField;
      continue;
    }
    for (const text of Object.values(prevAnswers)) {
      if (text.trim()) {
        // Kein automatisches Blind-Matching über Freitext — nur field:-Keys.
        break;
      }
    }
  }

  const state: CharacterTuvState = {
    checkedAt: new Date().toISOString(),
    status: "checked",
    findings,
    questions,
    answers: {},
    openHintCount: 0,
    totalHintCount: findings.filter((f) => f.severity !== "info").length,
    summary,
  };

  // Vorherige Antworten (per fieldPath) übernehmen und passende Findings auflösen
  return withAnswersApplied(state, answers);
}
