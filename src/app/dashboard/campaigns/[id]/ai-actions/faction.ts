/**
 * AI faction generation and detail expansion server actions.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import {
  VALID_FACTION_TYPES,
  VALID_RELATIONSHIPS,
  FACTION_MEMBER_ROLES,
} from "@/src/lib/faction-types";
import { FactionAIResponseSchema } from "@/src/lib/validations/schemas";
import type { WorldBlueprint } from "@/src/types/world";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
  validateAIResponseAgainstWorld,
  verifyGM,
} from "./_shared";

export async function generateFaction(campaignId: string, userPrompt: string) {
  const supabase = await verifyGM(campaignId);
  const rootWorldContext = await getRootWorldContext(supabase, campaignId);
  const worldContext = await getWorldContext(supabase, campaignId);

  // Lade verfügbare Locations für Headquarters-Matching
  const { data: locations } = await supabase
    .from("world_lore")
    .select("id, name, type")
    .eq("campaign_id", campaignId)
    .in("type", ["Stadt", "Region", "Insel", "Gebäude", "Tempel", "Akademie", "Festung", "Ruine", "Palast"])
    .limit(30);

  let locationsContext = "";
  if (locations && locations.length > 0) {
    locationsContext = "\nVERFÜGBARE ORTE (für 'headquarters_location_name_suggestion'):\n";
    locations.forEach((loc: any) => {
      locationsContext += `- ${loc.name} (${loc.type})\n`;
    });
  }

  const systemPrompt = `
    Du bist Game Master. Erstelle eine Fraktion, die in die existierende Welt passt.
    
    ${rootWorldContext}
    
    WELT KONTEXT (Existierende Inhalte):
    ${worldContext}
    ${locationsContext}

    WICHTIG:
    - Berücksichtige existierende Fraktionen. Erstelle Rivalen, Verbündete oder unabhängige Fraktionen, die zur Welt passen.
    - Berücksichtige die "GEHEIMNISSE & WISSEN" im Kontext, um konsistente Hintergrundgeschichten zu erstellen.
    - Wenn ein Ort aus "VERFÜGBARE ORTE" als Hauptquartier passt, nutze dessen Namen EXAKT für 'headquarters_location_name_suggestion'.
    - 'type' MUSS einer dieser Werte sein: ${VALID_FACTION_TYPES.join(", ")}
    - 'current_status' MUSS einer dieser Werte sein: ${VALID_RELATIONSHIPS.join(", ")} oder leer lassen.

    ERWEITERTE IDENTITÄT DER FRAKTION:
    - 'appearance': Beschreibe detailliert Wappen, Uniformfarben, Symbole, Slogans und optische Erkennungsmerkmale.
      * Welche Farben dominieren?
      * Wie sieht das Wappen aus?
      * Welche typischen Kleidungsstücke/Uniformen tragen Mitglieder?
      * Gibt es Parolen, Losungen oder Glaubenssätze, die oft gerufen/rezitiert werden?
    - 'structure': Wie ist die Fraktion organisiert?
      * z.B. streng militärische Hierarchie, lose Zellenstruktur, geheimer Zirkel, bürokratischer Apparat, Kasten-System.
      * Nenne typische Ränge oder Funktionen, falls passend.
    - 'philosophy': Was sind die tieferen Ziele, Dogmen oder die Weltanschauung der Fraktion?
      * Was glauben sie? Wofür kämpfen sie? Welche Opfer sind sie bereit zu bringen?
      * Wie sehen sie andere Fraktionen / die Welt?
    - 'important_npcs_info': Kurze Beschreibungen von 2–3 weiteren wichtigen Rollen innerhalb der Fraktion.
      * KEINE vollen NPC-Profile, sondern Rollensteckbriefe.
      * WICHTIGES FORMAT (Markdown-Liste, damit der Parser mehrere Personen sicher erkennt):
        - Nutze für JEDEN NPC eine NEUE ZEILE im Format:
          "- Name - Kurze Beschreibung"
        - Beispiele:
          "- Hochinquisitor Seran - fanatischer Anführer der inneren Zirkel, überwacht innere Reinheit."
          "- Quartiermeisterin Lira - kontrolliert alle Ressourcen und Bestechungen im Hafenviertel."
        - Verwende IMMER dieses Muster mit führendem '-' und genau einem '-' zwischen Name und Beschreibung.
    - 'planned_members': OPTIONAL. Maximal 3 geplante Mitglieder für die NPC-TODO-Liste. Jedes Objekt: { "name": "string", "role": "string" }. role MUSS einer sein: ${FACTION_MEMBER_ROLES.join(", ")}.

    ANFORDERUNGEN:
    - Valid JSON. Sprache: Deutsch.
    
    JSON: { 
      "name": "string", 
      "type": "string (MUSS einer sein: ${VALID_FACTION_TYPES.join(", ")})", 
      "current_status": "string (MUSS einer sein: ${VALID_RELATIONSHIPS.join(", ")} oder leer)", 
      "description": "string (kurze Beschreibung für Spieler, 2–4 Sätze)", 
      "gm_notes": "string (Interne Notizen, Geheimnisse, Plot-Ideen)",
      "headquarters_location_name_suggestion": "string (Exakter Name aus VERFÜGBARE ORTE oder leer)",
      "appearance": "string (Detaillierte Beschreibung von Wappen, Uniformfarben, Slogans und optischen Erkennungsmerkmalen)",
      "structure": "string (Beschreibung der inneren Struktur und Hierarchie der Fraktion)",
      "philosophy": "string (Ziele, Dogmen, Weltanschauung der Fraktion)",
      "important_npcs_info": "string (2–3 weitere wichtige Rollen mit kurzen Beschreibungen, als Markdown-Liste im Format: '- Name - Kurze Beschreibung' pro Zeile)",
      "planned_members": "optional, array of max 3 objects: [{ name: string, role: string }]. role MUSS einer sein: ${FACTION_MEMBER_ROLES.join(", ")}"
    }
  `;

  const rawFaction = await callOpenAI(systemPrompt, userPrompt);

  // Zentrale Zod-Validierung der KI-Antwort für Fraktionen
  const parsedFaction = FactionAIResponseSchema.safeParse(rawFaction);
  if (!parsedFaction.success) {
    console.error("AI Validation Error (FactionAIResponseSchema):", parsedFaction.error.format());
    throw new Error("Die KI hat ein ungültiges Format für die Fraktion geliefert.");
  }

  const result: any = parsedFaction.data;

  // Validierung gegen Root-World-Kontext
  const { data: world } = await supabase
    .from("worlds")
    .select("genre_style, magic_level")
    .eq("campaign_id", campaignId)
    .single();

  const validation = await validateAIResponseAgainstWorld(result, world);
  if (validation.warnings.length > 0) {
    console.warn("⚠️ KI-Validierungswarnungen:", validation.warnings);
    result._validationWarnings = validation.warnings;
  }

  // Optional: Versuche headquarters_location_id zu finden, wenn headquarters_location_name_suggestion vorhanden
  if (result.headquarters_location_name_suggestion && locations && locations.length > 0) {
    type LocationType = { id: string; name: string | null; type: string | null };
    const matchedLocation = (locations as LocationType[]).find(
      (loc) => loc.name?.toLowerCase() === result.headquarters_location_name_suggestion?.toLowerCase()
    );
    
    if (matchedLocation) {
      result.headquarters_location_id = matchedLocation.id;
    } else {
      // Fallback: Fuzzy Match
      const fuzzyLocation = (locations as LocationType[]).find(
        (loc) => loc.name?.toLowerCase().includes(result.headquarters_location_name_suggestion?.toLowerCase() || "") ||
                      result.headquarters_location_name_suggestion?.toLowerCase().includes(loc.name?.toLowerCase() || "")
      );
      
      if (fuzzyLocation) {
        result.headquarters_location_id = fuzzyLocation.id;
      }
    }
  }

  return result;
}

// ------------------------------------------------------------------
// 3b. FRAKTION GENERATOR (Welt-Kontext, ohne Kampagne)
// ------------------------------------------------------------------

export async function generateFactionForWorld(worldId: string, userPrompt: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("id, name, gm_id, blueprint")
    .eq("id", worldId)
    .single();

  if (!worldRaw || (worldRaw as { gm_id: string }).gm_id !== user.id) {
    throw new Error("Nur der GM dieser Welt kann Fraktionen per KI generieren.");
  }

  const world = worldRaw as { name: string; blueprint?: WorldBlueprint | null };
  const { buildBlueprintContext } = await import("@/src/app/dashboard/worlds/world-npc-actions");
  const blueprintContext = await buildBlueprintContext(world.name, world.blueprint ?? null);

  const LOCATION_TYPES_FOR_HQ = ["Stadt", "Region", "Insel", "Gebäude", "Tempel", "Kathedrale", "Akademie", "Taverne", "Kaserne", "Kontor", "Hafen", "Ort", "Dorf", "Stadtteil"];

  const [locationsRes, factionsRes] = await Promise.all([
    (supabase.from("world_lore") as any)
      .select("id, name, type")
      .eq("world_id", worldId)
      .in("type", LOCATION_TYPES_FOR_HQ)
      .limit(50),
    (supabase.from("factions") as any)
      .select("id, name")
      .eq("world_id", worldId)
      .limit(30),
  ]);

  const locations = locationsRes.data ?? [];
  const factions = factionsRes.data ?? [];

  let locationsContext = "";
  if (locations.length > 0) {
    locationsContext = "\nVERFÜGBARE ORTE (für 'headquarters_location_name_suggestion'):\n";
    locations.forEach((loc: any) => {
      locationsContext += `- ${loc.name} (${loc.type})\n`;
    });
  }

  let factionsContext = "";
  if (factions.length > 0) {
    factionsContext = "\nEXISTIERENDE FRAKTIONEN (berücksichtigen, keine Duplikate):\n";
    factions.forEach((f: any) => {
      factionsContext += `- ${f.name}\n`;
    });
  }

  const rootWorldContext = `\n=== WELT KONTEXT ===\nWelt: ${world.name}\n${blueprintContext}\n`;

  const systemPrompt = `
    Du bist Game Master. Erstelle eine Fraktion, die in die existierende Welt passt.
    
    ${rootWorldContext}
    ${factionsContext}
    ${locationsContext}

    WICHTIG:
    - Berücksichtige existierende Fraktionen. Erstelle Rivalen, Verbündete oder unabhängige Fraktionen, die zur Welt passen.
    - Wenn ein Ort aus "VERFÜGBARE ORTE" als Hauptquartier passt, nutze dessen Namen EXAKT für 'headquarters_location_name_suggestion'.
    - 'type' MUSS einer dieser Werte sein: ${VALID_FACTION_TYPES.join(", ")}
    - 'current_status' MUSS einer dieser Werte sein: ${VALID_RELATIONSHIPS.join(", ")} oder leer lassen.

    ERWEITERTE IDENTITÄT DER FRAKTION:
    - 'appearance': Beschreibe detailliert Wappen, Uniformfarben, Symbole, Slogans und optische Erkennungsmerkmale.
    - 'structure': Wie ist die Fraktion organisiert? (Hierarchie, Ränge, Struktur)
    - 'philosophy': Ziele, Dogmen, Weltanschauung der Fraktion.
    - 'important_npcs_info': 2–3 weitere wichtige Rollen als Markdown-Liste im Format '- Name - Kurze Beschreibung' pro Zeile.
    - 'planned_members': OPTIONAL. Maximal 3 geplante Mitglieder. Jedes Objekt: { "name": "string", "role": "string" }. role MUSS einer sein: ${FACTION_MEMBER_ROLES.join(", ")}.

    ANFORDERUNGEN:
    - Valid JSON. Sprache: Deutsch.
    
    JSON: { 
      "name": "string", 
      "type": "string (MUSS einer sein: ${VALID_FACTION_TYPES.join(", ")})", 
      "current_status": "string (MUSS einer sein: ${VALID_RELATIONSHIPS.join(", ")} oder leer)", 
      "description": "string (kurze Beschreibung für Spieler, 2–4 Sätze)", 
      "gm_notes": "string (Interne Notizen, Geheimnisse, Plot-Ideen)",
      "headquarters_location_name_suggestion": "string (Exakter Name aus VERFÜGBARE ORTE oder leer)",
      "appearance": "string",
      "structure": "string",
      "philosophy": "string",
      "important_npcs_info": "string (Format: '- Name - Kurze Beschreibung' pro Zeile)",
      "planned_members": "optional, array of max 3: [{ name: string, role: string }]. role einer von: ${FACTION_MEMBER_ROLES.join(", ")}"
    }
  `;

  const rawFaction = await callOpenAI(systemPrompt, userPrompt);

  const parsedFaction = FactionAIResponseSchema.safeParse(rawFaction);
  if (!parsedFaction.success) {
    console.error("AI Validation Error (FactionAIResponseSchema):", parsedFaction.error.format());
    throw new Error("Die KI hat ein ungültiges Format für die Fraktion geliefert.");
  }

  const result: any = parsedFaction.data;

  if (result.headquarters_location_name_suggestion && locations.length > 0) {
    type LocationType = { id: string; name: string | null; type: string | null };
    const matchedLocation = (locations as LocationType[]).find(
      (loc) => loc.name?.toLowerCase() === result.headquarters_location_name_suggestion?.toLowerCase()
    );
    if (matchedLocation) {
      result.headquarters_location_id = matchedLocation.id;
    } else {
      const fuzzyLocation = (locations as LocationType[]).find(
        (loc) =>
          loc.name?.toLowerCase().includes(result.headquarters_location_name_suggestion?.toLowerCase() || "") ||
          result.headquarters_location_name_suggestion?.toLowerCase().includes(loc.name?.toLowerCase() || "")
      );
      if (fuzzyLocation) {
        result.headquarters_location_id = fuzzyLocation.id;
      }
    }
  }

  return result;
}

// ------------------------------------------------------------------
// 4. LORE GENERATOR
// ------------------------------------------------------------------

export async function generateFactionDetails(
  campaignId: string,
  name: string,
  characterBio: string
) {
  const supabase = await verifyGM(campaignId);

  const systemPrompt = `Du bist ein Story-Assistent für ein RPG. Erstelle detaillierte Informationen für eine Fraktion basierend auf dem Namen und der Charakter-Biografie.

Antworte NUR mit diesem JSON Format:
{
  "description": "Ausführliche Beschreibung der Fraktion",
  "alignment": "Neutral, Verbündet, Feindlich, etc.",
  "goals": "Hauptziele und Motivationen der Fraktion"
}`;

  const userPrompt = `Fraktion: "${name}"\n\nCharakter-Biografie:\n${characterBio}`;

  try {
    const result = await callOpenAI(systemPrompt, userPrompt);
    return {
      description: result.description || "",
      alignment: result.alignment || "Neutral",
      goals: result.goals || "",
    };
  } catch (error) {
    console.error("generateFactionDetails Error:", error);
    throw error instanceof Error
      ? error
      : new Error("Fehler bei der Fraktions-Generierung.");
  }
}

// ------------------------------------------------------------------
// 11. LOCATION DETAILS GENERATOR (für GM Review)
// ------------------------------------------------------------------