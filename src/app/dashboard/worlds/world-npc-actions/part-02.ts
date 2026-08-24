/**
 * world-npc-actions — part 2: processBriefing, generateNPCPortrait, getWorldNPCsForRelations, generateNpcCombatSheet, GenerateNPCPortraitInput.
 */
"use server";

import type {
  BriefingMapping,
  BriefingNewEntity,
  ProcessBriefingResult,
} from "./part-01";

import { buildBlueprintContext } from "./part-01";
import { loadWorldAndAuth } from "./part-01";

import OpenAI from "openai";
import { createClient } from "@/src/lib/supabase/server";
import type { WorldBlueprint } from "@/src/types/world";
import { NPCSchema } from "@/src/lib/validations/schemas";
import {
  buildPortraitArtStyle,
  buildPortraitImagePrompt,
} from "@/src/lib/npc-portrait-style";
import { compressImageBufferToWebp } from "@/src/lib/image-compress-server";

const PROFILE_MEDIA_BUCKET = "profile-media";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const NPC_ALIGNMENT_VALUES = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
] as const;

const NPC_STATUS_VALUES = ["Alive", "Deceased", "Missing", "Unknown"] as const;

function normalizeNpcAlignment(value: unknown): (typeof NPC_ALIGNMENT_VALUES)[number] {
  const raw = String(value ?? "").trim();
  if ((NPC_ALIGNMENT_VALUES as readonly string[]).includes(raw)) {
    return raw as (typeof NPC_ALIGNMENT_VALUES)[number];
  }
  const lower = raw.toLowerCase();
  const map: Record<string, (typeof NPC_ALIGNMENT_VALUES)[number]> = {
    "lawful good": "Lawful Good",
    "neutral good": "Neutral Good",
    "chaotic good": "Chaotic Good",
    "lawful neutral": "Lawful Neutral",
    "true neutral": "True Neutral",
    "neutral": "True Neutral",
    "chaotic neutral": "Chaotic Neutral",
    "lawful evil": "Lawful Evil",
    "neutral evil": "Neutral Evil",
    "chaotic evil": "Chaotic Evil",
    "rechtschaffen gut": "Lawful Good",
    "neutral gut": "Neutral Good",
    "chaotisch gut": "Chaotic Good",
    "rechtschaffen neutral": "Lawful Neutral",
    "wahrhaft neutral": "True Neutral",
    "chaotisch neutral": "Chaotic Neutral",
    "rechtschaffen böse": "Lawful Evil",
    "neutral böse": "Neutral Evil",
    "chaotisch böse": "Chaotic Evil",
  };
  return map[lower] ?? "True Neutral";
}

function normalizeNpcStatus(value: unknown): (typeof NPC_STATUS_VALUES)[number] {
  const raw = String(value ?? "").trim();
  if ((NPC_STATUS_VALUES as readonly string[]).includes(raw)) {
    return raw as (typeof NPC_STATUS_VALUES)[number];
  }
  const lower = raw.toLowerCase();
  if (lower.includes("dead") || lower.includes("tot")) return "Deceased";
  if (lower.includes("missing") || lower.includes("vermisst")) return "Missing";
  if (lower.includes("unknown") || lower.includes("unbekannt")) return "Unknown";
  return "Alive";
}

function normalizeNpcCheckResults(value: unknown) {
  const rows = Array.isArray(value) ? value : [];
  const normalized = rows
    .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
    .map((row) => ({
      type: String(row.type ?? "Wahrnehmung"),
      dc: Number.isFinite(Number(row.dc)) ? Number(row.dc) : 15,
      result: String(row.result ?? "").trim(),
      is_critical: row.is_critical === true,
    }))
    .filter((row) => row.result.length > 0);

  const defaults = [
    {
      type: "Wahrnehmung",
      dc: 15,
      result: "Auf den ersten Blick wirkt der NSC unauffällig, aber etwas an seiner Haltung fällt auf.",
      is_critical: false,
    },
    {
      type: "Motiv erkennen",
      dc: 18,
      result: "Hinter der höflichen Fassade zeigt sich ein berechnender, wachsamer Blick.",
      is_critical: false,
    },
  ];

  while (normalized.length < 2) {
    normalized.push(defaults[normalized.length]);
  }

  return normalized;
}

function normalizeNpcAiPayload(raw: Record<string, unknown>) {
  return {
    ...raw,
    name: String(raw.name ?? "Unbenannter NSC").trim() || "Unbenannter NSC",
    description: String(raw.description ?? "").trim() || "Ein NSC aus dieser Welt.",
    alignment: normalizeNpcAlignment(raw.alignment),
    status: normalizeNpcStatus(raw.status),
    check_results: normalizeNpcCheckResults(raw.check_results),
  };
}

export async function processBriefing(
  worldId: string,
  briefing: string,
  existingFactions: Array<{ id: string; name: string }>,
  existingLocations: Array<{ id: string; name: string }>,
  currentNpcName?: string,
  existingNPCs?: Array<{ id: string; name: string }>
): Promise<ProcessBriefingResult> {
  const { world, blueprint } = await loadWorldAndAuth(worldId);
  const blueprintContext = await buildBlueprintContext(world.name, blueprint);

  const factionsJson = JSON.stringify(existingFactions.map((f) => ({ id: f.id, name: f.name })));
  const locationsJson = JSON.stringify(existingLocations.map((l) => ({ id: l.id, name: l.name })));

  let npcsForPrompt = existingNPCs ?? [];
  if (!existingNPCs || existingNPCs.length === 0) {
    const supabase = await createClient();
    const { data: npcRows } = await (supabase.from("npcs") as any)
      .select("id, name")
      .eq("world_id", worldId)
      .order("name", { ascending: true });
    npcsForPrompt = (npcRows || []).map((n: any) => ({ id: String(n.id), name: String(n.name ?? "Unbenannt") }));
  }
  const npcsJson = JSON.stringify(npcsForPrompt.map((n) => ({ id: n.id, name: n.name })));

  const mainNpcHint = (currentNpcName && currentNpcName.trim())
    ? `

WICHTIG: Der NPC, der gerade erstellt wird, heißt "${currentNpcName.trim()}". Diesen Namen darfst du NICHT in "new_entities" eintragen – er ist der Hauptcharakter des Briefings, kein zusätzlicher Entwurfsvorschlag. Nur andere erwähnte Personen/Orte/Fraktionen als neue Entitäten vorschlagen.`
    : "";

  const systemPrompt = `Du bist ein Game-Master-Assistent für Recursive Worldbuilding. Analysiere das GM-Briefing und die bestehende Welt.

${blueprintContext}

BESTEHENDE ENTITÄTEN IN DIESER WELT:
- Fraktionen: ${factionsJson}
- Orte: ${locationsJson}
- NPCs: ${npcsJson}
${mainNpcHint}

AUFGABE:
1. Identifiziere alle erwähnten Entitäten (Orte, Organisationen/Fraktionen, Personen).
2. MAPPING: Wenn etwas erwähnt wird, das zu einer bestehenden Fraktion, einem bestehenden Ort ODER einem bestehenden NPC passt, verknüpfe es (existing_id, existing_name). Achte dabei auch auf leicht abweichende Schreibweisen oder Spitznamen – wenn ein NPC "Joshu'rak" heißt und "Joshurak" im Briefing steht, ist das derselbe NPC!
3. INKUBATION: Wenn eine Entität erwähnt wird, die WIRKLICH NICHT in den obigen Listen existiert, markiere sie als NEU. Schlage NIEMALS einen NPC, Ort oder eine Fraktion als "neu" vor, wenn ein gleichnamiger oder sehr ähnlich benannter Eintrag bereits in den Listen steht.

WICHTIG — KEINE Entitäten aus NPC-Metadaten oder Tisch-Mechanik (D&D 5e):
- "Wahrnehmung", "Motiv erkennen", "Motivation", "Persönlichkeit", "Aussehen", "Verhalten", "Wissen", "Biografie", "Geschätzt", "Ort in Session" sind Feldbezeichnungen aus NSC-Briefings oder Skill-Checks — KEINE Quests, Aufgaben, Orte oder Personen.
- Würfelproben auf Fertigkeiten/Attribute (Heimlichkeit, Athletik, Überzeugen, Rettungswürfe …), DC-Angaben, W20-Ergebnisse und kritische Erfolge sind Tisch-Aktionen — KEINE Story-Quests. Sie können die Richtung der Szene vorgeben, werden aber nicht digital als Quest erfasst.
- Erfinde keine new_entities aus solchen Labels, Proben oder Zeilen wie "Motivation: …" / "Wahrnehmung DC 15: …".
- Eine Quest/Aufgabe ist nur dann relevant, wenn im Briefing ein klarer Spieler-Auftrag mit Ziel genannt wird — nicht bei NSC-Eigenschaften oder Würfelergebnissen.

Antworte NUR mit einem JSON-Objekt mit genau drei Feldern (Deutsch wo sinnvoll):
- "mappings": Array von { "mention": "Text aus dem Briefing", "entity_type": "location"|"faction"|"npc", "existing_id": "uuid oder null", "existing_name": "Name oder null" }. Nur Einträge, wo du eine Zuordnung machst (ob existierend oder neu).
- "new_entities": Array von { "type": "location"|"faction"|"npc", "proposed_name": "Vorschlag", "description": "1-2 Sätze" }. Nur Entitäten, die noch nicht in der Welt existieren. Den Haupt-NPC des Briefings (den gerade erstellten Charakter) NIEMALS hier aufnehmen. Und NIEMALS einen NPC vorschlagen, der bereits in der NPC-Liste existiert!
- "summary": Ein kurzer Absatz (2-3 Sätze), der zusammenfasst, welche Verbindungen erkannt wurden und welche neuen Entitäten angelegt werden könnten.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: briefing.trim() || "Kein Briefing eingegeben." },
    ],
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Keine Antwort von der KI erhalten.");
  const raw = JSON.parse(content);

  const mappings: BriefingMapping[] = Array.isArray(raw.mappings)
    ? raw.mappings
        .filter(
          (m: any) =>
            m && typeof m.mention === "string" && ["location", "faction", "npc"].includes(m?.entity_type)
        )
        .map((m: any) => ({
          mention: String(m.mention),
          entity_type: m.entity_type,
          existing_id: m.existing_id ?? null,
          existing_name: m.existing_name ?? null,
        }))
    : [];

  let new_entities: BriefingNewEntity[] = Array.isArray(raw.new_entities)
    ? raw.new_entities
        .filter(
          (e: any) =>
            e &&
            ["location", "faction", "npc"].includes(e.type) &&
            typeof e.proposed_name === "string" &&
            typeof e.description === "string"
        )
        .map((e: any) => ({
          type: e.type,
          proposed_name: String(e.proposed_name).trim(),
          description: String(e.description).trim(),
        }))
    : [];

  // Sicherheitsfilter: Den gerade erstellten NPC nie als Entwurfsvorschlag zurückgeben
  const mainNameNorm = (currentNpcName && currentNpcName.trim()) ? currentNpcName.trim().toLowerCase() : "";
  if (mainNameNorm) {
    new_entities = new_entities.filter(
      (e) => e.type !== "npc" || e.proposed_name.trim().toLowerCase() !== mainNameNorm
    );
  }

  // Sicherheitsfilter: Bestehende NPCs, Orte und Fraktionen nie als "neu" vorschlagen
  const existingNpcNames = new Set(npcsForPrompt.map((n) => n.name.trim().toLowerCase()));
  const existingLocationNames = new Set(existingLocations.map((l) => l.name.trim().toLowerCase()));
  const existingFactionNames = new Set(existingFactions.map((f) => f.name.trim().toLowerCase()));
  new_entities = new_entities.filter((e) => {
    const nameNorm = e.proposed_name.trim().toLowerCase();
    if (e.type === "npc" && existingNpcNames.has(nameNorm)) return false;
    if (e.type === "location" && existingLocationNames.has(nameNorm)) return false;
    if (e.type === "faction" && existingFactionNames.has(nameNorm)) return false;
    return true;
  });

  const summary = typeof raw.summary === "string" ? raw.summary.trim() : "";

  return { mappings, new_entities, summary };
}

// ============================================================================
// NPC-Portrait (DALL·E) aus bestätigtem Aussehen
// ============================================================================

export type GenerateNPCPortraitInput = {
  name: string;
  appearance: string;
  race?: string;
  age?: string;
  gender?: string;
  role?: string;
  styleOverride?: string;
};

export async function generateNPCPortrait(
  worldId: string,
  input: GenerateNPCPortraitInput,
): Promise<{ imageUrl: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY ist nicht konfiguriert.");
  }

  const appearance = input.appearance?.trim();
  if (!appearance || appearance.length < 20) {
    throw new Error("Bitte bestätige zuerst eine ausreichend detaillierte Aussehensbeschreibung.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { blueprint } = await loadWorldAndAuth(worldId);
  const artStyle = buildPortraitArtStyle(blueprint);
  const prompt = buildPortraitImagePrompt({
    name: input.name.trim() || "Unnamed NPC",
    appearance,
    race: input.race?.trim(),
    age: input.age?.trim(),
    gender: input.gender?.trim(),
    role: input.role?.trim(),
    artStyle,
    styleOverride: input.styleOverride?.trim(),
  });

  const response = await openai.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "medium",
    output_format: "png",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("Die Bild-KI hat kein Bild zurückgegeben.");
  }

  const rawBuffer = Buffer.from(b64, "base64");
  const compressed = await compressImageBufferToWebp(rawBuffer);
  const path = `${user.id}/npcs/${worldId}/portrait-${Date.now()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, compressed.buffer, {
      contentType: compressed.contentType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Bild-Upload fehlgeschlagen: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return { imageUrl: urlData.publicUrl };
}

// ============================================================================
// Welt-NPCs für Beziehungs-Dropdown (optional nur am gleichen Ort)
// ============================================================================
export async function getWorldNPCsForRelations(
  worldId: string,
  currentNpcId: string,
  onlyLocal: boolean
): Promise<Array<{ id: string; name: string; current_location_id: string | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: world } = await (supabase.from("worlds") as any)
    .select("id, gm_id")
    .eq("id", worldId)
    .single();
  if (!world || (world as { gm_id: string }).gm_id !== user.id) return [];

  let currentLocationId: string | null = null;
  if (onlyLocal) {
    const { data: current } = await (supabase.from("npcs") as any)
      .select("current_location_id")
      .eq("id", currentNpcId)
      .single();
    currentLocationId = (current as { current_location_id: string | null } | null)?.current_location_id ?? null;
  }

  let query = (supabase.from("npcs") as any)
    .select("id, name, current_location_id")
    .eq("world_id", worldId)
    .neq("id", currentNpcId)
    .order("name", { ascending: true });

  if (onlyLocal && currentLocationId) {
    query = query.eq("current_location_id", currentLocationId);
  }

  const { data: list } = await query;
  return (list || []).map((n: any) => ({
    id: String(n.id),
    name: String(n.name ?? "Unbenannt"),
    current_location_id: n.current_location_id ?? null,
  }));
}

/**
 * D&D 5e NPC-Kampfwerte per KI (Attribute, AC/HP, Angriffe, Zauber).
 * Basiert auf Klasse/Archetyp + Stärke-Tier und narrativem Kontext.
 */
export async function generateNpcCombatSheet(
  worldId: string,
  input: {
    name: string;
    role?: string | null;
    race?: string | null;
    appearance?: string | null;
    description?: string | null;
    alignment?: string | null;
    classHint: string;
    powerTier?: "minion" | "standard" | "elite" | "boss";
  },
): Promise<import("@/src/lib/npcs/npc-sheet-types").NpcSheetData> {
  await loadWorldAndAuth(worldId);

  const powerTier = input.powerTier ?? "standard";
  const systemPrompt = `Du bist ein erfahrener Dungeon Master und erstellst D&D 5e NPC-Statblöcke (Monster Manual / DMG NPC-Regeln), NICHT Spielercharaktere.

Antworte NUR mit validem JSON in diesem Schema:
{
  "version": 1,
  "classHint": string,
  "challengeRating": string (z.B. "1/2", "2", "5"),
  "powerTier": "minion"|"standard"|"elite"|"boss",
  "sizeCategory": "tiny"|"small"|"medium"|"large"|"huge"|"gargantuan",
  "creatureType": string,
  "abilities": {
    "str": {"score": number}, "dex": {"score": number}, "con": {"score": number},
    "int": {"score": number}, "wis": {"score": number}, "cha": {"score": number}
  },
  "combat": {
    "ac": number, "hpMax": number, "hpCurrent": number, "speed": number, "proficiencyBonus": number
  },
  "attacks": [{"id": string, "name": string, "attackBonus": number, "damage": string, "notes": string|null}],
  "spells": [{"id": string, "name": string, "level": number, "school": string|null, "notes": string|null}],
  "features": [{"id": string, "name": string, "description": string|null}],
  "notes": string|null
}

Regeln:
- Werte müssen zum powerTier und classHint passen (minion schwach, boss gefährlich).
- Zauber nur wenn der Archetyp zaubert (Zauberer, Kleriker, Kampfmagier …); sonst leeres Array.
- 1–3 sinnvolle Angriffe. IDs als kurze UUID-ähnliche Strings.
- Sprache für Namen/Notes: Deutsch wo sinnvoll (Zauber können englische PHB-Namen behalten).`;

  const userMessage = `NPC: ${input.name}
Rolle: ${input.role ?? "unbekannt"}
Rasse: ${input.race ?? "unbekannt"}
Alignment: ${input.alignment ?? "unbekannt"}
Klasse/Archetyp: ${input.classHint}
Stärke: ${powerTier}
Beschreibung: ${(input.description ?? "").slice(0, 600)}
Aussehen: ${(input.appearance ?? "").slice(0, 400)}

Erstelle passende D&D 5e NPC-Kampfwerte.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Keine Antwort von der KI erhalten.");
  const raw = JSON.parse(content) as Record<string, unknown>;
  const {
    mergeNpcSheetWithDefaults,
  } = await import("@/src/lib/npcs/npc-sheet-types");
  return mergeNpcSheetWithDefaults({
    ...(raw as object),
    version: 1,
    classHint: input.classHint,
    powerTier,
  } as Parameters<typeof mergeNpcSheetWithDefaults>[0]);
}
