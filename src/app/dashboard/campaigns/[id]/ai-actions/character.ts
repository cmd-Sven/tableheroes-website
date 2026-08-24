/**
 * AI character backstory and onboarding analysis server actions.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
  verifyGM,
} from "./_shared";

export async function generateBackstorySuggestions(
  campaignId: string,
  roughIdea: string
) {
  const supabase = await createClient();

  // 1. Auth Check (Player can use this)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Verify user is member of campaign
  const { data: membershipRaw } = await (supabase.from("campaign_members") as any)
    .select("campaign_id")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .eq("status", "Approved")
    .single();

  const membership = membershipRaw as { campaign_id: string } | null;
  if (!membership) {
    throw new Error("Du musst Mitglied der Kampagne sein, um Backstory-Vorschläge zu erhalten.");
  }

  // 3. Fetch REVEALED entities only (Sichtbarkeit aus campaign_visibility)
  const { getVisibilityForCampaign } = await import("../campaign-visibility-queries");
  const { data: campaignRow } = await supabase.from("campaigns").select("world_id").eq("id", campaignId).single();
  const worldId = (campaignRow as any)?.world_id ?? null;

  const [loreVisibility, npcVisibility, factionVisibility] = await Promise.all([
    getVisibilityForCampaign(campaignId, "lore"),
    getVisibilityForCampaign(campaignId, "npc"),
    getVisibilityForCampaign(campaignId, "faction"),
  ]);

  const { data: factionsRaw } = await supabase
    .from("factions")
    .select("id, name, type, description")
    .eq("campaign_id", campaignId)
    .limit(20);
  const factions = (factionsRaw || []).filter((f: any) => factionVisibility[f.id]).slice(0, 10);

  let lore: any[] = [];
  if (worldId) {
    const { data: loreRaw } = await supabase
      .from("world_lore")
      .select("id, name, type, description")
      .eq("world_id", worldId)
      .limit(50);
    lore = (loreRaw || []).filter((l: any) => loreVisibility[l.id]).slice(0, 10);
  }

  let npcs: any[] = [];
  if (worldId) {
    const { data: npcsRaw } = await supabase
      .from("npcs")
      .select("id, name, title, description")
      .eq("world_id", worldId)
      .limit(50);
    npcs = (npcsRaw || []).filter((n: any) => npcVisibility[n.id]).slice(0, 10);
  }

  // Build context string (NO GM NOTES!)
  let contextString = "";
  if (factions && factions.length > 0) {
    contextString += "\nVERFÜGBARE FRAKTIONEN:\n" + factions.map((f: any) => `- ${f.name} (${f.type}): ${f.description || ""}`).join("\n");
  }
  if (lore && lore.length > 0) {
    contextString += "\nVERFÜGBARE ORTE:\n" + lore.map((l: any) => `- ${l.name} (${l.type}): ${l.description || ""}`).join("\n");
  }
  if (npcs && npcs.length > 0) {
    contextString += "\nVERFÜGBARE NPCs:\n" + npcs.map((n: any) => `- ${n.name}${n.title ? ` (${n.title})` : ""}: ${n.description || ""}`).join("\n");
  }

  const systemPrompt = `
    Du bist ein "Lore Whisperer" - ein Assistent für Spieler, die ihre Charakter-Backstory mit der existierenden Welt verbinden möchten.
    
    WELT KONTEXT (Nur für Spieler sichtbare Inhalte):
    ${contextString || "Noch keine Lore verfügbar."}

    ANFORDERUNGEN:
    - Valid JSON. Sprache: Deutsch.
    - Erstelle 3 konkrete Vorschläge, wie die grobe Idee des Spielers mit existierenden Welt-Entitäten verknüpft werden kann.
    - Jeder Vorschlag sollte eine kurze Beschreibung enthalten (2-3 Sätze).
    - Versuche, verschiedene Aspekte der Welt zu nutzen (Fraktionen, Orte, NPCs).
    
    JSON: {
      "suggestions": [
        {
          "title": "Kurzer Titel des Vorschlags",
          "description": "2-3 Sätze, wie die Idee mit der Welt verknüpft werden kann",
          "connected_entities": ["Fraktion/Orte/NPC Name"]
        }
      ]
    }
  `;

  return await callOpenAI(systemPrompt, roughIdea);
}

// ------------------------------------------------------------------
// 7. CHARACTER ONBOARDING ANALYSIS (GM Facing)
// ------------------------------------------------------------------

export async function analyzeCharacterOnboarding(
  campaignId: string,
  characterData: {
    name: string;
    class: string;
    race: string;
    level: number;
    backstory_summary?: string;
    goals?: string;
    fears?: string;
    important_people?: string;
    rivals?: string;
    faction_membership?: string;
    profession?: string;
  }
) {
  const supabase = await verifyGM(campaignId);

  // Fetch ALL data (including GM notes/secrets for collision detection)
  const { data: factions } = await supabase
    .from("factions")
    .select("name, type, description, gm_notes")
    .eq("campaign_id", campaignId)
    .limit(20);

  const { data: lore } = await supabase
    .from("world_lore")
    .select("name, type, description, gm_notes")
    .eq("campaign_id", campaignId)
    .limit(20);

  const { data: npcs } = await supabase
    .from("npcs")
    .select("name, title, description, gm_notes")
    .eq("campaign_id", campaignId)
    .limit(20);

  const { data: existingQuests } = await supabase
    .from("quests")
    .select("title, description")
    .eq("campaign_id", campaignId)
    .limit(10);

  // Build full context (including GM notes)
  let contextString = "";
  if (factions && factions.length > 0) {
    contextString += "\nFRAKTIONEN:\n" + factions.map((f: any) => `- ${f.name} (${f.type}): ${f.description || ""}${f.gm_notes ? ` [GM: ${f.gm_notes}]` : ""}`).join("\n");
  }
  if (lore && lore.length > 0) {
    contextString += "\nORTE:\n" + lore.map((l: any) => `- ${l.name} (${l.type}): ${l.description || ""}${l.gm_notes ? ` [GM: ${l.gm_notes}]` : ""}`).join("\n");
  }
  if (npcs && npcs.length > 0) {
    contextString += "\nNPCs:\n" + npcs.map((n: any) => `- ${n.name}${n.title ? ` (${n.title})` : ""}: ${n.description || ""}${n.gm_notes ? ` [GM: ${n.gm_notes}]` : ""}`).join("\n");
  }
  if (existingQuests && existingQuests.length > 0) {
    contextString += "\nEXISTIERENDE QUESTS:\n" + existingQuests.map((q: any) => `- ${q.title}: ${q.description || ""}`).join("\n");
  }

  const characterContext = `
CHARAKTER:
- Name: ${characterData.name}
- Klasse: ${characterData.class}
- Rasse: ${characterData.race}
- Level: ${characterData.level}
- Backstory: ${characterData.backstory_summary || "Keine"}
- Ziele: ${characterData.goals || "Keine"}
- Ängste: ${characterData.fears || "Keine"}
- Wichtige Personen: ${characterData.important_people || "Keine"}
- Rivalen: ${characterData.rivals || "Keine"}
- Fraktion: ${characterData.faction_membership || "Keine"}
- Beruf: ${characterData.profession || "Keine"}
  `;

  const systemPrompt = `
    Du bist ein Game Master Assistant. Analysiere einen neuen Charakter, der gerade in die Kampagne aufgenommen wurde.
    
    WELT KONTEXT (Vollständig, inkl. GM Notizen):
    ${contextString}
    
    ${characterContext}

    ANFORDERUNGEN:
    - Valid JSON. Sprache: Deutsch.
    - Erstelle eine "Personal Quest" (Charakter-Arc) basierend auf der Backstory.
    - Prüfe auf Kollisionen mit existierenden Quests/NPCs/Orten.
    - Identifiziere fehlende NPCs/Orte, die in der Backstory erwähnt werden, aber noch nicht existieren.
    
    JSON: {
      "personal_quest": {
        "title": "Titel der Personal Quest",
        "description": "Aufgabe/Beschreibung",
        "gm_notes": "Hintergrund & Verbindung zur Backstory",
        "rewards": "Mögliche Belohnung",
        "type": "Character Arc"
      },
      "suggested_npcs": ["Name 1", "Name 2"],  // NPCs die in Backstory erwähnt werden, aber nicht existieren
      "suggested_locations": ["Ort 1", "Ort 2"]  // Orte die in Backstory erwähnt werden, aber nicht existieren
    }
  `;

  return await callOpenAI(systemPrompt, `Analysiere diesen Charakter und erstelle eine Personal Quest.`);
}

// ------------------------------------------------------------------
// 8. WORLD SKELETON GENERATOR (GM Facing - Campaign Kickstart)
// ------------------------------------------------------------------