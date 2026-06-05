import OpenAI from "openai";
import { VALID_LORE_TYPES } from "@/src/lib/lore-types";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY ist nicht gesetzt.");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export const CHRONICLE_WHISPER_MODEL = "whisper-1";
export const CHRONICLE_SUMMARIZE_MODEL = "gpt-4o-mini";

export const CHRONICLE_SUMMARIZE_SYSTEM_PROMPT = `Du bist der Session-Chronist für eine deutschsprachige Pen-&-Paper-Runde (D&D 5e).
Analysiere das Transkript eines ~10-Minuten-Audio-Segments und extrahiere strukturierte Fakten für den Spielleiter.

Antworte NUR als JSON-Objekt (kein Markdown) mit exakt dieser Struktur:
{
  "story_recap": "string — flüssiger Absatz auf Deutsch, was in diesem Segment passierte",
  "discovered_loot": ["string — gefundene Gegenstände, Münzen, Schätze"],
  "spontaneous_npcs": [{
    "detected_name": "string",
    "appearance": "string optional",
    "behavior": "string optional",
    "estimated_stats": { "race": "string optional", "class": "string optional" },
    "located_in": "string optional — Ort/Kontext"
  }],
  "spontaneous_locations": [{
    "name": "string",
    "type": "string — einer der Lore-Typen",
    "description": "string optional"
  }],
  "spontaneous_quests": [{
    "title": "string",
    "giver": "string optional",
    "objective": "string optional"
  }]
}

Regeln:
- Schreibe auf Deutsch.
- Nur NEUE spontane NSCs, Orte und Quests, die im Segment klar vorkommen — keine Wiederholung bekannter Kampagne-Entitäten ohne neuen Aspekt.
- spontaneous_* Arrays dürfen leer sein.
- location.type: bevorzugt ${VALID_LORE_TYPES.slice(0, 12).join(", ")} … (sonst passender Typ).
- Keine erfundenen Spielercharakter-Namen als NSC.
- Live-Marker des SL (NSC/Ort/Quest/Pause) haben Priorität — berücksichtige sie im Recap.
- discovered_loot: konkrete Beute, keine vagen Formulierungen.`;
