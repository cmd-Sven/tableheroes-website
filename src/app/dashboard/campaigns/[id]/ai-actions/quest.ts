/**
 * AI quest and character-quest generation server actions.
 */
"use server";

import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
  validateAIResponseAgainstWorld,
  verifyGM
} from "./_shared";

export async function generateQuest(
  campaignId: string,
  contextIds: { questGiverId?: string; locationId?: string; targetCharacterId?: string },
  userPrompt: string,
  priorities?: {
    include: string[];
    prioritize: string[];
    anchors: Array<{ id: string; type: string; label: string; summary: string }>;
  }
) {
  const supabase = await verifyGM(campaignId);
  let specificContext = "";

  if (contextIds.questGiverId) {
    const { data: npcRaw } = await (supabase.from("npcs") as any)
      .select("name, title, description")
      .eq("id", contextIds.questGiverId)
      .single();
    const npc = npcRaw as { name: string | null; title: string | null; description: string | null } | null;
    if (npc) {
      specificContext += `\n- QUEST GEBER: ${npc.name}${npc.title ? ` (${npc.title})` : ""}${npc.description ? `. Info: ${npc.description}` : ""}`;
    }
  }
  
  if (contextIds.locationId) {
    const { data: locRaw } = await (supabase.from("world_lore") as any)
      .select("name, type, description")
      .eq("id", contextIds.locationId)
      .single();
    const loc = locRaw as { name: string | null; type: string | null; description: string | null } | null;
    if (loc) {
      specificContext += `\n- ORT: ${loc.name}${loc.type ? ` (${loc.type})` : ""}${loc.description ? `. Info: ${loc.description}` : ""}`;
    }
  }

  let anchorsSection = "";
  let focusSection = "";
  if (priorities && priorities.anchors.length > 0) {
    const included = priorities.include || [];
    const prioritized = priorities.prioritize || [];
    const includedAnchors = priorities.anchors.filter((a) => included.includes(a.id));
    const prioritizedAnchors = priorities.anchors.filter((a) => prioritized.includes(a.id));

    if (includedAnchors.length > 0) {
      anchorsSection = "\n\n=== ERZÄHLERISCHE ANKER (EINBEZOGEN) ===\nErstelle eine Quest, die auf folgenden Elementen basiert:\n";
      includedAnchors.forEach((a) => {
        anchorsSection += `- [${a.type}] ${a.label}: ${a.summary}\n`;
      });
    }
    if (prioritizedAnchors.length > 0) {
      focusSection = "\n\n!!! FOKUSSIERE DICH MASSGEBLICH AUF: !!!\n";
      prioritizedAnchors.forEach((a) => {
        focusSection += `!!! ${a.label}: ${a.summary} !!!\n`;
      });
      const rivalCount = prioritizedAnchors.filter((a) => a.type === "faction_rival" || a.type === "faction").length;
      if (rivalCount >= 2) {
        focusSection += "\nWICHTIG: Zwei oder mehr Fraktionen sind priorisiert. Entwirf eine KONKURRENZ-QUEST-STRUKTUR: Was passiert, wenn die Spieler für Seite A oder Seite B arbeiten? Liefer einen Entwurf für die Gegen-Quest im Feld 'rival_quest_hook' (2-4 Sätze).\n";
      }
    }
  }

  // Load character data if targetCharacterId is provided
  let characterContext = "";
  if (contextIds.targetCharacterId) {
    const { data: characterRaw } = await (supabase.from("characters") as any)
      .select(`
        name,
        race,
        class,
        level,
        biography,
        character_relationships (
          relationship_type,
          description,
          npcs (
            name,
            role
          )
        )
      `)
      .eq("id", contextIds.targetCharacterId)
      .eq("campaign_id", campaignId)
      .single();

    const character = characterRaw as {
      name: string | null;
      race: string | null;
      class: string | null;
      level: number | null;
      biography: string | null;
      character_relationships?: any[];
    } | null;

    if (character) {
      const charData = character;
      characterContext = `\n\n=== PERSÖNLICHE QUEST FÜR CHARAKTER ===
CHARAKTER: ${charData.name} (${charData.race} ${charData.class}, Level ${charData.level || 1})
HINTERGRUNDGESCHICHTE: ${charData.biography || "Keine Biografie vorhanden."}`;

      // Add relationships
      if (charData.character_relationships && charData.character_relationships.length > 0) {
        characterContext += `\nBEKANNTE BEZIEHUNGEN:`;
        charData.character_relationships.forEach((rel: any) => {
          const npc = rel.npcs;
          if (npc) {
            characterContext += `\n- ${npc.name}${npc.role ? ` (${npc.role})` : ""}: ${rel.relationship_type}${rel.description ? ` - ${rel.description}` : ""}`;
          }
        });
      }
    }
  }

  // Hier laden wir auch den Welt-Kontext dazu!
  const worldContext = await getWorldContext(supabase, campaignId);

  const isPersonalQuest = !!contextIds.targetCharacterId;
  
  const systemPrompt = `
    Du bist Game Master. Erstelle eine Quest.
    ${isPersonalQuest ? "**WICHTIG: Dies ist eine PERSÖNLICHE Quest für einen spezifischen Charakter.**" : ""}
    
    WELT KONTEXT:
    ${worldContext}
    ${specificContext}
    ${characterContext}
    ${anchorsSection}
    ${focusSection}

    ${isPersonalQuest ? `
    ANWEISUNG FÜR PERSÖNLICHE QUEST:
    - Die Quest soll direkt auf die Vergangenheit oder die Ziele dieses Charakters eingehen.
    - Sie soll ihn emotional involvieren oder seine Fähigkeiten herausfordern.
    - Nutze die Hintergrundgeschichte und Beziehungen des Charakters, um eine maßgeschneiderte Story zu schreiben.
    - Die Quest sollte für diesen Charakter besonders relevant sein, kann aber auch andere Gruppenmitglieder einbeziehen.
    ` : ""}

    WICHTIG:
    - Wenn du einen existierenden NPC aus "WICHTIGE NPCs" oder "EXISTIERENDE FRAKTIONEN" verwendest, schreibe dessen Namen EXAKT so in 'suggested_quest_giver_name'.
    - Wenn du einen existierenden Ort aus "EXISTIERENDE ORTE" verwendest, schreibe dessen Namen EXAKT so in 'suggested_location_name'.
    - Wenn du neue NPCs/Orte erfindest, lasse diese Felder leer.
    ${isPersonalQuest ? "- Wenn möglich, nutze bekannte Beziehungen des Charakters als Quest-Geber oder Teilnehmer." : ""}
    - Gib immer ein Array 'objectives' mit 3-6 konkreten Quest-Zielen (Strings) zurück.
    - Wenn zwei rivalisierende Fraktionen im Fokus sind, fülle 'rival_quest_hook' mit einem kurzen Entwurf für die Gegen-Quest (2-4 Sätze). Sonst leerer String.

    ANFORDERUNGEN:
    - Valid JSON. Sprache: Deutsch.
    JSON: { 
      "title": "string", 
      "description": "string", 
      "gm_notes": "string", 
      "rewards": "string", 
      "type": "string",
      "objectives": ["string", "string", ...],
      "rival_quest_hook": "string (nur bei Konkurrenz-Quest, sonst leer)",
      "suggested_quest_giver_name": "string (Exakter Name aus EXISTIERENDE NPCs oder leer)",
      "suggested_location_name": "string (Exakter Name aus EXISTIERENDE ORTE oder leer)"
    }
  `;

  const aiResponse = await callOpenAI(systemPrompt, userPrompt);

  if (!Array.isArray(aiResponse.objectives)) {
    aiResponse.objectives = [];
  }
  if (typeof aiResponse.rival_quest_hook !== "string") {
    aiResponse.rival_quest_hook = "";
  }

  // Fuzzy Matching: Versuche NPC und Location IDs zu finden
  if (aiResponse.suggested_quest_giver_name) {
    const { data: matchedNPCRaw } = await (supabase.from("npcs") as any)
      .select("id, name")
      .eq("campaign_id", campaignId)
      .ilike("name", aiResponse.suggested_quest_giver_name)
      .limit(1)
      .single();
    
    const matchedNPC = matchedNPCRaw as { id: string; name: string | null } | null;
    if (matchedNPC) {
      aiResponse.quest_giver_id = matchedNPC.id;
    } else {
      // Fallback: Versuche Fuzzy Match (Name enthält den String)
      const { data: fuzzyNPCsRaw } = await (supabase.from("npcs") as any)
        .select("id, name")
        .eq("campaign_id", campaignId)
        .ilike("name", `%${aiResponse.suggested_quest_giver_name}%`)
        .limit(1);
      
      const fuzzyNPCs = fuzzyNPCsRaw as { id: string; name: string | null }[] | null;
      if (fuzzyNPCs && fuzzyNPCs.length > 0) {
        aiResponse.quest_giver_id = fuzzyNPCs[0].id;
      }
    }
  }

  if (aiResponse.suggested_location_name) {
    const { data: matchedLocationRaw } = await (supabase.from("world_lore") as any)
      .select("id, name")
      .eq("campaign_id", campaignId)
      .ilike("name", aiResponse.suggested_location_name)
      .limit(1)
      .single();
    
    const matchedLocation = matchedLocationRaw as { id: string; name: string | null } | null;
    if (matchedLocation) {
      aiResponse.location_id = matchedLocation.id;
    } else {
      // Fallback: Versuche Fuzzy Match (Name enthält den String)
      const { data: fuzzyLocationsRaw } = await (supabase.from("world_lore") as any)
        .select("id, name")
        .eq("campaign_id", campaignId)
        .ilike("name", `%${aiResponse.suggested_location_name}%`)
        .limit(1);
      
      const fuzzyLocations = fuzzyLocationsRaw as { id: string; name: string | null }[] | null;
      if (fuzzyLocations && fuzzyLocations.length > 0) {
        aiResponse.location_id = fuzzyLocations[0].id;
      }
    }
  }

  return aiResponse;
}

// ------------------------------------------------------------------
// 1b. UNIVERSAL SECRET GENERATOR ("AI Secret Architect")
// ------------------------------------------------------------------

export async function generateCharacterQuest(
  characterId: string,
  campaignId: string,
  bio: string
) {
  const supabase = await verifyGM(campaignId);

  // System Prompt für die KI
  const systemPrompt = `Du bist ein Story-Assistent für ein RPG. Analysiere die Biografie. Extrahiere einen wichtigen Ort (Heimat, Waisenhaus, etc.) und eine wichtige Kontaktperson. Erstelle dazu eine passende kurze Quest.
Antworte NUR mit diesem JSON Format:
{
  "location": { "name": "...", "description": "..." },
  "npc": { "name": "...", "description": "..." },
  "quest": { "title": "...", "description": "..." }
}`;

  try {
    // 1. KI-Aufruf
    const aiResponse = await callOpenAI(systemPrompt, bio);

    // 2. Validierung der KI-Antwort
    if (
      !aiResponse.location ||
      !aiResponse.location.name ||
      !aiResponse.location.description ||
      !aiResponse.npc ||
      !aiResponse.npc.name ||
      !aiResponse.npc.description ||
      !aiResponse.quest ||
      !aiResponse.quest.title ||
      !aiResponse.quest.description
    ) {
      throw new Error("KI-Antwort hat nicht das erwartete Format.");
    }

    // 3. Supabase RPC aufrufen
    const { data, error } = await (supabase.rpc as any)("create_generated_quest_bundle", {
      p_campaign_id: campaignId,
      p_loc_name: aiResponse.location.name,
      p_loc_desc: aiResponse.location.description,
      p_npc_name: aiResponse.npc.name,
      p_npc_desc: aiResponse.npc.description,
      p_quest_title: aiResponse.quest.title,
      p_quest_desc: aiResponse.quest.description,
    });

    if (error) {
      console.error("RPC Error:", error);
      throw new Error(`Fehler beim Erstellen der Quest-Bundle: ${error.message}`);
    }

    return {
      success: true,
      data: data, // Enthält die IDs der erstellten Entitäten (je nach RPC-Rückgabe)
      location: aiResponse.location,
      npc: aiResponse.npc,
      quest: aiResponse.quest,
    };
  } catch (error) {
    console.error("generateCharacterQuest Error:", error);
    throw error instanceof Error
      ? error
      : new Error("Fehler bei der Quest-Generierung.");
  }
}

// ------------------------------------------------------------------
// 10. FACTION DETAILS GENERATOR (für GM Review)
// ------------------------------------------------------------------