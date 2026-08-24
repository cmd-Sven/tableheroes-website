/**
 * AI session hook and scene detail generation server actions.
 */
"use server";

import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
  verifyGM
} from "./_shared";

export async function generateSessionHook(
  campaignId: string,
  locationName: string,
  npcNames: string[],
  userPrompt: string,
  averagePartyLevel: number,
  lastSessionContext: string
) {
  const supabase = await verifyGM(campaignId);
  const worldContext = await getWorldContext(supabase, campaignId);

  // Fetch open quests for context
  const { data: openQuests } = await supabase
    .from("quests")
    .select("title, description")
    .eq("campaign_id", campaignId)
    .eq("status", "Active")
    .limit(5);

  let questContext = "";
  if (openQuests && openQuests.length > 0) {
    questContext = `\nOFFENE QUESTS:\n${openQuests.map((q: any) => `- ${q.title}: ${q.description || ""}`).join("\n")}`;
  }

  // Build last session context string
  let lastSessionString = "";
  if (lastSessionContext) {
    lastSessionString = `\n\nLETZTE SESSION KONTEXT:\n${lastSessionContext}\n\nWICHTIG: Wenn die letzte Session unterbrochen wurde (Status: Paused/In Progress), setze diese Szene sofort fort!`;
  }

  const systemPrompt = `
    Du bist ein Game Master Assistant, der eine Session vorbereitet.
    Erstelle einen spannenden "Hook" (Einstieg) oder eine Szene.
    
    WICHTIG:
    1. Berücksichtige den Ort (${locationName || "Kein Ort ausgewählt"}) und die NPCs (${npcNames.length > 0 ? npcNames.join(", ") : "Keine NPCs ausgewählt"}).
    2. Prüfe OFFENE QUESTS im Kontext. Wenn passend, greife sie auf.
    3. NEUE QUEST: Wenn die Idee des Users ("${userPrompt}") nach einer neuen Aufgabe klingt, erstelle ein 'new_quest_suggestion' Objekt.
    4. LETZTE SESSION: ${lastSessionString ? "Berücksichtige den Kontext der letzten Session. Wenn sie unterbrochen wurde, setze sie fort!" : "Keine vorherige Session vorhanden."}
    5. COMBAT / ENCOUNTER LOGIC: Die Party ist Level ${averagePartyLevel} (APL = Average Party Level). Wenn ein Konflikt Sinn macht, schlage Gegner vor, die für ein VTT (Virtual Tabletop wie Foundry) geeignet sind. Erstelle KEINE DB-Einträge für Monster. Liste sie einfach auf.
    
    WELT KONTEXT:
    ${worldContext}
    ${questContext}
    ${lastSessionString}

    ANFORDERUNGEN:
    - Valid JSON. Sprache: Deutsch.
    - Combat Suggestion Format: "Foundry Prep: [Anzahl]x [Gegner], [Anzahl]x [Gegner] ([Schwierigkeit] Encounter)"
    
    JSON STRUKTUR:
    { 
      "name": "Titel der Szene", 
      "goal_description": "Was sollen die Spieler tun?", 
      "gm_notes": "Interne Notizen & Geheimnisse",
      "weather_context": "Wetter/Atmosphäre",
      "combat_suggestion": "z.B. 'Foundry Prep: 4x Banditen, 1x Hauptmann (Schwerer Encounter)' oder leer lassen wenn kein Kampf",
      "new_quest_suggestion": {  // OPTIONAL: Nur füllen, wenn eine neue Quest Sinn macht
         "title": "Name der Quest",
         "description": "Aufgabe",
         "gm_notes": "Hintergrund",
         "rewards": "Belohnung",
         "type": "Side Quest"
      }
    }
  `;

  return await callOpenAI(systemPrompt, userPrompt || "Ein überraschendes Ereignis");
}

// ------------------------------------------------------------------
// 6. BACKSTORY SUGGESTIONS (Player Facing - "Lore Whisperer")
// ------------------------------------------------------------------

export async function generateNpcDetails(
  campaignId: string,
  baseInfo: { name: string; relation: string; age: number },
  characterBio: string
) {
  const supabase = await verifyGM(campaignId);

  const systemPrompt = `Du bist ein Story-Assistent für ein RPG. Erstelle detaillierte Informationen für einen NPC basierend auf den Basis-Informationen und der Charakter-Biografie.

Antworte NUR mit diesem JSON Format:
{
  "description": "Ausführliche Beschreibung des NPCs",
  "appearance": "Äußeres Erscheinungsbild",
  "secret_notes": "Geheimnisse oder wichtige Hintergrundinformationen für den GM"
}`;

  const userPrompt = `NPC: "${baseInfo.name}"\nBeziehung: ${baseInfo.relation}\nAlter: ${baseInfo.age}\n\nCharakter-Biografie:\n${characterBio}`;

  try {
    const result = await callOpenAI(systemPrompt, userPrompt);
    return {
      description: result.description || "",
      appearance: result.appearance || "",
      secret_notes: result.secret_notes || "",
    };
  } catch (error) {
    console.error("generateNpcDetails Error:", error);
    throw error instanceof Error
      ? error
      : new Error("Fehler bei der NPC-Generierung.");
  }
}

// ------------------------------------------------------------------
// 13. NPC DETAILS FROM HOOK GENERATOR (für Hook-Wizard)
// ------------------------------------------------------------------