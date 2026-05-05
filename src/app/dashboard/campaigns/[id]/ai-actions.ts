"use server";

import OpenAI from "openai";
import { createClient } from "@/src/lib/supabase/server";
import { LOCATION_TYPES, VALID_LORE_TYPES } from "@/src/lib/lore-types";
import { VALID_FACTION_TYPES, VALID_RELATIONSHIPS, FACTION_MEMBER_ROLES } from "@/src/lib/faction-types";
import type { WorldBlueprint } from "@/src/types/world";
import {
  NPCSchema,
  LoreEntrySchema,
  FactionAIResponseSchema,
} from "@/src/lib/validations/schemas";
import { getNPCRelations } from "./npc-relations-actions";

// Initialisiere OpenAI (API-Key wird aus OPENAI_API_KEY Umgebungsvariable gelesen)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ------------------------------------------------------------------
// HILFSFUNKTION: Secrets für Entitäten laden
// ------------------------------------------------------------------
async function getSecretsForEntities(
  supabase: any,
  campaignId: string,
  entityType: "npc" | "faction" | "lore"
) {
  // Lade alle Entitäten des Typs
  let entityQuery;
  if (entityType === "npc") {
    entityQuery = supabase
      .from("npcs")
      .select("id, name")
      .eq("campaign_id", campaignId)
      .limit(30);
  } else if (entityType === "faction") {
    entityQuery = supabase
      .from("factions")
      .select("id, name")
      .eq("campaign_id", campaignId)
      .limit(30);
  } else {
    entityQuery = supabase
      .from("world_lore")
      .select("id, name")
      .eq("campaign_id", campaignId)
      .limit(30);
  }

  const { data: entities } = await entityQuery;
  if (!entities || entities.length === 0) return "";

  // Lade Secrets für alle Entitäten
  const entityIds = entities.map((e: any) => e.id);
  const { data: secrets } = await supabase
    .from("secrets")
    .select("entity_id, title, content, skill_check")
    .eq("campaign_id", campaignId)
    .eq("entity_type", entityType)
    .in("entity_id", entityIds);

  if (!secrets || secrets.length === 0) return "";

  // Gruppiere Secrets nach Entität
  const secretsByEntity: Record<string, any[]> = {};
  secrets.forEach((secret: any) => {
    if (!secretsByEntity[secret.entity_id]) {
      secretsByEntity[secret.entity_id] = [];
    }
    secretsByEntity[secret.entity_id].push(secret);
  });

  // Baue String auf
  let secretsString = "";
  entities.forEach((entity: any) => {
    const entitySecrets = secretsByEntity[entity.id];
    if (entitySecrets && entitySecrets.length > 0) {
      secretsString += `\n  ${entity.name}:\n`;
      entitySecrets.forEach((secret: any) => {
        secretsString += `    - ${secret.title || "Geheimnis"}: ${secret.content.substring(0, 150)}${secret.content.length > 150 ? "..." : ""}`;
        if (secret.skill_check) {
          secretsString += ` [Probencheck: ${secret.skill_check}]`;
        }
        secretsString += "\n";
      });
    }
  });

  return secretsString;
}

// ------------------------------------------------------------------
// HILFSFUNKTION: Root-World-Daten laden (aus worlds-Tabelle)
// ------------------------------------------------------------------
async function getRootWorldContext(supabase: any, campaignId: string): Promise<string> {
  const { data: world, error } = await supabase
    .from("worlds")
    .select("name, genre_style, cosmology_type, magic_level, current_year, main_conflict, description")
    .eq("campaign_id", campaignId)
    .single();

  if (error || !world) {
    // Wenn keine Welt existiert, gib leeren String zurück
    return "";
  }

  let rootWorldContext = `\n=== ROOT-WORLD KONTEXT (Zwingend zu beachten!) ===\n`;
  rootWorldContext += `Du bist ein Lore-Experte für die Welt '${world.name}'.\n\n`;
  rootWorldContext += `KONTEXT DER WELT:\n`;
  
  if (world.genre_style) {
    rootWorldContext += `- Genre/Stil: ${world.genre_style}\n`;
  }
  if (world.magic_level) {
    rootWorldContext += `- Magie-Niveau: ${world.magic_level}\n`;
  }
  if (world.cosmology_type) {
    rootWorldContext += `- Kosmologie: ${world.cosmology_type}\n`;
  }
  if (world.current_year) {
    rootWorldContext += `- Aktuelles Jahr: ${world.current_year}\n`;
  }
  if (world.main_conflict) {
    rootWorldContext += `- Zentraler Konflikt: ${world.main_conflict}\n`;
  }
  if (world.description) {
    rootWorldContext += `- Beschreibung: ${world.description}\n`;
  }

  rootWorldContext += `\nKRITISCHE REGELN:\n`;
  rootWorldContext += `- Alle generierten Inhalte (Namen, Fähigkeiten, Hintergründe, Technologien) MÜSSEN zu diesen Fakten passen.\n`;
  
  if (world.magic_level) {
    const magicLevel = world.magic_level.toLowerCase();
    if (magicLevel.includes("niedrig") || magicLevel.includes("keine")) {
      rootWorldContext += `- WICHTIG: Das Magie-Niveau ist '${world.magic_level}'. NPCs dürfen KEINE mächtigen Zauber beherrschen. Magie ist selten oder nicht-existent.\n`;
    } else if (magicLevel.includes("mittel")) {
      rootWorldContext += `- WICHTIG: Das Magie-Niveau ist '${world.magic_level}'. Magie existiert, ist aber nicht alltäglich. NPCs können magische Fähigkeiten haben, aber keine übermächtigen Zauber.\n`;
    } else if (magicLevel.includes("hoch") || magicLevel.includes("allgegenwärtig")) {
      rootWorldContext += `- WICHTIG: Das Magie-Niveau ist '${world.magic_level}'. Magie ist weit verbreitet. NPCs können mächtige magische Fähigkeiten haben.\n`;
    }
  }

  if (world.genre_style) {
    const genre = world.genre_style.toLowerCase();
    if (genre.includes("steampunk")) {
      rootWorldContext += `- WICHTIG: Genre ist '${world.genre_style}'. Technologie (Dampf, Mechanik) sollte eine Rolle spielen. Keine klassische Fantasy-Magie ohne technische Elemente.\n`;
    } else if (genre.includes("dunkel") || genre.includes("dark")) {
      rootWorldContext += `- WICHTIG: Genre ist '${world.genre_style}'. Die Welt ist düster. NPCs sollten komplexe, moralisch graue Hintergründe haben.\n`;
    } else if (genre.includes("klassisch") || genre.includes("high fantasy")) {
      rootWorldContext += `- WICHTIG: Genre ist '${world.genre_style}'. Klassische Fantasy-Elemente sind erlaubt. Keine Steampunk- oder Sci-Fi-Elemente.\n`;
    }
  }

  rootWorldContext += `\n==========================================\n`;

  return rootWorldContext;
}

// ------------------------------------------------------------------
// HILFSFUNKTION: Validierung der KI-Antwort gegen Root-World-Kontext
// ------------------------------------------------------------------
async function validateAIResponseAgainstWorld(
  result: any,
  world: { genre_style?: string | null; magic_level?: string | null } | null
): Promise<{ isValid: boolean; warnings: string[] }> {
  if (!world) {
    return { isValid: true, warnings: [] };
  }

  const warnings: string[] = [];
  const resultText = JSON.stringify(result).toLowerCase();

  // Genre-Validierung
  if (world.genre_style) {
    const genre = world.genre_style.toLowerCase();
    const genreLower = genre.toLowerCase();

    if (genreLower.includes("steampunk")) {
      if (resultText.includes("magie") && !resultText.includes("technik") && !resultText.includes("dampf")) {
        warnings.push("⚠️ Steampunk-Welt erkannt, aber generierter Inhalt enthält klassische Magie ohne technische Elemente.");
      }
    } else if (genreLower.includes("klassisch") || genreLower.includes("high fantasy")) {
      if (resultText.includes("dampf") || resultText.includes("steam") || resultText.includes("mechanik")) {
        warnings.push("⚠️ Klassische Fantasy-Welt erkannt, aber generierter Inhalt enthält Steampunk-Elemente.");
      }
    } else if (genreLower.includes("dunkel") || genreLower.includes("dark")) {
      // Dark Fantasy ist flexibel, keine spezifische Validierung nötig
    }
  }

  // Magie-Level-Validierung
  if (world.magic_level) {
    const magicLevel = world.magic_level.toLowerCase();
    const resultTextLower = resultText.toLowerCase();

    if (magicLevel.includes("niedrig") || magicLevel.includes("keine")) {
      const powerfulMagicTerms = ["mächtig", "episch", "legendär", "archmage", "großer zauber", "magie meister"];
      const hasPowerfulMagic = powerfulMagicTerms.some((term) => resultTextLower.includes(term));
      
      if (hasPowerfulMagic) {
        warnings.push(`⚠️ Magie-Niveau ist '${world.magic_level}', aber generierter Inhalt enthält Hinweise auf mächtige Magie.`);
      }
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

// ------------------------------------------------------------------
// HILFSFUNKTION: Kontext laden (Liest die Welt-Daten - SPEZIFISCH)
// ------------------------------------------------------------------
async function getWorldContext(supabase: any, campaignId: string) {
  // Parallele Abfragen für spezifische Kategorien
  const [
    racesResult,
    godsResult,
    factionsResult,
    locationsResult,
    npcsResult,
  ] = await Promise.all([
    // Rassen: world_lore wo type = 'Rasse'
    supabase
      .from("world_lore")
      .select("name, description")
      .eq("campaign_id", campaignId)
      .eq("type", "Rasse")
      .limit(20),
    
    // Götter/Religion: world_lore wo type IN ('Gottheit', 'Religion')
    supabase
      .from("world_lore")
      .select("name, description, type")
      .eq("campaign_id", campaignId)
      .in("type", ["Gottheit", "Religion"])
      .limit(15),
    
    // Fraktionen: Alle wichtigen Fraktionen
    supabase
      .from("factions")
      .select("name, type, description")
      .eq("campaign_id", campaignId)
      .limit(20),
    
    // Orte: world_lore wo type IN ('Stadt', 'Region', 'Insel', 'Gebäude')
    supabase
      .from("world_lore")
      .select("name, description, type")
      .eq("campaign_id", campaignId)
      .in("type", ["Stadt", "Region", "Insel", "Gebäude", "Tempel", "Akademie"])
      .limit(20),
    
    // NPCs: Wichtige NPCs (mit Rolle)
    supabase
      .from("npcs")
      .select("name, role, race, description")
      .eq("campaign_id", campaignId)
      .limit(15),
  ]);

  // Strukturierten Kontext-String bauen
  let contextString = "";

  // Rassen
  if (racesResult.data && racesResult.data.length > 0) {
    contextString += "\nEXISTIERENDE RASSEN:\n";
    racesResult.data.forEach((race: any) => {
      contextString += `- ${race.name}${race.description ? ` (${race.description.substring(0, 100)}${race.description.length > 100 ? "..." : ""})` : ""}\n`;
    });
  }

  // Götter/Religion
  if (godsResult.data && godsResult.data.length > 0) {
    contextString += "\nEXISTIERENDE GÖTTER & RELIGIONEN:\n";
    godsResult.data.forEach((god: any) => {
      contextString += `- ${god.name} (${god.type})${god.description ? `: ${god.description.substring(0, 100)}${god.description.length > 100 ? "..." : ""}` : ""}\n`;
    });
  }

  // Fraktionen
  if (factionsResult.data && factionsResult.data.length > 0) {
    contextString += "\nEXISTIERENDE FRAKTIONEN:\n";
    factionsResult.data.forEach((faction: any) => {
      contextString += `- ${faction.name} (${faction.type})${faction.description ? `: ${faction.description.substring(0, 100)}${faction.description.length > 100 ? "..." : ""}` : ""}\n`;
    });
  }

  // Orte
  if (locationsResult.data && locationsResult.data.length > 0) {
    contextString += "\nEXISTIERENDE ORTE:\n";
    locationsResult.data.forEach((location: any) => {
      contextString += `- ${location.name} (${location.type})${location.description ? `: ${location.description.substring(0, 100)}${location.description.length > 100 ? "..." : ""}` : ""}\n`;
    });
  }

  // NPCs
  if (npcsResult.data && npcsResult.data.length > 0) {
    contextString += "\nWICHTIGE NPCs:\n";
    npcsResult.data.forEach((npc: any) => {
      contextString += `- ${npc.name}${npc.role ? ` (${npc.role})` : ""}${npc.race ? ` - ${npc.race}` : ""}${npc.description ? `: ${npc.description.substring(0, 80)}${npc.description.length > 80 ? "..." : ""}` : ""}\n`;
    });
  }

  // Secrets für NPCs, Fraktionen und Lore
  const [npcSecrets, factionSecrets, loreSecrets] = await Promise.all([
    getSecretsForEntities(supabase, campaignId, "npc"),
    getSecretsForEntities(supabase, campaignId, "faction"),
    getSecretsForEntities(supabase, campaignId, "lore"),
  ]);

  if (npcSecrets) {
    contextString += "\nGEHEIMNISSE & WISSEN (NPCs):";
    contextString += npcSecrets;
  }

  if (factionSecrets) {
    contextString += "\nGEHEIMNISSE & WISSEN (Fraktionen):";
    contextString += factionSecrets;
  }

  if (loreSecrets) {
    contextString += "\nGEHEIMNISSE & WISSEN (Orte & Lore):";
    contextString += loreSecrets;
  }

  return contextString;
}

// ------------------------------------------------------------------
// CORE OPENAI CALL (Wird von allen benutzt)
// ------------------------------------------------------------------
async function callOpenAI(systemPrompt: string, userPrompt: string) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("Keine Antwort von OpenAI erhalten.");
    return JSON.parse(content);
  } catch (error) {
    console.error("OpenAI Error:", error);
    throw new Error("Fehler bei der KI-Generierung.");
  }
}

const SHOP_ITEM_RARITIES = new Set([
  "common",
  "uncommon",
  "rare",
  "very rare",
  "legendary",
]);

const SHOP_ITEM_TYPES = new Set([
  "weapon",
  "armor",
  "potion",
  "gear",
  "material",
  "service",
  "quest",
]);

function normalizeShopItemRarity(value: unknown) {
  const rarity = String(value ?? "common").trim().toLowerCase();
  return SHOP_ITEM_RARITIES.has(rarity) ? rarity : "common";
}

function normalizeShopItemType(value: unknown) {
  const itemType = String(value ?? "gear").trim().toLowerCase();
  return SHOP_ITEM_TYPES.has(itemType) ? itemType : "gear";
}

// ------------------------------------------------------------------
// SHOP INVENTORY GENERATOR
// ------------------------------------------------------------------
export async function generateShopItemsWithAI(payload: {
  npcContext: string;
  itemCount: number;
  legality: string;
  itemDirection: string;
  magicItemCount: number;
  includeServices: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const itemCount = Math.max(1, Math.min(30, Math.round(Number(payload.itemCount) || 10)));
  const magicItemCount = Math.max(
    0,
    Math.min(itemCount, Math.round(Number(payload.magicItemCount) || 0)),
  );
  const npcContext = String(payload.npcContext ?? "").trim() || "Kein spezifischer Händler-Kontext.";
  const itemDirection = String(payload.itemDirection ?? "").trim() || "Passende Waren für diesen Händler.";
  const legality = String(payload.legality ?? "Gemischt").trim() || "Gemischt";

  const systemPrompt = `Du bist ein meisterhafter D&D 5e Dungeon Master. Generiere ein Shop-Inventar basierend auf folgenden Parametern:

Händler-Kontext: ${npcContext}

Anzahl Gesamt-Items: ${itemCount}

Fokus der Waren: ${itemDirection}

Anzahl magischer/besonderer Items: ${magicItemCount}

Legalität: ${legality}

Dienstleistungen/Quests einbeziehen: ${payload.includeServices ? "Ja" : "Nein"}. (Dienstleistungen sind z.B. Reparaturen, Quests sind z.B. "Suche 10 Pilze").
Balanciere Preise strikt nach D&D 5e Standards in Goldmünzen (gp). Antworte AUSSCHLIESSLICH mit folgendem JSON-Format.

REGEL PROVIANT (zwingend):
- Wenn der Händler Vorräte, Proviant oder Reisebedarf anbietet, MUSS die Liste ein Item "Proviantpaket (2 Rationen)" enthalten: Preis exakt 1 GP, item_type "gear", rarity "common", is_magical false, is_legal true, is_ration_package true.
- Beschreibe kurz haltbare Reisekost (trocken, eingepökelt o.ä.).

{
  "items": [
    {
      "name": string,
      "description": string,
      "base_price_gp": number,
      "is_magical": boolean,
      "is_legal": boolean,
      "rarity": "common"|"uncommon"|"rare"|"very rare"|"legendary",
      "item_type": "weapon"|"armor"|"potion"|"gear"|"material"|"service"|"quest",
      "is_ration_package": boolean
    }
  ]
}`;

  const raw = await callOpenAI(
    systemPrompt,
    "Generiere jetzt das Shop-Inventar. Keine Zusatztexte, nur JSON.",
  );

  const rawItems = Array.isArray(raw?.items) ? raw.items : [];
  if (rawItems.length === 0) {
    throw new Error("Die KI hat kein gültiges Inventar geliefert.");
  }

  const proviantTemplate = {
    name: "Proviantpaket (2 Rationen)",
    description:
      "Haltbarer Proviant für unterwegs — beim Kauf +2 Rationen auf dem Charakter (max. 10).",
    base_price_gp: 1,
    is_magical: false,
    is_legal: true,
    rarity: "common" as const,
    item_type: "gear" as const,
    is_ration_package: true,
  };

  let mapped = rawItems.slice(0, itemCount).map((item: any) => {
      const isRationPack = Boolean(item?.is_ration_package);
      const price = Math.max(0, Math.round(Number(item?.base_price_gp) || 0));

      return {
        name: String(item?.name ?? "Unbenannter Gegenstand").trim().slice(0, 160),
        description: String(item?.description ?? "").trim().slice(0, 1200),
        base_price_gp: isRationPack ? 1 : price,
        is_magical: Boolean(item?.is_magical),
        is_legal: Boolean(item?.is_legal),
        rarity: normalizeShopItemRarity(item?.rarity),
        item_type: normalizeShopItemType(item?.item_type),
        is_ration_package: isRationPack,
      };
    });

  if (!mapped.some((i: { is_ration_package: boolean }) => i.is_ration_package)) {
    if (mapped.length < itemCount) {
      mapped = [...mapped, proviantTemplate];
    } else {
      mapped = [...mapped.slice(0, mapped.length - 1), proviantTemplate];
    }
  }

  return {
    items: mapped,
  };
}

// ------------------------------------------------------------------
// HELPER: WORLD BLUEPRINT KONTEXT
// ------------------------------------------------------------------
async function getWorldBlueprintContext(supabase: any, campaignId: string): Promise<string> {
  // Kampagne -> world_id
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, name, world_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as { id: string; name: string | null; world_id: string | null } | null;
  if (!campaign?.world_id) return "";

  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("name, blueprint")
    .eq("id", campaign.world_id)
    .single();

  if (!worldRaw || !(worldRaw as any).blueprint) return "";

  const world = worldRaw as { name: string | null; blueprint: WorldBlueprint | null };
  if (!world.blueprint) return "";

  const bp = world.blueprint;

  let ctx = "\n=== WORLD BLUEPRINT (Meta-Regeln der Welt) ===\n";
  ctx += `Welt: ${world.name || "Unbenannt"}\n`;
  ctx += "- Vibes:\n";
  ctx += `  • Genre: ${bp.vibes.genre || "nicht gesetzt"}\n`;
  ctx += `  • Tech-Level: ${bp.vibes.tech_level || "nicht gesetzt"}\n`;
  ctx += `  • Magie: ${bp.vibes.magic_prevalence || "nicht gesetzt"}\n`;
  ctx += "- Physik:\n";
  ctx += `  • Weltform: ${bp.physics.shape || "nicht gesetzt"}\n`;
  ctx += `  • Himmel/Zeit: ${bp.physics.sky_details || "nicht gesetzt"}\n`;
  ctx += "- Kultur:\n";
  ctx += `  • Religionstyp: ${bp.culture.religion_type || "nicht gesetzt"}\n`;
  ctx += `  • Sprachbasis: ${bp.culture.language_base || "nicht gesetzt"}\n`;
  ctx += `  • Hauptkonflikt: ${bp.culture.main_conflict || "nicht gesetzt"}\n`;
  ctx += "- Alltag & Wirtschaft:\n";
  ctx += `  • Feiertage (Kurz): ${bp.life_economy.holidays_summary || "nicht gesetzt"}\n`;
  ctx += `  • Kalender-Monate: ${bp.life_economy.calendar_months || "nicht gesetzt"}\n`;
  ctx += `  • Herkunft der Monatsnamen: ${bp.life_economy.month_origin || "nicht gesetzt"}\n`;
  ctx += `  • Währung: ${bp.life_economy.currency_name || "nicht gesetzt"}\n`;
  ctx += `  • Währungsdetails: ${bp.life_economy.currency_details || "nicht gesetzt"}\n`;

  ctx += `
NUTZUNGSREGEL:
- Alle generierten Inhalte (NPCs, Fraktionen, Lore) MÜSSEN stilistisch und thematisch zu diesem Blueprint passen.
- Wenn der Hauptkonflikt gesetzt ist, sollte er in Motiven, Fraktionen und Konflikten widerhallen.`;

  return ctx;
}

// ------------------------------------------------------------------
// HELPER: Auth & GM Check
// ------------------------------------------------------------------
async function verifyGM(campaignId: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .single();

  // Expliziter Cast, um 'never' zu verhindern
  const campaign = campaignRaw as { gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Inhalte mit KI generieren.");
  }

  return supabase;
}

// ------------------------------------------------------------------
// 1. QUEST GENERATOR
// ------------------------------------------------------------------
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
export async function generateSecret(
  campaignId: string,
  entityId: string,
  entityType: "npc" | "faction" | "lore",
  contextSecrets?: Array<{ id: string; isPrioritized: boolean }>
): Promise<{
  title: string;
  content: string;
  meaning: string;
  secret_type: string;
  discovery_dc: number;
}> {
  const supabase = await verifyGM(campaignId);
  const worldContext = await getWorldContext(supabase, campaignId);

  let entitySheet = "";
  let specificContext = "";
  let entityName = "";

  if (entityType === "npc") {
    // NPC: Lade Stammdaten, Fraktion, Standort, Beziehungen
    const { data: npcRaw, error: npcError } = await (supabase.from("npcs") as any)
      .select(
        `
        id,
        name,
        race,
        alignment,
        description,
        gm_notes,
        faction_id,
        current_location_id
      `
      )
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (npcError || !npcRaw) {
      throw new Error("NPC für Secret-Generierung nicht gefunden.");
    }

    const npc = npcRaw as {
      id: string;
      name: string;
      race: string | null;
      alignment: string | null;
      description: string | null;
      gm_notes: string | null;
      faction_id: string | null;
      current_location_id: string | null;
    };

    entityName = npc.name;
    entitySheet = `\n=== NPC STAMMBLATT ===
Name: ${npc.name}
Rasse: ${npc.race || "Unbekannt"}
Gesinnung: ${npc.alignment || "Unbekannt"}
Öffentliche Beschreibung: ${npc.description || "Keine öffentliche Beschreibung hinterlegt."}
GM-Notizen (intern): ${npc.gm_notes || "Keine GM-Notizen hinterlegt."}
`;

    // Fraktion laden
    if (npc.faction_id) {
      const { data: factionRaw } = await (supabase.from("factions") as any)
        .select("name, type, description, philosophy, appearance")
        .eq("id", npc.faction_id)
        .maybeSingle();

      if (factionRaw) {
        specificContext += `\n=== FRAKTION DES NPC ===
Name: ${factionRaw.name || "Unbekannt"}${factionRaw.type ? ` (${factionRaw.type})` : ""}
Philosophie: ${factionRaw.philosophy || "Keine explizite Philosophie hinterlegt."}
Erscheinungsbild: ${factionRaw.appearance || "Kein spezielles Erscheinungsbild hinterlegt."}
Beschreibung: ${factionRaw.description || "Keine Fraktionsbeschreibung hinterlegt."}
`;
      }
    }

    // Standort laden
    if (npc.current_location_id) {
      const { data: locationRaw } = await (supabase.from("locations") as any)
        .select("name, type, description")
        .eq("id", npc.current_location_id)
        .maybeSingle();

      if (locationRaw) {
        specificContext += `\n=== STANDORT DES NPC ===
Ort: ${locationRaw.name || "Unbekannt"}${locationRaw.type ? ` (${locationRaw.type})` : ""}
Beschreibung: ${locationRaw.description || "Keine Ortsbeschreibung hinterlegt."}
`;
      }
    }

    // NPC-Beziehungen laden
    let partnerNpcIds: string[] = [];
    try {
      const relations = await getNPCRelations(campaignId, entityId);
      const realRelations = (relations || []).filter((rel: any) => !rel.isHook && rel.partnerName);

      if (realRelations.length > 0) {
        specificContext += "\n=== BEZIEHUNGEN DES NPC ===\n";
        for (const rel of realRelations) {
          specificContext += `- ${rel.partnerName}: ${rel.relationType}${rel.description ? ` (${rel.description})` : ""}\n`;
          if (rel.partnerId) partnerNpcIds.push(rel.partnerId);
        }
      }
    } catch (error) {
      console.warn("[generateSecret] Konnte NPC-Beziehungen nicht laden:", error);
    }

    // Verwandte Geheimnisse: Partner-NPCs (entity_type=npc) + Fraktion (entity_type=faction)
    const partnerSecretsList: { entity_id: string; entity_type: string; title: string | null; content: string }[] = [];

    if (partnerNpcIds.length > 0) {
      const { data: npcSecrets } = await (supabase.from("secrets") as any)
        .select("entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "npc")
        .in("entity_id", partnerNpcIds);
      if (npcSecrets?.length) partnerSecretsList.push(...npcSecrets);
    }

    if (npc.faction_id) {
      const { data: factionSecrets } = await (supabase.from("secrets") as any)
        .select("entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "faction")
        .eq("entity_id", npc.faction_id);
      if (factionSecrets?.length) partnerSecretsList.push(...factionSecrets);
    }

    if (partnerSecretsList.length > 0) {
      const npcIds = partnerNpcIds;
      const factionIds = npc.faction_id ? [npc.faction_id] : [];
      const { data: npcNames } = npcIds.length > 0
        ? await (supabase.from("npcs") as any).select("id, name").in("id", npcIds)
        : { data: [] };
      const { data: factionNames } = factionIds.length > 0
        ? await (supabase.from("factions") as any).select("id, name").in("id", factionIds)
        : { data: [] };

      const nameById: Record<string, string> = {};
      (npcNames || []).forEach((n: any) => { nameById[n.id] = n.name; });
      (factionNames || []).forEach((f: any) => { nameById[f.id] = f.name; });

      specificContext += "\n=== BEKANNTE SCHATTEN (EXISTIERENDE GEHEIMNISSE) ===\n";
      specificContext += "Geheimnisse von Personen oder Organisationen, die mit diesem NPC verknüpft sind:\n\n";
      for (const s of partnerSecretsList) {
        const ownerName = nameById[s.entity_id] || (s.entity_type === "npc" ? "Ein Bekannter" : "Seine Fraktion");
        specificContext += `- [${ownerName}] "${s.title || "Geheimnis"}: ${(s.content || "").substring(0, 200)}${(s.content || "").length > 200 ? "..." : ""}"\n`;
      }
    }

  } else if (entityType === "faction") {
    // FACTION: Lade Ziele, Philosophie, Feindbilder, Mitglieder
    const { data: factionRaw, error: factionError } = await (supabase.from("factions") as any)
      .select(
        `
        id,
        name,
        type,
        description,
        philosophy,
        structure,
        gm_notes,
        appearance
      `
      )
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (factionError || !factionRaw) {
      throw new Error("Fraktion für Secret-Generierung nicht gefunden.");
    }

    const faction = factionRaw as {
      id: string;
      name: string;
      type: string | null;
      description: string | null;
      philosophy: string | null;
      structure: string | null;
      gm_notes: string | null;
      appearance: string | null;
    };

    entityName = faction.name;
    entitySheet = `\n=== FRAKTION STAMMBLATT ===
Name: ${faction.name}
Typ: ${faction.type || "Unbekannt"}
Beschreibung: ${faction.description || "Keine Beschreibung hinterlegt."}
Philosophie: ${faction.philosophy || "Keine explizite Philosophie hinterlegt."}
Struktur: ${faction.structure || "Keine Struktur-Beschreibung hinterlegt."}
Erscheinungsbild: ${faction.appearance || "Kein spezielles Erscheinungsbild hinterlegt."}
GM-Notizen (intern): ${faction.gm_notes || "Keine GM-Notizen hinterlegt."}
`;

    // Lade Fraktions-Beziehungen (ohne Join – Schema-Cache)
    const { data: factionRelationsRaw } = await (supabase.from("faction_relations") as any)
      .select("id, faction_id_1, faction_id_2, relation_type, description")
      .eq("campaign_id", campaignId)
      .or(`faction_id_1.eq.${entityId},faction_id_2.eq.${entityId}`)
      .limit(10);

    const factionRelations = (factionRelationsRaw || []) as Array<{ faction_id_1: string; faction_id_2: string; relation_type: string; description: string | null }>;
    if (factionRelations.length > 0) {
      const factionIds = [...new Set(factionRelations.flatMap((r) => [r.faction_id_1, r.faction_id_2]))];
      const { data: factionRows } = await (supabase.from("factions") as any)
        .select("id, name")
        .in("id", factionIds);
      const factionMap = new Map(
        ((factionRows as { id: string; name: string }[]) ?? []).map((f) => [f.id, f.name])
      );
      specificContext += "\n=== FRAKTIONS-BEZIEHUNGEN ===\n";
      for (const rel of factionRelations) {
        const partnerId = rel.faction_id_1 === entityId ? rel.faction_id_2 : rel.faction_id_1;
        const partnerName = factionMap.get(partnerId) ?? "Unbekannt";
        specificContext += `- ${partnerName}: ${rel.relation_type}${rel.description ? ` (${rel.description})` : ""}\n`;
      }
    }

    // Verwandte Geheimnisse: Alle Geheimnisse der NPCs, die dieser Fraktion angehören
    const { data: memberNpcs } = await (supabase.from("npcs") as any)
      .select("id, name")
      .eq("campaign_id", campaignId)
      .eq("faction_id", entityId)
      .limit(20);

    if (memberNpcs && memberNpcs.length > 0) {
      const memberIds = memberNpcs.map((n: any) => n.id);
      const { data: memberSecrets } = await (supabase.from("secrets") as any)
        .select("entity_id, title, content")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "npc")
        .in("entity_id", memberIds);

      if (memberSecrets && memberSecrets.length > 0) {
        const nameById: Record<string, string> = {};
        memberNpcs.forEach((n: any) => { nameById[n.id] = n.name; });
        specificContext += "\n=== BEKANNTE SCHATTEN (EXISTIERENDE GEHEIMNISSE) ===\n";
        specificContext += "Geheimnisse von Mitgliedern dieser Fraktion:\n\n";
        for (const s of memberSecrets) {
          const ownerName = nameById[s.entity_id] || "Mitglied";
          specificContext += `- [${ownerName}] "${s.title || "Geheimnis"}: ${(s.content || "").substring(0, 200)}${(s.content || "").length > 200 ? "..." : ""}"\n`;
        }
      }
    }

  } else {
    // LORE: Lade historische Ereignisse, verwandte Orte, GM-Notizen
    const { data: loreRaw, error: loreError } = await (supabase.from("world_lore") as any)
      .select(
        `
        id,
        name,
        type,
        description,
        gm_notes,
        parent_id
      `
      )
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (loreError || !loreRaw) {
      throw new Error("Lore-Eintrag für Secret-Generierung nicht gefunden.");
    }

    const lore = loreRaw as {
      id: string;
      name: string;
      type: string | null;
      description: string | null;
      gm_notes: string | null;
      parent_id: string | null;
    };

    entityName = lore.name;
    entitySheet = `\n=== LORE STAMMBLATT ===
Name: ${lore.name}
Typ: ${lore.type || "Unbekannt"}
Beschreibung: ${lore.description || "Keine Beschreibung hinterlegt."}
GM-Notizen (intern): ${lore.gm_notes || "Keine GM-Notizen hinterlegt."}
`;

    // Lade verwandte historische Ereignisse (gleicher Typ oder Parent)
    if (lore.type) {
      const { data: relatedLore } = await (supabase.from("world_lore") as any)
        .select("id, name, type, description")
        .eq("campaign_id", campaignId)
        .eq("type", lore.type)
        .neq("id", entityId)
        .limit(5);

      if (relatedLore && relatedLore.length > 0) {
        specificContext += `\n=== VERWANDTE ${lore.type.toUpperCase()} ===\n`;
        for (const related of relatedLore) {
          specificContext += `- ${related.name}: ${related.description?.substring(0, 100) || "Keine Beschreibung"}\n`;
        }
      }
    }
  }

  // Lade ausgewählte Kontext-Geheimnisse (falls vorhanden)
  let selectedContextSection = "";
  if (contextSecrets && contextSecrets.length > 0) {
    const secretIds = contextSecrets.map((cs) => cs.id);
    const { data: selectedSecrets } = await (supabase.from("secrets") as any)
      .select("id, entity_id, entity_type, title, content")
      .eq("campaign_id", campaignId)
      .in("id", secretIds);

    if (selectedSecrets && selectedSecrets.length > 0) {
      // Lade Entitäts-Namen für bessere Kontextualisierung
      const entityIds = [...new Set(selectedSecrets.map((s: any) => s.entity_id))];
      const npcIds = entityIds.filter((id) => selectedSecrets.some((s: any) => s.entity_id === id && s.entity_type === "npc"));
      const factionIds = entityIds.filter((id) => selectedSecrets.some((s: any) => s.entity_id === id && s.entity_type === "faction"));

      const nameById: Record<string, string> = {};
      if (npcIds.length > 0) {
        const { data: npcs } = await (supabase.from("npcs") as any)
          .select("id, name")
          .in("id", npcIds);
        if (npcs) npcs.forEach((n: any) => { nameById[n.id] = n.name; });
      }
      if (factionIds.length > 0) {
        const { data: factions } = await (supabase.from("factions") as any)
          .select("id, name")
          .in("id", factionIds);
        if (factions) factions.forEach((f: any) => { nameById[f.id] = f.name; });
      }

      selectedContextSection = "\n=== AUSGEWÄHLTE KONTEXT-GEHEIMNISSE ===\n";
      selectedContextSection += "Der Game Master hat explizit diese Geheimnisse aus dem Umfeld ausgewählt, die beim Weben des neuen Geheimnisses berücksichtigt werden sollen:\n\n";

      // Priorisierte Geheimnisse zuerst
      const prioritized = contextSecrets.filter((cs) => cs.isPrioritized);
      const normal = contextSecrets.filter((cs) => !cs.isPrioritized);

      for (const cs of prioritized) {
        const secret = selectedSecrets.find((s: any) => s.id === cs.id);
        if (secret) {
          const ownerName = nameById[secret.entity_id] || (secret.entity_type === "npc" ? "Ein Bekannter" : "Eine Fraktion");
          selectedContextSection += `!!! DIESES GEHEIMNIS IST DER ANKERPUNKT: [${ownerName}] "${secret.title || "Geheimnis"}: ${secret.content}" !!!\n`;
          selectedContextSection += "→ Das neue Geheimnis MUSS eine direkte Verbindung zu diesem Ankerpunkt herstellen (Ergänzung, Folge, Gegensatz oder Beweisstück).\n\n";
        }
      }

      // Normale ausgewählte Geheimnisse
      for (const cs of normal) {
        const secret = selectedSecrets.find((s: any) => s.id === cs.id);
        if (secret) {
          const ownerName = nameById[secret.entity_id] || (secret.entity_type === "npc" ? "Ein Bekannter" : "Eine Fraktion");
          selectedContextSection += `- [${ownerName}] "${secret.title || "Geheimnis"}: ${secret.content.substring(0, 300)}${secret.content.length > 300 ? "..." : ""}"\n`;
        }
      }

      selectedContextSection += "\nWICHTIG: Nutze diese ausgewählten Geheimnisse als Basis für das neue Geheimnis. Verknüpfe es kausal oder thematisch mit ihnen.\n";
    }
  }

  const systemPrompt = `
Du bist der "AI Secret Architect" eines TTRPG-Game Masters.
Deine Aufgabe ist es, ein starkes, plotrelevantes Geheimnis für eine bestehende Entität (${entityType === "npc" ? "NPC" : entityType === "faction" ? "Fraktion" : "Lore-Eintrag"}) zu weben.

WICHTIG:
- Das Geheimnis muss mindestens ZWEI der verfügbaren Kontexte aktiv verknüpfen.
- Das Geheimnis soll HOOKS für zukünftige Szenen liefern (Konflikt, Dilemma, Verrat, verborgenes Wissen, historische Wahrheit).
- Es darf KEINE offenen Widersprüche zum Weltkontext enthalten.

BEKANNTE SCHATTEN (EXISTIERENDE GEHEIMNISSE):
Falls im folgenden Kontext eine Sektion "BEKANNTE SCHATTEN (EXISTIERENDE GEHEIMNISSE)" mit Geheimnissen von verknüpften Personen oder Organisationen steht: Nutze diese bestehenden Informationen, um eine Verbindung oder einen Konflikt zu weben. Das neue Geheimnis soll entweder eine Ergänzung, ein gegensätzliches Puzzleteil oder eine direkte Folge der vorhandenen Geheimnisse sein.
Beispiel: Wenn der Mentor ein Geheimnis über einen Verrat hat, könnte die Schülerin ein Geheimnis über ein Beweisstück haben, das sie gefunden hat. So entsteht ein organisches Netzwerk an Intrigen, bei dem Geheimnisse aufeinander aufbauen.

${worldContext}
${entitySheet}
${specificContext}
${selectedContextSection}

DEFINITIONEN:
- "title": kurzer, prägnanter Titel (max. 80 Zeichen), z.B. "Schuldpakt mit den Hafenschatten" oder "Die wahre Geschichte von X".
- "content": vollständige Beschreibung des Geheimnisses in 3–8 Sätzen.
- "meaning": 2–3 Sätze, was dieses Geheimnis KONKRET für die Kampagne bedeutet (Gefahr, Chance, Twist, historische Bedeutung).
- "secret_type": eine Kategorie wie "Dilemma", "Verrat", "Wissen", "Prophezeiung", "Trauma", "Schuld", "Schutz", "Historische Wahrheit".
- "discovery_dc": Schwierigkeit (10–25) für die Entdeckung dieses Geheimnisses (z.B. über Nachforschungen, Proben, soziale Szenen).

ANFORDERUNGEN:
- Sprache: Deutsch.
- Das Geheimnis soll konkret spielbar sein, keine vagen Allgemeinplätze.
- discovery_dc MUSS eine GANZE ZAHL zwischen 10 und 25 sein.
- Nutze IMMER mindestens zwei der verfügbaren Kontexte und verknüpfe sie kausal.

Antworte NUR mit gültigem JSON im Format:
{
  "title": "string",
  "content": "string",
  "meaning": "string",
  "secret_type": "string",
  "discovery_dc": 17
}
`;

  const userPrompt = `Erzeuge ein tief vernetztes Geheimnis für ${entityType === "npc" ? "den NPC" : entityType === "faction" ? "die Fraktion" : "den Lore-Eintrag"} "${entityName}", das sich organisch aus den gegebenen Informationen ergibt.`;

  const raw = await callOpenAI(systemPrompt, userPrompt);

  let title = String(raw.title || "").trim();
  let content = String(raw.content || "").trim();
  let meaning = String(raw.meaning || "").trim();
  let secret_type = String(raw.secret_type || "").trim() || "Wissen";
  let discovery_dc = Number(raw.discovery_dc ?? 15);

  if (!title) {
    title = `Verborgenes Geheimnis von ${entityName}`;
  }
  if (!content) {
    content = "Dieses Geheimnis konnte nicht eindeutig generiert werden. Bitte generiere es erneut oder formuliere es manuell.";
  }
  if (!meaning) {
    meaning = "Die genaue Bedeutung dieses Geheimnisses für den Plot sollte vom Game Master manuell ergänzt werden.";
  }

  if (Number.isNaN(discovery_dc)) {
    discovery_dc = 15;
  }
  // Clamp auf 10–25
  discovery_dc = Math.max(10, Math.min(25, Math.round(discovery_dc)));

  return {
    title,
    content,
    meaning,
    secret_type,
    discovery_dc,
  };
}

// ------------------------------------------------------------------
// 1c. CONSPIRACY ENGINE ("Zufällige Verschwörung")
// ------------------------------------------------------------------
export async function generateConspiracy(
  campaignId: string,
  entityId: string,
  entityType: "npc" | "faction" | "lore",
  radius: "LOKAL" | "FRAKTION" | "STADT" | "REGION" | "WELT"
): Promise<{
  title: string;
  content: string;
  meaning: string;
  secret_type: string;
  discovery_dc: number;
  selectedSecrets: Array<{ id: string; entity_name: string; title: string | null; content: string }>;
}> {
  const supabase = await verifyGM(campaignId);
  const worldContext = await getWorldContext(supabase, campaignId);

  let entitySheet = "";
  let entityName = "";
  let candidateSecrets: Array<{
    id: string;
    entity_id: string;
    entity_type: string;
    title: string | null;
    content: string;
    entity_name?: string;
  }> = [];

  // Lade Basis-Entität
  if (entityType === "npc") {
    const { data: npcRaw } = await (supabase.from("npcs") as any)
      .select("id, name, faction_id, current_location_id")
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (!npcRaw) throw new Error("NPC nicht gefunden.");
    entityName = npcRaw.name;

    // Radius-basierte Geheimnis-Sammlung
    if (radius === "LOKAL") {
      // Direkte Beziehungen
      const { data: relations } = await (supabase.from("npc_relations") as any)
        .select("npc_id_1, npc_id_2")
        .eq("campaign_id", campaignId)
        .or(`npc_id_1.eq.${entityId},npc_id_2.eq.${entityId}`)
        .limit(10);
      const partnerIds = relations
        ?.map((rel: any) => (rel.npc_id_1 === entityId ? rel.npc_id_2 : rel.npc_id_1))
        .filter((id: string) => id !== entityId) || [];
      if (partnerIds.length > 0) {
        const { data: secrets } = await (supabase.from("secrets") as any)
          .select("id, entity_id, entity_type, title, content")
          .eq("campaign_id", campaignId)
          .eq("entity_type", "npc")
          .in("entity_id", [...partnerIds, entityId]);
        if (secrets) candidateSecrets.push(...secrets);
      }
    } else if (radius === "FRAKTION" && npcRaw.faction_id) {
      // Alle NPCs der Fraktion
      const { data: factionNPCs } = await (supabase.from("npcs") as any)
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("faction_id", npcRaw.faction_id)
        .limit(30);
      const factionNpcIds = factionNPCs?.map((n: any) => n.id) || [];
      if (factionNpcIds.length > 0) {
        const { data: secrets } = await (supabase.from("secrets") as any)
          .select("id, entity_id, entity_type, title, content")
          .eq("campaign_id", campaignId)
          .eq("entity_type", "npc")
          .in("entity_id", factionNpcIds);
        if (secrets) candidateSecrets.push(...secrets);
      }
      // Fraktions-Geheimnisse
      const { data: factionSecrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "faction")
        .eq("entity_id", npcRaw.faction_id);
      if (factionSecrets) candidateSecrets.push(...factionSecrets);
    } else if (radius === "STADT" && npcRaw.current_location_id) {
      // NPCs am gleichen Standort
      const { data: locationNPCs } = await (supabase.from("npcs") as any)
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("current_location_id", npcRaw.current_location_id)
        .limit(30);
      const locationNpcIds = locationNPCs?.map((n: any) => n.id) || [];
      if (locationNpcIds.length > 0) {
        const { data: secrets } = await (supabase.from("secrets") as any)
          .select("id, entity_id, entity_type, title, content")
          .eq("campaign_id", campaignId)
          .eq("entity_type", "npc")
          .in("entity_id", locationNpcIds);
        if (secrets) candidateSecrets.push(...secrets);
      }
      // Lore am gleichen Standort
      const { data: locationLore } = await (supabase.from("world_lore") as any)
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("location_id", npcRaw.current_location_id)
        .limit(10);
      const locationLoreIds = locationLore?.map((l: any) => l.id) || [];
      if (locationLoreIds.length > 0) {
        const { data: secrets } = await (supabase.from("secrets") as any)
          .select("id, entity_id, entity_type, title, content")
          .eq("campaign_id", campaignId)
          .eq("entity_type", "lore")
          .in("entity_id", locationLoreIds);
        if (secrets) candidateSecrets.push(...secrets);
      }
    } else if (radius === "REGION") {
      // Alle Geheimnisse der Kampagne (vereinfacht: Region = Kampagne)
      const { data: secrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .limit(100);
      if (secrets) candidateSecrets.push(...secrets);
    } else if (radius === "WELT") {
      // Alle Geheimnisse der Kampagne
      const { data: secrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .limit(200);
      if (secrets) candidateSecrets.push(...secrets);
    }
  } else if (entityType === "faction") {
    const { data: factionRaw } = await (supabase.from("factions") as any)
      .select("id, name")
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (!factionRaw) throw new Error("Fraktion nicht gefunden.");
    entityName = factionRaw.name;

    if (radius === "FRAKTION" || radius === "LOKAL") {
      // Mitglieder-NPCs
      const { data: memberNPCs } = await (supabase.from("npcs") as any)
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("faction_id", entityId)
        .limit(30);
      const memberIds = memberNPCs?.map((n: any) => n.id) || [];
      if (memberIds.length > 0) {
        const { data: secrets } = await (supabase.from("secrets") as any)
          .select("id, entity_id, entity_type, title, content")
          .eq("campaign_id", campaignId)
          .eq("entity_type", "npc")
          .in("entity_id", memberIds);
        if (secrets) candidateSecrets.push(...secrets);
      }
      // Fraktions-Geheimnisse
      const { data: factionSecrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "faction")
        .eq("entity_id", entityId);
      if (factionSecrets) candidateSecrets.push(...factionSecrets);
    } else if (radius === "STADT" || radius === "REGION" || radius === "WELT") {
      const { data: secrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .limit(radius === "WELT" ? 200 : 100);
      if (secrets) candidateSecrets.push(...secrets);
    }
  } else {
    // LORE
    const { data: loreRaw } = await (supabase.from("world_lore") as any)
      .select("id, name, location_id")
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (!loreRaw) throw new Error("Lore-Eintrag nicht gefunden.");
    entityName = loreRaw.name;

    if (radius === "STADT" && loreRaw.location_id) {
      const { data: locationSecrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .or(`entity_type.eq.npc,entity_type.eq.lore`)
        .limit(50);
      // Filtere nach location_id (vereinfacht: alle)
      if (locationSecrets) candidateSecrets.push(...locationSecrets);
    } else {
      const { data: secrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .limit(radius === "WELT" ? 200 : 100);
      if (secrets) candidateSecrets.push(...secrets);
    }
  }

  // Entferne Duplikate und wähle 2-3 zufällig aus
  const uniqueSecrets = Array.from(
    new Map(candidateSecrets.map((s) => [s.id, s])).values()
  );
  if (uniqueSecrets.length === 0) {
    throw new Error(`Keine Geheimnisse im Radius "${radius}" gefunden.`);
  }

  const count = Math.min(3, Math.max(2, uniqueSecrets.length));
  const shuffled = [...uniqueSecrets].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  // Lade Entitäts-Namen
  const entityIds = [...new Set(selected.map((s) => s.entity_id))];
  const npcIds = entityIds.filter((id) => selected.some((s) => s.entity_id === id && s.entity_type === "npc"));
  const factionIds = entityIds.filter((id) => selected.some((s) => s.entity_id === id && s.entity_type === "faction"));
  const loreIds = entityIds.filter((id) => selected.some((s) => s.entity_id === id && s.entity_type === "lore"));

  const nameById: Record<string, string> = {};
  if (npcIds.length > 0) {
    const { data: npcs } = await (supabase.from("npcs") as any).select("id, name").in("id", npcIds);
    if (npcs) npcs.forEach((n: any) => { nameById[n.id] = n.name; });
  }
  if (factionIds.length > 0) {
    const { data: factions } = await (supabase.from("factions") as any).select("id, name").in("id", factionIds);
    if (factions) factions.forEach((f: any) => { nameById[f.id] = f.name; });
  }
  if (loreIds.length > 0) {
    const { data: lore } = await (supabase.from("world_lore") as any).select("id, name").in("id", loreIds);
    if (lore) lore.forEach((l: any) => { nameById[l.id] = l.name; });
  }

  const selectedWithNames = selected.map((s) => ({
    id: s.id,
    entity_name: nameById[s.entity_id] || (s.entity_type === "npc" ? "Unbekannter NPC" : s.entity_type === "faction" ? "Unbekannte Fraktion" : "Unbekanntes Lore"),
    title: s.title,
    content: s.content,
  }));

  // Baue Conspiracy-Prompt
  const conspiracySecretsText = selectedWithNames
    .map((s, idx) => {
      return `[Fragment ${idx + 1}] ${s.entity_name}: "${s.title || "Geheimnis"}"\n   ${s.content.substring(0, 400)}${s.content.length > 400 ? "..." : ""}`;
    })
    .join("\n\n");

  const systemPrompt = `
Du bist der Architekt einer Verschwörung in einem TTRPG-Setting.
Deine Aufgabe ist es, aus scheinbar unzusammenhängenden Geheimnissen eine verborgene, größere Wahrheit zu weben.

${worldContext}

=== AUSGEWÄHLTE FRAGMENTE (SCHEINBAR UNZUSAMMENHÄNGEND) ===
Hier sind ${selectedWithNames.length} zufällig ausgewählte Geheimnisse aus dem Radius "${radius}":

${conspiracySecretsText}

=== AUFGABE ===
Erstelle ein NEUES Geheimnis für ${entityType === "npc" ? "den NPC" : entityType === "faction" ? "die Fraktion" : "den Lore-Eintrag"} "${entityName}", das diese Fragmente logisch (oder auf schockierende Weise) miteinander verbindet.

Das neue Geheimnis soll:
- Eine verborgene Wahrheit offenbaren, die zeigt, dass diese Einzelelemente Teil eines größeren Musters sind.
- Einen kausalen oder thematischen Zusammenhang zwischen den Fragmenten herstellen.
- Den gewählten Radius respektieren: Ein lokales Geheimnis sollte keine weltbewegenden Folgen haben, eine weltweite Verschwörung hingegen schon.
- Konkret spielbar sein (keine vagen Allgemeinplätze).

DEFINITIONEN:
- "title": kurzer, prägnanter Titel (max. 80 Zeichen), z.B. "Das Netzwerk der Schatten" oder "Die verborgene Verbindung".
- "content": vollständige Beschreibung der Verschwörung in 4–10 Sätzen, die zeigt, wie die Fragmente zusammenhängen.
- "meaning": 2–3 Sätze, was diese Verschwörung KONKRET für die Kampagne bedeutet.
- "secret_type": eine Kategorie wie "Verschwörung", "Netzwerk", "Verbindung", "Wahrheit", "Muster".
- "discovery_dc": Schwierigkeit (10–25) für die Entdeckung dieser Verschwörung.

ANFORDERUNGEN:
- Sprache: Deutsch.
- discovery_dc MUSS eine GANZE ZAHL zwischen 10 und 25 sein.
- Das Geheimnis muss ALLE ${selectedWithNames.length} Fragmente in die Erklärung einbeziehen.

Antworte NUR mit gültigem JSON im Format:
{
  "title": "string",
  "content": "string",
  "meaning": "string",
  "secret_type": "string",
  "discovery_dc": 17
}
`;

  const userPrompt = `Erzeuge eine Verschwörung, die die ${selectedWithNames.length} Fragmente zu einem größeren Muster verbindet.`;

  const raw = await callOpenAI(systemPrompt, userPrompt);

  let title = String(raw.title || "").trim();
  let content = String(raw.content || "").trim();
  let meaning = String(raw.meaning || "").trim();
  let secret_type = String(raw.secret_type || "").trim() || "Verschwörung";
  let discovery_dc = Number(raw.discovery_dc ?? 15);

  if (!title) {
    title = `Verschwörung um ${entityName}`;
  }
  if (!content) {
    content = "Diese Verschwörung konnte nicht eindeutig generiert werden. Bitte generiere sie erneut.";
  }
  if (!meaning) {
    meaning = "Die genaue Bedeutung dieser Verschwörung sollte vom Game Master manuell ergänzt werden.";
  }

  if (Number.isNaN(discovery_dc)) {
    discovery_dc = 15;
  }
  discovery_dc = Math.max(10, Math.min(25, Math.round(discovery_dc)));

  return {
    title,
    content,
    meaning,
    secret_type,
    discovery_dc,
    selectedSecrets: selectedWithNames,
  };
}

// ------------------------------------------------------------------
// 2. NPC GENERATOR
// ------------------------------------------------------------------
export async function generateNPC(
  campaignId: string,
  userPrompt: string,
  contextRelations?: Array<{ npcId: string; relationType: string }>,
  locationDetails?: any,
  factionDetails?: any,
  secretContext?: {
    is_secret_antagonist?: boolean;
    hidden_agenda?: string;
  }
) {
  const supabase = await verifyGM(campaignId);
  const rootWorldContext = await getRootWorldContext(supabase, campaignId);
  const worldContext = await getWorldContext(supabase, campaignId);
  const blueprintContext = await getWorldBlueprintContext(supabase, campaignId);

  // Lade verfügbare Locations für Location-Matching
  const { data: locationsRaw } = await (supabase.from("world_lore") as any)
    .select("id, name, type")
    .eq("campaign_id", campaignId)
    .in("type", ["Stadt", "Region", "Insel", "Gebäude", "Tempel", "Akademie", "Dorf", "Festung", "Ruine"])
    .limit(30);
  
  const locations = locationsRaw as { id: string; name: string | null; type: string | null }[] | null;

  let locationsContext = "";
  if (locations && locations.length > 0) {
    locationsContext = "\nVERFÜGBARE ORTE (für 'current_location_name_suggestion'):\n";
    locations.forEach((loc: any) => {
      locationsContext += `- ${loc.name} (${loc.type})\n`;
    });
  }

  // Lade Kontext-NPCs für den Prompt
  let contextNPCsInfo = "";
  if (contextRelations && contextRelations.length > 0) {
    const npcIds = contextRelations.map((r) => r.npcId);
    const { data: contextNPCs } = await supabase
      .from("npcs")
      .select("id, name, role, current_location_id, home_location_id, faction_id")
      .in("id", npcIds);

    if (contextNPCs && contextNPCs.length > 0) {
      contextNPCsInfo = "\nKONTEXT-NPCs (Beziehungen zum neuen NPC):\n";
      contextNPCs.forEach((npc: any) => {
        const relation = contextRelations.find((r) => r.npcId === npc.id);
        const relationType = relation?.relationType || "Unbekannt";
        contextNPCsInfo += `- ${npc.name}${npc.role ? ` (${npc.role})` : ""} - Beziehung: ${relationType}\n`;
      });
      contextNPCsInfo += "\nWICHTIG: Der neue NPC sollte eine passende Beziehung zu diesen NPCs haben. Berücksichtige dies bei der Generierung der Hintergrundgeschichte, Persönlichkeit und Rolle.\n";
    }
  }

  // Baue Location-Kontext mit GM-Notizen auf
  let locationContext = "";
  if (locationDetails) {
    locationContext = "\nORT-KONTEXT (inkl. GM-Notizen für Secret-Generierung):\n";
    locationContext += `- Ort: ${locationDetails.name || "Unbekannt"}`;
    if (locationDetails.type) locationContext += ` (${locationDetails.type})`;
    if (locationDetails.description) {
      locationContext += `\n  Beschreibung: ${locationDetails.description}`;
    }
    if (locationDetails.lore) {
      const lore = locationDetails.lore;
      locationContext += `\n  Lore-Eintrag: ${lore.name || "Unbekannt"}`;
      if (lore.description) {
        locationContext += `\n  Lore-Beschreibung: ${lore.description}`;
      }
      if (lore.gm_notes) {
        locationContext += `\n  [GM-NOTIZEN - WICHTIG FÜR SECRETS]: ${lore.gm_notes}`;
      }
    }
    locationContext += "\n";
  }

  // Baue Faction-Kontext mit GM-Notizen und Deep-Integration-Infos auf
  let factionContext = "";
  if (factionDetails) {
    factionContext = "\nFRAKTIONS-KONTEXT (inkl. GM-Notizen für Secret-Generierung):\n";
    factionContext += `- Fraktion: ${factionDetails.name || "Unbekannt"}`;
    if (factionDetails.type) factionContext += ` (${factionDetails.type})`;
    if (factionDetails.description) {
      factionContext += `\n  Beschreibung: ${factionDetails.description}`;
    }
    if (factionDetails.gm_notes) {
      factionContext += `\n  [GM-NOTIZEN - WICHTIG FÜR SECRETS]: ${factionDetails.gm_notes}`;
    }
    if (factionDetails.lore_entry) {
      const lore = factionDetails.lore_entry;
      factionContext += `\n  Lore-Eintrag: ${lore.name || "Unbekannt"}`;
      if (lore.description) {
        factionContext += `\n  Lore-Beschreibung: ${lore.description}`;
      }
      if (lore.gm_notes) {
        factionContext += `\n  [LORE GM-NOTIZEN - WICHTIG FÜR SECRETS]: ${lore.gm_notes}`;
      }
    }
    factionContext += "\n";
  }

  // Baue Secret-Kontext auf (wenn vorhanden)
  let secretContextString = "";
  if (secretContext) {
    secretContextString = "\nGEHEIMNIS-KONTEXT (WICHTIG FÜR GENERIERUNG):\n";
    if (secretContext.is_secret_antagonist) {
      secretContextString += "- Dieser NPC ist ein GEHEIMER ANTAGONIST. Seine wahre Natur ist verborgen.\n";
    }
    if (secretContext.hidden_agenda) {
      secretContextString += `- Versteckte Agenda: ${secretContext.hidden_agenda}\n`;
    }
    secretContextString += "\nWICHTIG: Die generierten Inhalte müssen diese Geheimnisse berücksichtigen, aber subtil bleiben.\n";
  }

  const systemPrompt = `
    Du bist Game Master. Erstelle einen NPC, der in die existierende Welt passt.
    
    ${rootWorldContext}
    ${blueprintContext}
    ${secretContextString}
    
    WICHTIG: Nutze bevorzugt existierende Rassen, Fraktionen und Orte aus dem Kontext!
    - Wenn eine Rasse aus "EXISTIERENDE RASSEN" passt, nutze diese exakt (z.B. "Kalkmari", "Maschinenzwerge").
    - Wenn eine Fraktion aus "EXISTIERENDE FRAKTIONEN" passt, nutze diese exakt (z.B. "Die Enklave").
    - Wenn ein Ort aus "VERFÜGBARE ORTE" passt, nutze dessen Namen EXAKT für 'current_location_name_suggestion'.
    - Erfinde KEINE neuen Standard-Fantasy-Rassen (Mensch, Zwerg, Elf), wenn passende Rassen im Kontext existieren.
    - Berücksichtige die "GEHEIMNISSE & WISSEN" im Kontext, um konsistente Hintergrundgeschichten zu erstellen.

    WELT KONTEXT (Existierende Inhalte):
    ${worldContext}
    ${locationsContext}
    ${contextNPCsInfo}
    ${locationContext}
    ${factionContext}

    FALLS EIN FRAKTIONS-KONTEXT ANGEGEBEN IST (obiger Block):
    - **Erscheinungsbild (appearance):** NUR Stichpunkte. Integriere Uniformen, Wappen, Farben oder Slogans der Fraktion als Bullet Points (z. B. • Dunkelgrüne Uniform • Silbernes Abzeichen).
    - **Persönlichkeit:** Die Persönlichkeit des NPCs (personality_traits, gm_notes) soll die Philosophie/Ziele der Fraktion widerspiegeln – entweder als loyale Verkörperung oder als bewusst begründete Abweichung.
    - **Rolle:** Weise dem NPC eine Rolle/Position zu, die zur beschriebenen Organisationsstruktur der Fraktion passt (z.B. Offizier, Rekrut, Spion, Quartiermeister o.Ä.).

    ${contextNPCsInfo ? `
    KONTEXT-BEZIEHUNGEN (KRITISCH):
    - Die oben genannten NPCs existieren bereits in der Welt.
    - Der neue NPC sollte eine passende Beziehung zu diesen NPCs haben, basierend auf der angegebenen Beziehungsart.
    - Berücksichtige diese Beziehungen bei der Generierung der Hintergrundgeschichte (gm_notes), Persönlichkeit (personality_traits) und Rolle (role).
    - Beispiel: Wenn ein NPC als "Rivale" markiert ist, sollte der neue NPC eine konkurrierende oder feindselige Beziehung haben.
    - Beispiel: Wenn ein NPC als "Vorgesetzter" markiert ist, sollte der neue NPC eine untergeordnete Rolle haben.
    - Beispiel: Wenn ein NPC als "Nachbar" markiert ist, sollte der neue NPC am selben Ort oder in der Nähe wohnen.
    ` : ""}

    NARRATIVE HOOKS (WICHTIG):
    - Analysiere die von dir erstellte Hintergrundgeschichte (gm_notes, description, personality_traits).
    - Identifiziere ALLE namentlich genannten Personen oder wichtigen Rollen (Familie, Rivalen, Vorgesetzte, Verbündete, Mentoren), die in der Story vorkommen, aber noch keine eigenen NPCs sind.
    - Ignoriere verstorbene Personen, es sei denn, ihr Tod ist ein Mysterium oder relevant für die Story. Setze 'is_alive' entsprechend.
    - Erstelle für jede identifizierte Person einen Hook mit: name (falls erwähnt), role (Beziehung zum Haupt-NPC), description (kurzer Kontext aus der Story), is_alive (true/false).
    - Beispiel: Wenn in der Story steht "Grommashs Schwester Nilidah wurde aus der Gilde verstoßen", erstelle: { "name": "Nilidah", "role": "Schwester", "description": "Wurde aus der Gilde verstoßen", "is_alive": true }
    - Wenn keine Personen erwähnt werden, lasse 'narrative_hooks' als leeres Array.

    ERGEBNISSE FÜR SPIELERPROBEN (check_results) – NUR FÜR DEN GM:
    - Diese Einträge sind **mögliche Ergebnisse, wenn SPIELER mit ihren Charakteren** (nicht der NPC!) **Wahrnehmung, Motiv erkennen oder Wissen** gegen diesen NPC würfeln. Der GM nutzt sie, um zu sagen: „Bei DC 12 bemerkst du …“, „Bei kritischem Erfolg siehst du …“.
    - **NICHT** formulieren als würde der NPC würfeln. **IMMER** formulieren als: Was erfährt/bemerkt der **Spielercharakter** bei diesem Wurf über den NPC?
    - Erstelle für "Wahrnehmung", "Motiv erkennen", "Wissen" je mindestens 2 DC-Stufen (z. B. DC 12 und DC 18, oder DC 15 + is_critical: true).
    - **Wahrnehmung**: Was sieht der Spielercharakter am NPC? (Kleidung, Narben, Waffen, Besonderheiten.) Formuliere z. B.: „Der Spieler bemerkt …“ / „Bei DC 12: … die dunkelgrüne Uniform und das silberne Abzeichen.“
    - **Motiv erkennen**: Was erkennt der Spielercharakter über Absichten/Emotionen? z. B. „Wirkt wachsam.“ / „Bei kritischem Erfolg: spürt verborgene Anspannung.“
    - **Wissen**: Was kann der Spielercharakter über Herkunft/Verbindungen/Geschichte wissen? z. B. „Kennt die Stadtwache von …“.
    - Nutze GM-Notizen und Ort/Fraktion-Kontext, um die Texte zu verankern. Beispiel: Ort "Nethergard" → (Wahrnehmung DC 12) "Bemerkt das silberne Amulett am Hals." | (Wahrnehmung DC 20, is_critical) "Erkennt: Das Amulett wirkt wie ein typisches Schutzwerk gegen Schattenmagie aus Nethergard."

    ANFORDERUNGEN:
    - Valid JSON. Sprache: Deutsch.
    - **KRITISCH - GEHEIMNISSE DÜRFEN NIEMALS IN ÖFFENTLICHEN FELDERN ERSCHEINEN:**
      * Informationen aus 'hidden_agenda', 'true_nature' oder Antagonist-Details dürfen NIEMALS in 'description' oder 'personality_traits' erscheinen!
      * Diese Felder sind für Spieler sichtbar und müssen subtil und harmlos wirken.
      * Alle geheimen Informationen gehören ausschließlich in 'true_nature', 'hidden_agenda' oder 'gm_notes'.
    - 'faction_name_suggestion': Wenn der NPC zu einer der existierenden Fraktionen passt, schreibe den Namen EXAKT so wie im Kontext. Sonst leer lassen.
    - 'current_location_name_suggestion': Wenn der NPC an einem existierenden Ort ist, schreibe den Namen EXAKT so wie in "VERFÜGBARE ORTE". Sonst leer lassen.
    - 'alignment': Muss einer dieser Werte sein: "Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil". Wähle basierend auf der Persönlichkeit und dem Hintergrund des NPCs.
    - 'race': BEVORZUGT eine Rasse aus "EXISTIERENDE RASSEN". Falls keine passt, nutze eine passende Standard-Rasse.
    - 'status': Muss einer dieser Werte sein: "Alive", "Deceased", "Missing", "Unknown". Standard: "Alive".
    - 'description': Atmosphärischer Einleitungstext für die Spieler. Schreibe einen flüssigen Text, den der GM vorlesen kann. Fokus auf Vibe und Ausstrahlung. KEINE Stichpunkte, kein reines Auflisten von Merkmalen. Muss harmlos und subtil sein. KEINE Geheimnisse!
    - 'appearance': NUR Stichpunkte (Bullet Points) mit harten optischen Fakten: Größe, Haarfarbe, markante Narben/Merkmale, Kleidung. Kein Fließtext, keine Wiederholung der Beschreibung.
    - 'personality_traits': Charaktereigenschaften, Verhalten, Eigenheiten (2-3 Sätze). ${secretContext?.is_secret_antagonist ? "**WICHTIG:** Wenn der NPC ein geheimer Antagonist ist, beschreibe hier die ÖFFENTLICHE, MASKIERTE Persönlichkeit (wie er sich nach außen gibt). KEINE Geheimnisse oder versteckten Absichten!" : ""}
    - **STRIKTE TRENNUNG:** Verwende das Feld 'description' ausschließlich für öffentliche Infos. Alle Geheimnisse aus 'hidden_agenda' MÜSSEN in 'true_nature' fließen. Mische diese Felder NIEMALS.
    ${secretContext?.is_secret_antagonist ? `
    
    **KRITISCH - AUFSPLITTUNG DER INFORMATIONEN FÜR GEHEIME ANTAGONISTEN:**
    Wenn 'is_secret_antagonist' true ist, MUSS du die Informationen wie folgt aufteilen:
    
    1. **'description'** (Öffentlich & Subtil – Vorlesetext):
       - Flüssiger Text zum Vorlesen, Fokus auf Vibe und Ausstrahlung. Wie der NPC auf Spieler wirkt (oberflächlich, freundlich, harmlos).
       - Nutze subtile Hinweise, die bei genauerer Betrachtung verdächtig wirken könnten. Keine Stichpunkte.
       - Beispiel: "Ein freundlicher Händler, der immer ein Lächeln auf den Lippen trägt" statt "Ein böser Verräter".
       - **KRITISCH: Informationen aus 'hidden_agenda' oder Antagonist-Details dürfen NIEMALS hier erscheinen! Diese Felder sind für Spieler sichtbar.**
    
    2. **'personality_traits'** (Öffentlich & Maskiert):
       - Beschreibe die öffentliche Persönlichkeit (wie er sich gibt).
       - Beispiel: "Wirkt freundlich und zuvorkommend, zeigt großes Interesse an den Angelegenheiten der Stadt" statt "Ist eigentlich ein Verräter".
       - **KRITISCH: Informationen aus 'hidden_agenda' oder Antagonist-Details dürfen NIEMALS hier erscheinen! Diese Felder sind für Spieler sichtbar.**
    
    3. **'true_nature'** (Intern & Enthüllend - NEUES FELD):
       - Beschreibe die WAHRE, interne Persönlichkeit (nur für GM sichtbar).
       - Beispiel: "In Wirklichkeit ein kaltblütiger Verräter, der die Stadt an ihre Feinde verkaufen will. Er versteckt seine wahren Absichten hinter einem freundlichen Lächeln."
    
    4. **'hidden_agenda'** (Falls im Secret-Kontext angegeben):
       - Übernehme die versteckte Agenda aus dem Kontext oder erweitere sie.
       - Beispiel: "Will die Stadt an ihre Feinde verkaufen, um persönlichen Reichtum zu erlangen."
    
    5. **'secret_entry'** (NEUES FELD - Für Secrets-Datenbank):
       - Erstelle ein konkretes Geheimnis, das in die Secrets-Datenbank eingefügt werden kann.
       - Dies sollte ein aufdeckbares Geheimnis sein, das Spieler durch Proben oder Interaktion finden können.
       - Beispiel: "Ist ein Spion der feindlichen Fraktion und sammelt Informationen über die Stadtverteidigung."
    ` : ""}
    
    JSON: { 
      "name": "string", 
      "title": "string (Beruf/Rolle, z.B. 'Magister der Energie', 'Schmied')", 
      "description": "string (flüssiger Vorlesetext für Spieler, Vibe und Ausstrahlung – keine Stichpunkte)", 
      "gm_notes": "string (Geheimnisse, Hintergrund)", 
      "faction_name_suggestion": "string (Exakter Name aus EXISTIERENDE FRAKTIONEN oder leer)",
      "current_location_name_suggestion": "string (Exakter Name aus VERFÜGBARE ORTE oder leer)",
      "race": "string (Bevorzugt aus EXISTIERENDE RASSEN)",
      "role": "string (Beruf/Rolle, z.B. 'Magister der Energie', 'Schmied', 'Händler')",
      "status": "Alive" | "Deceased" | "Missing" | "Unknown",
      "alignment": "Lawful Good" | "Neutral Good" | "Chaotic Good" | "Lawful Neutral" | "True Neutral" | "Chaotic Neutral" | "Lawful Evil" | "Neutral Evil" | "Chaotic Evil",
      "appearance": "string (NUR Stichpunkte: Größe, Haarfarbe, Narben, Kleidung – kein Fließtext)",
      "personality_traits": "string (Charaktereigenschaften, Verhalten, Eigenheiten)${secretContext?.is_secret_antagonist ? " - ÖFFENTLICHE, maskierte Persönlichkeit" : ""}",
      ${secretContext?.is_secret_antagonist ? `"true_nature": "string (Wahre, interne Persönlichkeit - nur für GM sichtbar)",
      "hidden_agenda": "string (Versteckte Agenda des NPCs)",
      "secret_entry": "string (Konkretes Geheimnis für Secrets-Datenbank)",` : ""}
      "narrative_hooks": [
        {
          "name": "string (optional, falls im Text erwähnt)",
          "role": "string (Beziehung, z.B. 'Schwester', 'Erzfeind', 'Mentor')",
          "description": "string (kurzer Kontext aus der Story)",
          "is_alive": boolean
        }
      ],
      "check_results": [
        {
          "type": "Wahrnehmung" | "Motiv erkennen" | "Wissen",
          "dc": number (Schwierigkeit der Spielerprobe, z.B. 12, 18),
          "result": "string (was der SPIELERCHARAKTER bei diesem Wurf über den NPC erfährt/bemerkt – NICHT was der NPC würfelt)",
          "is_critical": boolean (true = Ergebnis bei kritischem Erfolg des Spielers)
        }
      ]
    }
  `;

  const rawResult = await callOpenAI(systemPrompt, userPrompt);

  // KI liefert appearance manchmal als Array (Stichpunkte) – in String normalisieren
  if (rawResult && typeof rawResult === "object" && Array.isArray((rawResult as any).appearance)) {
    const arr = (rawResult as any).appearance as unknown[];
    (rawResult as any).appearance = arr
      .filter((x: unknown) => typeof x === "string")
      .join("\n")
      .trim() || null;
  } else if (
    rawResult &&
    typeof rawResult === "object" &&
    (rawResult as any).appearance != null &&
    typeof (rawResult as any).appearance !== "string"
  ) {
    (rawResult as any).appearance = null;
  }

  // Zentrale Zod-Validierung der KI-Antwort für NPCs
  const parsedNPC = NPCSchema.safeParse(rawResult);
  if (!parsedNPC.success) {
    console.error("AI Validation Error (NPCSchema):", parsedNPC.error.format());
    throw new Error("Die KI hat ein ungültiges Format für den NPC geliefert.");
  }

  let result: any = parsedNPC.data;

  // Zusätzlicher Sicherheits-Check: Geheimnisse dürfen nicht in description/personality landen
  if (result.hidden_agenda) {
    const hidden = String(result.hidden_agenda).toLowerCase();
    const snippet = hidden.slice(0, 80); // kurzer Ausschnitt zum Matching

    const desc = (result.description || "").toLowerCase();
    const pers = (result.personality_traits || "").toLowerCase();

    if ((snippet && desc.includes(snippet)) || (snippet && pers.includes(snippet))) {
      console.error("AI Secret Leakage Detected: hidden_agenda scheint in description/personality aufzutauchen.");
      throw new Error(
        "Die KI hat geheime Informationen fälschlicherweise in die öffentliche Beschreibung übernommen. Bitte versuche die Generierung erneut."
      );
    }
  }

  // Sicherstellen, dass mindestens zwei Check-Results existieren
  if (!result.check_results || result.check_results.length < 2) {
    console.error("AI Validation Error: Weniger als zwei check_results erzeugt:", result.check_results);
    throw new Error("Die KI muss mindestens zwei Proben-Einträge (check_results) liefern.");
  }

  // Validierung gegen Root-World-Kontext
  const { data: world } = await supabase
    .from("worlds")
    .select("genre_style, magic_level")
    .eq("campaign_id", campaignId)
    .single();

  const validation = await validateAIResponseAgainstWorld(result, world);
  if (validation.warnings.length > 0) {
    console.warn("⚠️ KI-Validierungswarnungen:", validation.warnings);
    // Optional: Warnung an Frontend weitergeben (kann später als Toast angezeigt werden)
    result._validationWarnings = validation.warnings;
  }

  // Optional: Versuche faction_id zu finden, wenn faction_name_suggestion vorhanden
  if (result.faction_name_suggestion) {
    const { data: factionRaw } = await (supabase.from("factions") as any)
      .select("id")
      .eq("campaign_id", campaignId)
      .ilike("name", result.faction_name_suggestion)
      .single();
    
    const faction = factionRaw as { id: string } | null;
    if (faction) {
      result.faction_id = faction.id;
    } else {
      // Fallback: Fuzzy Match
      const { data: fuzzyFactionsRaw } = await (supabase.from("factions") as any)
        .select("id, name")
        .eq("campaign_id", campaignId)
        .ilike("name", `%${result.faction_name_suggestion}%`)
        .limit(1);
      
      const fuzzyFactions = fuzzyFactionsRaw as { id: string; name: string | null }[] | null;
      if (fuzzyFactions && fuzzyFactions.length > 0) {
        result.faction_id = fuzzyFactions[0].id;
      }
    }
  }

  // Optional: Versuche current_location_id zu finden, wenn current_location_name_suggestion vorhanden
  if (result.current_location_name_suggestion && locations && locations.length > 0) {
    type LocationType = { id: string; name: string | null; type: string | null };
    const matchedLocation = (locations as LocationType[]).find(
      (loc) => loc.name?.toLowerCase() === result.current_location_name_suggestion?.toLowerCase()
    );
    
    if (matchedLocation) {
      result.current_location_id = matchedLocation.id;
    } else {
      // Fallback: Fuzzy Match
      const fuzzyLocation = (locations as LocationType[]).find(
        (loc) => loc.name?.toLowerCase().includes(result.current_location_name_suggestion?.toLowerCase() || "") ||
                      result.current_location_name_suggestion?.toLowerCase().includes(loc.name?.toLowerCase() || "")
      );
      
      if (fuzzyLocation) {
        result.current_location_id = fuzzyLocation.id;
      }
    }
  }

  return result;
}

// ------------------------------------------------------------------
// 3. FRAKTION GENERATOR
// ------------------------------------------------------------------
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
  const { getVisibilityForCampaign } = await import("./campaign-visibility-queries");
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
export async function generateNpcDetailsFromHook(
  campaignId: string,
  sourceNPCName: string,
  hook: { name?: string; role: string; description: string; is_alive: boolean },
  currentName?: string
) {
  const supabase = await verifyGM(campaignId);
  const worldContext = await getWorldContext(supabase, campaignId);

  // Bestimme den zu verwendenden Namen: currentName hat Vorrang, falls vorhanden
  const npcName = currentName && currentName.trim() !== "" && currentName.trim().toLowerCase() !== "unbekannt"
    ? currentName.trim()
    : (hook.name && hook.name.trim() !== "" && hook.name.trim().toLowerCase() !== "unbekannt" ? hook.name.trim() : "[Name noch nicht festgelegt]");

  const systemPrompt = `
    Du bist Game Master. Erstelle detaillierte Informationen für einen NPC basierend auf einem Story-Hook.
    
    **KRITISCH WICHTIG - GROUND TRUTH (UNVERÄNDERLICHE FAKTEN - DIESE DÜRFEN NICHT GEÄNDERT WERDEN):**
    - Der NPC heißt: ${npcName}
    - WICHTIG: Falls im ursprünglichen Story-Hook der Name als "Unbekannt" markiert war, IGNORIERE das Wort "Unbekannt" komplett und verwende stattdessen konsequent den Namen "${npcName}" für ALLE Beschreibungen (Aussehen, Persönlichkeit, Description).
    - Die Beziehung zum Ursprungs-NPC "${sourceNPCName}" ist EXAKT: "${hook.role}"
    - Der Kontext aus dem Hook: "${hook.description}"
    
    **ABSOLUTE VERBOTE (DIESE FEHLER FÜHREN ZU INKONSISTENZEN):**
    1. ❌ VERBOTEN: Die Rolle/Beruf aus dem Hook-Kontext zu ändern oder zu ignorieren!
       - Wenn der Hook sagt "Heilerin", dann ist der NPC eine HEILERIN, nicht "Beraterin" oder "Dienerin"!
       - Wenn der Hook sagt "Schmied", dann ist der NPC ein SCHMIED!
    2. ❌ VERBOTEN: Die Beziehung zu ${sourceNPCName} zu ändern!
       - Wenn der Hook sagt "Schwester", dann ist der NPC die SCHWESTER von ${sourceNPCName}, nicht "Dienerin" oder "Beraterin"!
    3. ❌ VERBOTEN: Neue Namen für Personen, Fraktionen oder Orte zu erfinden, die nicht im Hook-Kontext stehen!
       - Wenn "Elion" nicht im Hook erwähnt wird, existiert "Elion" NICHT für diesen NPC!
    4. ❌ VERBOTEN: Die Persönlichkeit zu erfinden, ohne die beschriebene Beziehung zu berücksichtigen!
       - "besorgte Schwester" bedeutet: Sie sorgt sich um ${sourceNPCName}, ist fürsorglich, beschützend!
    
    **WAS DU TUN SOLLST:**
    1. ✅ Übernehme die Rolle aus dem Hook EXAKT (z.B. "Heilerin" bleibt "Heilerin").
    2. ✅ Beschreibe das Aussehen passend zur Rolle (z.B. Heilerin = Heiler-Kleidung, Kräuter, medizinische Utensilien).
    3. ✅ Beschreibe die Persönlichkeit basierend auf der Beziehung (z.B. "besorgte Schwester" = fürsorglich, beschützend, emotional verbunden mit ${sourceNPCName}).
    4. ✅ Nutze NUR Namen und Fakten, die im Hook-Kontext oder im Welt-Kontext erwähnt werden.
    
    WELT KONTEXT (für Konsistenz, aber Hook-Fakten haben VORRANG):
    ${worldContext}
    
    ANFORDERUNGEN:
    - Valid JSON. Sprache: Deutsch.
    - 'description': Flüssiger Vorlesetext für Spieler, Vibe und Ausstrahlung. Erwähnt Rolle und Beziehung aus dem Hook. Keine Stichpunkte.
    - 'appearance': NUR Stichpunkte (Größe, Haarfarbe, Kleidung, Merkmale) – passend zur Rolle (z.B. Heilerin = Heiler-Kleidung, Kräuter). Kein Fließtext.
    - 'personality_traits': Charaktereigenschaften, die die BESCHRIEBENE BEZIEHUNG widerspiegeln (z.B. "besorgte Schwester" = fürsorglich, beschützend).
    
    JSON: {
      "description": "string (flüssiger Vorlesetext für Spieler, Rolle und Beziehung aus Hook)",
      "appearance": "string (NUR Stichpunkte, passend zur Rolle aus dem Hook)",
      "personality_traits": "string (Charaktereigenschaften, die die Beziehung widerspiegeln)"
    }
  `;

  const userPrompt = `Erstelle Details für ${hook.name || "diesen NPC"}, der ${hook.role} von ${sourceNPCName} ist. Kontext: ${hook.description}`;

  try {
    const result = await callOpenAI(systemPrompt, userPrompt);
    return {
      appearance: result.appearance || "",
      personality_traits: result.personality_traits || "",
      description: result.description || "",
    };
  } catch (error) {
    console.error("generateNpcDetailsFromHook Error:", error);
    throw error instanceof Error
      ? error
      : new Error("Fehler bei der NPC-Details-Generierung aus Hook.");
  }
}

// ------------------------------------------------------------------
// ANALYZE WORLD CONTEXT (für On-the-Fly Worldbuilding)
// ------------------------------------------------------------------
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
