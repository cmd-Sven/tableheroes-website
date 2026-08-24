/**
 * AI world skeleton generation server actions.
 */
"use server";

import { VALID_LORE_TYPES } from "@/src/lib/lore-types";
import { VALID_FACTION_TYPES, VALID_RELATIONSHIPS } from "@/src/lib/faction-types";
import {
  callOpenAI,
  verifyGM,
} from "./_shared";

export async function generateWorldSkeleton(
  campaignId: string,
  theme: string
) {
  const supabase = await verifyGM(campaignId);

  // Fetch campaign info for context
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("name, system, description")
    .eq("id", campaignId)
    .single();

  // Expliziter Cast, um 'never' zu verhindern
  const campaign = campaignRaw as { name: string | null; system: string | null; description: string | null } | null;

  const systemPrompt = `
    Du bist ein Game Master Assistant. Erstelle ein "World Skeleton" (Grundgerüst) für eine neue Kampagne.
    Ein Skeleton ist eine Sammlung von Basis-Entitäten (Fraktionen, Orte, NPCs), die als Startpunkt dienen.
    
    KAMPAGNE KONTEXT:
    - Name: ${campaign?.name || "Unbenannt"}
    - System: ${campaign?.system || "Unbekannt"}
    - Beschreibung: ${campaign?.description || "Keine"}
    - Thema: ${theme}

    ANFORDERUNGEN:
    - Valid JSON. Sprache: Deutsch.
    - Erstelle 3-5 Fraktionen (Gilden, Orden, Kulturen)
    - Erstelle 5-8 Orte (Städte, Regionen, wichtige Locations)
    - Erstelle 5-10 NPCs (wichtige Figuren, Anführer, Händler)
    - Alle Entitäten sollten zum Thema passen und eine kohärente Welt bilden.
    - Beschreibungen sollten kurz aber aussagekräftig sein (2-3 Sätze).
    - 'faction.type' MUSS einer sein: ${VALID_FACTION_TYPES.join(", ")}
    - 'faction.current_status' MUSS einer sein: ${VALID_RELATIONSHIPS.join(", ")} oder leer
    - 'location.type' MUSS einer sein: ${VALID_LORE_TYPES.join(", ")}
    
    JSON STRUKTUR:
    {
      "factions": [
        {
          "name": "Name der Fraktion",
          "type": "string (MUSS einer sein: ${VALID_FACTION_TYPES.join(", ")})",
          "current_status": "string (MUSS einer sein: ${VALID_RELATIONSHIPS.join(", ")} oder leer)",
          "description": "Kurze Beschreibung",
          "gm_notes": "Interne Notizen"
        }
      ],
      "locations": [
        {
          "name": "Name des Ortes",
          "type": "string (MUSS einer sein: ${VALID_LORE_TYPES.join(", ")})",
          "description": "Kurze Beschreibung",
          "gm_notes": "Interne Notizen"
        }
      ],
      "npcs": [
        {
          "name": "Name des NPCs",
          "title": "Beruf/Rolle",
          "description": "Kurze Beschreibung",
          "gm_notes": "Interne Notizen",
          "faction_name_suggestion": "Name der Fraktion (wenn zugehörig)",
          "race": "string",
          "role": "string",
          "status": "Alive" | "Deceased" | "Missing" | "Unknown",
          "appearance": "string",
          "personality_traits": "string"
        }
      ]
    }
  `;

  return await callOpenAI(systemPrompt, `Erstelle ein World Skeleton für das Thema: ${theme}`);
}

// ------------------------------------------------------------------
// 9. CHARACTER QUEST GENERATOR (RPC-basiert)
// ------------------------------------------------------------------