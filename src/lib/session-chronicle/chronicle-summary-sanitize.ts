import type {
  ChronicleChunkSummary,
  LiveMarker,
  SpontaneousQuestDraft,
} from "./types";
import { isDndTableActionText } from "./chronicle-dnd-table-actions";

const NPC_FIELD_LABELS = new Set([
  "wahrnehmung",
  "motiv erkennen",
  "motiv",
  "motivation",
  "persönlichkeit",
  "aussehen",
  "verhalten",
  "biografie",
  "beschreibung",
  "geschätzt",
  "ort in session",
  "wissen",
  "insight",
  "körperliche wahrnehmung",
]);

function normalizeLabel(text: string): string {
  return text.trim().toLowerCase().replace(/:$/, "");
}

function isNpcFieldLabel(text: string): boolean {
  const n = normalizeLabel(text);
  if (NPC_FIELD_LABELS.has(n)) return true;
  if (/^wahrnehmung\b/.test(n)) return true;
  if (/^motiv(\s*erkennen)?\b/.test(n)) return true;
  return false;
}

function parseNpcFieldLine(text: string): { field: string; content: string } | null {
  const m = text.match(
    /^(wahrnehmung|motiv\s*erkennen|motivation|motiv|persönlichkeit|aussehen|verhalten|wissen)\s*[:]\s*(.+)$/i,
  );
  if (!m) return null;
  return { field: normalizeLabel(m[1]), content: m[2].trim() };
}

/** Quest-Eintrag, der NSC-Metadaten oder Tisch-Würfelproben ist — keine Story-Quest. */
export function isLikelyMisclassifiedQuest(quest: SpontaneousQuestDraft): boolean {
  const title = quest.title.trim();
  if (!title) return true;

  const combined = [quest.title, quest.objective, quest.giver].filter(Boolean).join(" ");
  if (isDndTableActionText(combined)) return true;

  if (isNpcFieldLabel(title)) return true;
  if (/^(wahrnehmung|motiv\s*erkennen|motivation|motiv|persönlichkeit|aussehen|verhalten|wissen)\s*:/i.test(title)) {
    return true;
  }
  const objective = quest.objective?.trim() ?? "";
  if (objective) {
    const head = objective.split(/[:.]/)[0] ?? "";
    if (isNpcFieldLabel(head)) return true;
    if (/^(wahrnehmung|motiv\s*erkennen|motivation|motiv|persönlichkeit|aussehen|verhalten|wissen)\s*:/i.test(objective)) {
      return true;
    }
  }
  if (/^DC\s*\d+/i.test(title) || /^DC\s*\d+/i.test(objective)) return true;
  return false;
}

function questContentToNpcPatch(quest: SpontaneousQuestDraft): {
  appearance?: string;
  behavior?: string;
} | null {
  const parts: Array<{ field: string; content: string }> = [];

  if (isNpcFieldLabel(quest.title) && quest.objective?.trim()) {
    parts.push({ field: normalizeLabel(quest.title), content: quest.objective.trim() });
  }

  for (const line of [quest.title, quest.objective]) {
    if (!line?.trim()) continue;
    const parsed = parseNpcFieldLine(line);
    if (parsed) {
      parts.push(parsed);
      continue;
    }
    if (isNpcFieldLabel(line)) continue;
  }
  if (parts.length === 0) return null;

  let appearance: string | undefined;
  let behavior: string | undefined;
  for (const { field, content } of parts) {
    if (field.includes("aussehen") || field === "wahrnehmung") {
      appearance = [appearance, content].filter(Boolean).join("\n");
    } else {
      behavior = [behavior, `${field}: ${content}`].filter(Boolean).join("\n");
    }
  }
  if (!appearance && !behavior) return null;
  return { appearance, behavior };
}

/**
 * Entfernt fälschlich als Quest erkannte NSC-Metadaten (Motivation, Wahrnehmung, …)
 * und hängt sie an vorhandene NSC-Vorschläge an.
 */
export function sanitizeChronicleChunkSummary(
  summary: ChronicleChunkSummary,
  liveMarkers: LiveMarker[] = [],
): ChronicleChunkSummary {
  const hasNpcMarker = liveMarkers.some((m) => m.type === "npc");
  const quests: SpontaneousQuestDraft[] = [];
  let npcs = [...summary.spontaneous_npcs];

  for (const quest of summary.spontaneous_quests) {
    if (!isLikelyMisclassifiedQuest(quest)) {
      quests.push(quest);
      continue;
    }

    const patch = questContentToNpcPatch(quest);
    if (!patch) continue;

    if (npcs.length > 0) {
      const lastIdx = npcs.length - 1;
      const current = npcs[lastIdx];
      npcs[lastIdx] = {
        ...current,
        appearance: [current.appearance, patch.appearance].filter(Boolean).join("\n") || undefined,
        behavior: [current.behavior, patch.behavior].filter(Boolean).join("\n") || undefined,
      };
    } else if (hasNpcMarker) {
      npcs.push({
        detected_name: quest.giver?.trim() || "Unbenannter NSC",
        appearance: patch.appearance,
        behavior: patch.behavior,
        isImported: false,
      });
    }
  }

  return {
    ...summary,
    spontaneous_npcs: npcs,
    spontaneous_quests: quests,
  };
}
