/** D&D-5e-Fertigkeiten und typische Tisch-/Würfel-Begriffe — keine Story-Quests. */
export const DND5E_SKILL_LABELS = new Set([
  "akrobatik",
  "tierkunde",
  "arkana",
  "athletik",
  "täuschen",
  "geschichte",
  "heilkunde",
  "heimlichkeit",
  "einschüchtern",
  "nachforschungen",
  "medizin",
  "naturkunde",
  "wahrnehmung",
  "auftreten",
  "religion",
  "fingerfertigkeit",
  "überzeugen",
  "überleben",
  "handwerkszeug",
  "retter",
  "motiv erkennen",
  "motivation",
  "motiv",
  "wissen",
  "insight",
  "persönlichkeit",
  "aussehen",
  "verhalten",
]);

const TABLE_ACTION_PATTERNS: RegExp[] = [
  /\bwürfel(probe|n)?\b/i,
  /\bw20\b/i,
  /\bw[468]\b/i,
  /\bd20\b/i,
  /\b(natürliche|kritischer)\s+(1|20|erfolg|fehlschlag)\b/i,
  /\bDC\s*\d+/i,
  /\bschwierigkeitsgrad\b/i,
  /\b(attribut|fertigkeits|rettungs)(probe|wurf|check)\b/i,
  /\b(stärke|geschick|konstitution|intelligenz|weisheit|charisma)(\s*(probe|wurf|check))?\b/i,
  /\b\d+\s*\+\s*\d+\b/,
  /\b(erfolg|misserfolg|bestanden|durchgefallen)\s*(bei|auf|gegen)\b/i,
  /\bgegen\s+DC\s*\d+/i,
];

/** Text beschreibt eine Tisch-Aktion / Würfelprobe — keine Handlungs-Quest. */
export function isDndTableActionText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const head = normalizeLabel(t.split(/[:.–—]/)[0] ?? t);
  if (DND5E_SKILL_LABELS.has(head)) return true;
  if (/^(wahrnehmung|motiv(\s*erkennen)?|wissen)\b/.test(head)) return true;
  return TABLE_ACTION_PATTERNS.some((re) => re.test(t));
}

function normalizeLabel(text: string): string {
  return text.trim().toLowerCase().replace(/:$/, "");
}

/** Kurzer Hinweis für LLM-Prompts (Chronist + Briefing). */
export const CHRONICLE_TABLE_ACTIONS_PROMPT_HINT = `
TISCH-AKTIONEN vs. STORY (D&D 5e):
- Würfelproben auf Fertigkeiten/Attribute (z. B. Heimlichkeit, Athletik, Wahrnehmung, Motiv erkennen, Rettungswürfe), DC-Angaben, W20-Ergebnisse und „kritischer Erfolg“ sind Tisch-Mechanik — KEINE Quests, NSCs oder Lore-Orte.
- Solche Ergebnisse können die Richtung der Szene vorgeben; der SL entscheidet die weitere Handlung. Sie werden nicht digital als Quest erfasst.
- Extrahiere nur echte Story-Inhalte: neue NSCs, Orte/Lore und Spieler-Aufträge mit klarem Ziel.
- Im story_recap dürfen Proben knapp als erzählte Handlung vorkommen — aber nicht als spontaneous_quest eintragen.`.trim();
