/**
 * Charakter-TÜV — OpenAI-Prüfung gegen D&D 2024 + manuelle Overrides.
 */
import OpenAI from "openai";
import {
  withAnswersApplied,
  type CharacterTuvFinding,
  type CharacterTuvQuestion,
  type CharacterTuvSheetSnapshot,
  type CharacterTuvState,
} from "./character-tuv";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Du bist der „Charakter-TÜV“ von TableHeroes — ein strenger, aber fairer Prüfer für Dungeons & Dragons 2024 (Player's Handbook 2024 / One D&D 2024 Regeln).

AUFGABE:
Prüfe den gelieferten Charakterbogen-Snapshot (JSON) auf Regelkonsistenz und unklare manuelle Eingaben.
Antworte AUSSCHLIESSLICH als JSON-Objekt gemäß Schema. Sprache der Texte: wie im Feld "locale" (de oder en).

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

PRÜFBEREICHE (priorisiert):
1) Attribute (Ability Scores / Attributwerte): plausible Werte (typisch 8–20 vor magischen Gegenständen), Modifikator = floor((Wert-10)/2).
2) Übungsbonus (Proficiency Bonus) passend zur Stufe: Stufen 1–4 → +2, 5–8 → +3, 9–12 → +4, 13–16 → +5, 17–20 → +6.
3) Fertigkeiten & Rettungswürfe: Gesamtwert aus Attribut-Modifikator + Übungsbonus (bei Übung/Expertise) + manueller Bonus; Expertise = doppelter Übungsbonus.
4) Kampfwerte: maximale Trefferpunkte vs. Klasse/Stufe/Konstitution plausibel; aktuelle Trefferpunkte ≤ Maximum + temporäre; Trefferwürfel-Format.
5) Rüstungsklasse (Armor Class): Wenn combat.acOverride gesetzt ist → MUSS Rückfrage „Woher kommt dieser manuell gesetzte Wert?“ (außer previousAnswers erklären ihn bereits).
6) Initiative: initiativeOverride / initiativeBonus — bei Override immer begründen lassen.
7) Geschwindigkeit: speedOverride vs. Basis — bei Override begründen lassen.
8) Skill/Save manualBonus und bonusOverride — jedes nicht-null/nicht-0 manuelle Feld braucht Erklärung oder Finding.
9) Klassenmerkmale (features) vs. Klasse/Unterklasse/Stufe — fehlende Kernmerkmale oder Merkmale über Stufe hinaus als Hinweis.
10) Zauberwirken: Spell Save DC / Attack Bonus Overrides prüfen; Zauberplätze grob zur Stufe.
11) derived.* mit sheet.* vergleichen — Widersprüche melden.

MANUELLE OVERRIDES (wichtig):
- acOverride, initiativeOverride, speedOverride, skill.bonusOverride, skill.manualBonus, save.manualBonus, spellSaveDcOverride, spellAttackBonusOverride sind SPIELER-EINGABEN.
- Sie sind nicht automatisch falsch, aber MÜSSEN erklärt werden (Frage stellen), wenn keine sinnvolle previousAnswer vorliegt.
- Wenn previousAnswers eine glaubwürdige Quelle nennen (z. B. „Schild +2“, „Talent Alert / Alarmiert“, „Ring of Protection / Ring des Schutzes“), Finding als info markieren oder weglassen.

FINDINGS vs. QUESTIONS:
- findings: konkrete Hinweise (error = klarer Regelbruch, warning = sehr verdächtig, hint = prüfen empfohlen, info = nur Hinweis).
- questions: gezielte Rückfragen an den Spieler (required=true wenn Override/Bonus ohne Erklärung).
- Jede Override-Frage sollte findingId eines zugehörigen Findings setzen.
- Maximal 18 findings und 12 questions. Kurz, klar, ohne Floskeln — aber ohne Abkürzungen.

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
      detail: String(f.detail ?? "").slice(0, 800),
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

  const { summary, findings, questions } = parseAiResult(parsedJson);
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
