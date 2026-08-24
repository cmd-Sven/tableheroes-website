/**
 * AI lore and location detail generation server actions.
 */
"use server";

import { VALID_LORE_TYPES } from "@/src/lib/lore-types";
import { LoreEntrySchema } from "@/src/lib/validations/schemas";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
  validateAIResponseAgainstWorld,
  verifyGM,
  getWorldBlueprintContext,
} from "./_shared";

export async function generateLore(campaignId: string, userPrompt: string) {
  const supabase = await verifyGM(campaignId);
  const rootWorldContext = await getRootWorldContext(supabase, campaignId);
  const worldContext = await getWorldContext(supabase, campaignId);
  const blueprintContext = await getWorldBlueprintContext(supabase, campaignId);

  const systemPrompt = `
    Du bist Game Master. Erstelle einen Ort oder ein historisches Ereignis (Lore), der in die existierende Welt passt.
    
    ${rootWorldContext}
    ${blueprintContext}
    
    WELT KONTEXT (Existierende Inhalte):
    ${worldContext}

    WICHTIG:
    - Berücksichtige existierende Orte. Erstelle neue Orte, die geografisch verknüpft sind (z.B. "Südlich von Explora...", "In der Nähe von...").
    - Berücksichtige die "GEHEIMNISSE & WISSEN" im Kontext, um konsistente Hintergrundgeschichten zu erstellen.
    - 'type' MUSS einer dieser Werte sein: ${VALID_LORE_TYPES.join(", ")}
    - Nutze spezifische Typen wie "Stadt", "Region", "Artefakt", "Mythos" statt generischer Begriffe.

    ANFORDERUNGEN:
    - Valid JSON. Sprache: Deutsch.
    
    JSON: { 
      "name": "string", 
      "type": "string (MUSS einer sein: ${VALID_LORE_TYPES.join(", ")})", 
      "description": "string (Beschreibung für Spieler)", 
      "gm_notes": "string (Interne Notizen, Geheimnisse)" 
    }
  `;

  const rawLore = await callOpenAI(systemPrompt, userPrompt);

  // Zentrale Zod-Validierung der KI-Antwort für Lore-Einträge
  const parsedLore = LoreEntrySchema.safeParse(rawLore);
  if (!parsedLore.success) {
    console.error("AI Validation Error (LoreEntrySchema):", parsedLore.error.format());
    throw new Error("Die KI hat ein ungültiges Format für den Lore-Eintrag geliefert.");
  }

  const result = parsedLore.data;

  // Validierung gegen Root-World-Kontext
  const { data: world } = await supabase
    .from("worlds")
    .select("genre_style, magic_level")
    .eq("campaign_id", campaignId)
    .single();

  const validation = await validateAIResponseAgainstWorld(result, world);
  if (validation.warnings.length > 0) {
    console.warn("⚠️ KI-Validierungswarnungen:", validation.warnings);
    // @ts-expect-error - Optional field for validation warnings
    result._validationWarnings = validation.warnings;
  }

  return result;
}

// ------------------------------------------------------------------
// 5. SESSION HOOK GENERATOR (Mit Quest-Erstellung & Combat Prep!)
// ------------------------------------------------------------------

export async function generateLocationDetails(
  campaignId: string,
  name: string,
  characterBio: string
) {
  const supabase = await verifyGM(campaignId);

  const systemPrompt = `Du bist ein Story-Assistent für ein RPG. Erstelle detaillierte Informationen für einen Ort basierend auf dem Namen und der Charakter-Biografie.

Antworte NUR mit diesem JSON Format:
{
  "description": "Ausführliche Beschreibung des Ortes",
  "type": "Location, History, Religion, etc.",
  "atmosphere": "Stimmung und Atmosphäre des Ortes"
}`;

  const userPrompt = `Ort: "${name}"\n\nCharakter-Biografie:\n${characterBio}`;

  try {
    const result = await callOpenAI(systemPrompt, userPrompt);
    return {
      description: result.description || "",
      type: result.type || "Location",
      atmosphere: result.atmosphere || "",
    };
  } catch (error) {
    console.error("generateLocationDetails Error:", error);
    throw error instanceof Error
      ? error
      : new Error("Fehler bei der Orts-Generierung.");
  }
}

// ------------------------------------------------------------------
// 12. NPC DETAILS GENERATOR (für GM Review)
// ------------------------------------------------------------------