/**
 * AI world-context and briefing analysis helpers for NPC wizards.
 */
"use server";

import { LOCATION_TYPES } from "@/src/lib/lore-types";
import { VALID_FACTION_TYPES } from "@/src/lib/faction-types";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
  verifyGM,
} from "./_shared";

export async function analyzeWorldContext(
  campaignId: string,
  briefing: string,
  existingLocations: Array<{ id: string; name: string; type: string }>,
  existingFactions: Array<{ id: string; name: string; type?: string }>
) {
  const supabase = await verifyGM(campaignId);
  const worldContext = await getWorldContext(supabase, campaignId);

  // Erstelle Listen der existierenden Namen
  const existingLocationNames = existingLocations.map((loc) => loc.name.toLowerCase());
  const existingFactionNames = existingFactions.map((faction) => faction.name.toLowerCase());

  const systemPrompt = `
    Du bist Game Master. Analysiere das Briefing/Charakter-Anweisungen und identifiziere Orte und Fraktionen, die erwähnt werden, aber noch nicht in der Welt existieren.
    
    WELT KONTEXT:
    ${worldContext}
    
    EXISTIERENDE ORTE:
    ${existingLocations.map((loc) => `- ${loc.name} (${loc.type})`).join("\n") || "Keine"}
    
    EXISTIERENDE FRAKTIONEN:
    ${existingFactions.map((f) => `- ${f.name}${f.type ? ` (${f.type})` : ""}`).join("\n") || "Keine"}
    
    BRIEFING:
    ${briefing}
    
    AUFGABE:
    Analysiere das Briefing und identifiziere:
    1. **Orte** (Städte, Regionen, Gebäude, etc.), die erwähnt werden, aber NICHT in "EXISTIERENDE ORTE" vorkommen
    2. **Fraktionen** (Gilden, Religionen, etc.), die erwähnt werden, aber NICHT in "EXISTIERENDE FRAKTIONEN" vorkommen
    
    WICHTIG:
    - NUR Orte/Fraktionen extrahieren, die EXPLIZIT im Briefing erwähnt werden
    - Wenn ein Ort erwähnt wird, versuche zu erkennen, in welcher Region/Stadt er liegt (parent_location)
    - Nutze die Typen aus LOCATION_TYPES für Orte: ${LOCATION_TYPES.join(", ")}
    - Nutze die Typen aus VALID_FACTION_TYPES für Fraktionen: ${VALID_FACTION_TYPES.join(", ")}
    - **KRITISCH - EINDEUTIGKEIT:** Jeder Ort/Fraktion darf NUR EINEN Typ haben. Wähle den SPEZIFISCHSTEN Typ aus der Liste.
      * Beispiel: Ein Ort kann NICHT gleichzeitig "Region" UND "Ort" sein. Wenn es eine Stadt ist, wähle "Stadt", nicht "Region".
      * Beispiel: Ein Ort kann NICHT gleichzeitig "Gebäude" UND "Tempel" sein. Wenn es ein Tempel ist, wähle "Tempel", nicht "Gebäude".
      * Wähle immer den spezifischsten Typ, der am besten passt (z.B. "Tempel" statt "Gebäude", "Stadt" statt "Region").
    - Wenn der Typ unklar ist, wähle den passendsten und spezifischsten aus der Liste
    
    ANFORDERUNGEN:
    - Valid JSON. Sprache: Deutsch.
    - Wenn keine neuen Entitäten gefunden werden, gib leere Arrays zurück.
    
    JSON STRUKTUR:
    {
      "locations": [
        {
          "name": "string (Name des Ortes)",
          "type": "string (MUSS einer sein: ${LOCATION_TYPES.join(", ")})",
          "parent_location_name": "string (Name des Parent-Ortes, falls erwähnt, sonst leer)"
        }
      ],
      "factions": [
        {
          "name": "string (Name der Fraktion)",
          "type": "string (MUSS einer sein: ${VALID_FACTION_TYPES.join(", ")})",
          "headquarters_location_name": "string (Name des Hauptsitzes, falls erwähnt, sonst leer)"
        }
      ]
    }
  `;

  const result = await callOpenAI(systemPrompt, `Analysiere das Briefing und extrahiere neue Orte und Fraktionen:\n\n${briefing}`);

  // Validiere und normalisiere die Ergebnisse
  const normalizedResult = {
    locations: (result.locations || []).map((loc: any) => ({
      name: loc.name || "",
      type: loc.type || "Ort",
      parent_location_name: loc.parent_location_name || "",
    })),
    factions: (result.factions || []).map((faction: any) => ({
      name: faction.name || "",
      type: faction.type || "Gilde",
      headquarters_location_name: faction.headquarters_location_name || "",
    })),
  };

  return normalizedResult;
}

// ------------------------------------------------------------------
// ANALYZE BRIEFING FOR NPCS (Extrahiert NPC-Namen aus dem Briefing)
// ------------------------------------------------------------------

export async function analyzeBriefingForNPCs(
  campaignId: string,
  briefing: string,
  existingNPCs: Array<{ id: string; name: string }>,
  selectedFactionId?: string | null,
  currentNpcName?: string | null
) {
  const supabase = await verifyGM(campaignId);
  const worldContext = await getWorldContext(supabase, campaignId);

  // Erstelle Liste der existierenden NPC-Namen
  const existingNPCNames = existingNPCs.map((npc) => npc.name.toLowerCase());

  // Lade Fraktions-Info, falls ausgewählt
  let factionInfo = "";
  if (selectedFactionId) {
    const { data: factionRaw } = await (supabase.from("factions") as any)
      .select("name, type, description")
      .eq("id", selectedFactionId)
      .single();
    
    const faction = factionRaw as { name: string | null; type: string | null; description: string | null } | null;
    
    if (faction) {
      factionInfo = `\nAUSGEWÄHLTE FRAKTION: ${faction.name} (${faction.type})${faction.description ? `\nBeschreibung: ${faction.description.substring(0, 200)}` : ""}`;
    }
  }

  // Haupt-Charakter ignorieren
  const ignoreName = currentNpcName ? `\n\nKRITISCH - IGNORIEREN: Der Haupt-Charakter heißt "${currentNpcName}". Ignoriere diesen Namen KOMPLETT bei der Extraktion. Extrahiere nur ANDERE Personen, die im Text erwähnt werden.` : "";

  const systemPrompt = `
    Du bist Game Master. Analysiere das Briefing/Charakter-Anweisungen und identifiziere NPC-Namen, die erwähnt werden, aber noch nicht in der Welt existieren.
    
    WELT KONTEXT:
    ${worldContext}
    ${factionInfo}
    ${ignoreName}
    
    EXISTIERENDE NPCS:
    ${existingNPCs.map((npc) => `- ${npc.name}`).join("\n") || "Keine"}
    
    BRIEFING:
    ${briefing}
    
    AUFGABE:
    Analysiere das Briefing und identifiziere:
    1. **NPC-Namen** (z.B. "General Warko", "Kapitän Thorne"), die EXPLIZIT erwähnt werden, aber NICHT in "EXISTIERENDE NPCS" vorkommen
    2. **Rollen/Titel** dieser NPCs (z.B. "General", "Kapitän", "Magister")
    3. **Beziehung zur ausgewählten Fraktion** (falls eine Fraktion ausgewählt wurde): Ist der NPC ein Feind, Verbündeter, Rivale?
    4. **Fraktionen/Orte** die im Text erwähnt werden (z.B. "Gilde: Klingensturm", "Stadt: Aventurien", "Clan: Drachenblut")
    
    WICHTIG - STICHPUNKT-ERKENNUNG:
    - Der Text kann in verschiedenen Formaten vorliegen: Fließtext, Stichpunkte, Listen
    - Erkenne auch Muster wie:
      * "Gilde: [Name]" oder "Gilde [Name]" → Extrahiere als Fraktion
      * "Ort: [Name]" oder "Stadt: [Name]" oder "Turm: [Name]" → Extrahiere als Ort
      * "Freund: [Name]" oder "Begleiter: [Name]" oder "Feind: [Name]" → Extrahiere als NPC mit Beziehung
      * "Clan: [Name]" oder "Haus: [Name]" → Extrahiere als Fraktion
    - Suche auch nach Schlüsselwörtern: Gilde, Clan, Haus, Stadt, Turm, Begleiter, Freund, Feind, Rivale, Verbündeter
    - NUR NPCs extrahieren, die EXPLIZIT mit Namen erwähnt werden (z.B. "General Warko", nicht nur "der General")
    - Wenn eine Fraktion ausgewählt wurde und der NPC als Feind/Rivale beschrieben wird, markiere dies
    - Ignoriere generische Bezeichnungen wie "der Händler", "ein Wächter" (nur wenn kein Name genannt wird)
    ${currentNpcName ? `- **IGNORIERE ABSOLUT:** Den Namen "${currentNpcName}" - dieser ist der Haupt-Charakter selbst und darf NICHT extrahiert werden!` : ""}
    
    ANFORDERUNGEN:
    - Valid JSON. Sprache: Deutsch.
    - Wenn keine neuen NPCs gefunden werden, gib ein leeres Array zurück.
    
    JSON STRUKTUR:
    {
      "npcs": [
        {
          "name": "string (Name des NPCs, z.B. 'General Warko')",
          "role": "string (Rolle/Titel, z.B. 'General', 'Kapitän')",
          "suggestedRelationType": "string (Vorschlag für Beziehungstyp: 'Feind', 'Rivale', 'Verbündeter', 'Freund', etc. oder leer)",
          "context": "string (Kurzer Kontext aus dem Briefing, warum dieser NPC erwähnt wird)"
        }
      ],
      "factionRelationship": "string (Wenn eine Fraktion ausgewählt wurde: 'Feindlich', 'Verbündet', 'Neutral' oder leer)"
    }
  `;

  const result = await callOpenAI(systemPrompt, `Analysiere das Briefing und extrahiere neue NPC-Namen, Fraktionen und Orte:\n\n${briefing}`);

  // Validiere und normalisiere die Ergebnisse
  let normalizedNPCs = (result.npcs || []).map((npc: any) => ({
    name: npc.name || "",
    role: npc.role || "",
    suggestedRelationType: npc.suggestedRelationType || "",
    context: npc.context || "",
  }));

  // Zusätzlicher Filter: Entferne den Haupt-Charakter (Case-insensitive)
  if (currentNpcName) {
    const currentNameLower = currentNpcName.toLowerCase().trim();
    normalizedNPCs = normalizedNPCs.filter(
      (npc: { name: string }) => npc.name.toLowerCase().trim() !== currentNameLower
    );
  }

  // Filter: Entferne NPCs, die bereits in existingNPCs existieren (Case-insensitive)
  normalizedNPCs = normalizedNPCs.filter(
    (npc: { name: string }) => !existingNPCNames.includes(npc.name.toLowerCase().trim())
  );

  // Normalisiere Fraktionen und Orte
  const normalizedFactions = (result.factions || []).map((faction: any) => ({
    name: faction.name || "",
    type: faction.type || "Gilde",
    context: faction.context || "",
  }));

  const normalizedLocations = (result.locations || []).map((location: any) => ({
    name: location.name || "",
    type: location.type || "Ort",
    context: location.context || "",
  }));

  const normalizedResult = {
    npcs: normalizedNPCs,
    factions: normalizedFactions,
    locations: normalizedLocations,
    factionRelationship: result.factionRelationship || "",
  };

  return normalizedResult;
}
