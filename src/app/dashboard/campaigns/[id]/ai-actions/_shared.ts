/**
 * Shared OpenAI client and campaign AI helper utilities.
 * Used by domain-specific ai-actions modules (shop, quest, NPC, etc.).
 */
import OpenAI from "openai";
import { createClient } from "@/src/lib/supabase/server";
import type { WorldBlueprint } from "@/src/types/world";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ------------------------------------------------------------------
// HILFSFUNKTION: Secrets für Entitäten laden
// ------------------------------------------------------------------
export async function getSecretsForEntities(
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
export async function getRootWorldContext(supabase: any, campaignId: string): Promise<string> {
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
export async function validateAIResponseAgainstWorld(
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
export async function getWorldContext(supabase: any, campaignId: string) {
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
export async function callOpenAI(systemPrompt: string, userPrompt: string) {
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

export const SHOP_ITEM_RARITIES = new Set([
  "common",
  "uncommon",
  "rare",
  "very rare",
  "legendary",
]);

export const SHOP_ITEM_TYPES = new Set([
  "weapon",
  "armor",
  "potion",
  "gear",
  "material",
  "service",
  "quest",
]);

export function normalizeShopItemRarity(value: unknown) {
  const rarity = String(value ?? "common").trim().toLowerCase();
  return SHOP_ITEM_RARITIES.has(rarity) ? rarity : "common";
}

export function normalizeShopItemType(value: unknown) {
  const itemType = String(value ?? "gear").trim().toLowerCase();
  return SHOP_ITEM_TYPES.has(itemType) ? itemType : "gear";
}

// ------------------------------------------------------------------
// HELPER: WORLD BLUEPRINT KONTEXT
// ------------------------------------------------------------------
export async function getWorldBlueprintContext(supabase: any, campaignId: string): Promise<string> {
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
export async function verifyGM(campaignId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as { gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Inhalte mit KI generieren.");
  }

  return supabase;
}
