"use server";

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

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ist nicht konfiguriert.");
  }
  return new OpenAI({ apiKey });
}

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

export async function buildBlueprintContext(worldName: string, blueprint: WorldBlueprint | null): Promise<string> {
  if (!blueprint) return `Welt: ${worldName}. Kein Blueprint hinterlegt – nutze konsistentes Fantasy-Setting.`;
  const bp = blueprint;
  let ctx = `\n=== WORLD BLUEPRINT (strikt einhalten) ===\n`;
  ctx += `Welt: ${worldName}\n`;
  ctx += `Genre: ${bp.vibes?.genre ?? "nicht gesetzt"}\n`;
  ctx += `Tech-Level: ${bp.vibes?.tech_level ?? "nicht gesetzt"}\n`;
  ctx += `Magie: ${bp.vibes?.magic_prevalence ?? "nicht gesetzt"}\n`;
  ctx += `Weltform: ${bp.physics?.shape ?? "nicht gesetzt"}\n`;
  ctx += `Religionstyp: ${bp.culture?.religion_type ?? "nicht gesetzt"}\n`;
  ctx += `Sprachbasis: ${bp.culture?.language_base ?? "nicht gesetzt"}\n`;
  ctx += `Hauptkonflikt: ${bp.culture?.main_conflict ?? "nicht gesetzt"}\n`;
  ctx += `Währung: ${bp.life_economy?.currency_name ?? "nicht gesetzt"}\n`;
  return ctx;
}

export type GenerateNPCOptions = {
  prompt?: string;
  /** Wenn true, liefert die KI zusätzlich suggested_secret (title, content). */
  includeSecret?: boolean;
};

export type GeneratedNPCResult = {
  name: string;
  title: string | null;
  role: string | null;
  race: string | null;
  status: string;
  alignment: string;
  description: string;
  appearance: string | null;
  personality_traits: string | null;
  gm_notes: string | null;
  narrative_hooks?: Array<{ name?: string | null; role: string; description: string; is_alive: boolean }> | null;
  check_results: Array<{ type: string; dc: number; result: string; is_critical: boolean }>;
  faction_name_suggestion?: string | null;
  current_location_name_suggestion?: string | null;
  true_nature?: string | null;
  hidden_agenda?: string | null;
  secret_entry?: string | null;
  suggested_secret?: { title: string; content: string } | null;
};

export async function loadWorldAndAuth(worldId: string) {
  const supabase = await createClient();

  const worldIdNorm = typeof worldId === "string" ? worldId.trim() : String(worldId);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: profileRaw } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { primary_role?: string } | null;
  const isAdmin = profile?.primary_role === "Admin";

  const { data: worldRaw, error: worldError } = await (supabase.from("worlds") as any)
    .select("id, name, gm_id, blueprint")
    .eq("id", worldIdNorm)
    .single();

  if (worldError || !worldRaw) {
    console.error("[loadWorldAndAuth] Welt-Abfrage fehlgeschlagen:", {
      worldId: worldIdNorm,
      error: worldError,
    });
    throw new Error("Welt nicht gefunden.");
  }

  const world = worldRaw as {
    id: string;
    name: string;
    gm_id?: string;
    blueprint?: WorldBlueprint | null;
  };
  const isWorldGm = world.gm_id != null && String(world.gm_id) === String(user.id);
  if (!isWorldGm && !isAdmin) {
    throw new Error("Keine Berechtigung für diese Welt.");
  }

  return { world, blueprint: (world.blueprint as WorldBlueprint) ?? null };
}

/**
 * NPC per KI generieren – mit Welt-Blueprint-Kontext (Smart-Context).
 * Optionen: prompt, includeSecret (liefert dann suggested_secret für npc_secrets).
 */
export async function generateNPC(
  worldId: string,
  options: GenerateNPCOptions = {}
): Promise<GeneratedNPCResult> {
  const { prompt, includeSecret = true } = typeof options === "object" ? options : { prompt: options, includeSecret: true };
  const { world, blueprint } = await loadWorldAndAuth(worldId);

  const blueprintContext = await buildBlueprintContext(world.name, blueprint);
  const genre = blueprint?.vibes?.genre ?? "Fantasy";
  const magic = blueprint?.vibes?.magic_prevalence ?? "nicht gesetzt";
  const tech = blueprint?.vibes?.tech_level ?? "nicht gesetzt";
  const currency = blueprint?.life_economy?.currency_name ?? "nicht gesetzt";

  const systemPrompt = `Du bist ein kreativer Game Master. Erstelle einen NPC für die Welt "${world.name}".
Welt-Vibe: ${genre}. Magie: ${magic}. Tech: ${tech}. Währung: ${currency}

${blueprintContext}
Der NPC muss sich organisch in dieses Gefüge einfügen.

ANFORDERUNGEN:
- Valides JSON, Sprache: Deutsch.
- alignment: genau einer von "Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil".
- status: genau einer von "Alive", "Deceased", "Missing", "Unknown".
- description: Atmosphärischer Einleitungstext für die Spieler. Schreibe einen flüssigen Text, den der GM vorlesen kann. Fokus auf Vibe und Ausstrahlung – KEINE Stichpunkte, kein reines Aussehen.
- appearance: NUR Stichpunkte (Bullet Points) mit harten optischen Fakten für den schnellen Blick. Liste z. B.: Größe, Haarfarbe, markante Narben/Merkmale, Kleidung. Kein Fließtext, keine Wiederholung der Beschreibung.
- personality_traits: Charaktereigenschaften, Verhalten (2–3 Sätze).
- check_results: Mögliche Ergebnisse für den GM, wenn SPIELER mit ihren Charakteren Proben gegen diesen NPC würfeln (nicht der NPC würfelt!). Pro Eintrag: type ("Wahrnehmung" | "Motiv erkennen" | "Wissen"), dc (Schwierigkeit 10–20), result (was der Spielercharakter bei diesem Wurf über den NPC erfährt/bemerkt – z. B. "Sieht die Narbe über dem linken Auge und die Wachtuniform"), is_critical (true = bei kritischem Erfolg). Mindestens je eine Stufe für Wahrnehmung und Motiv erkennen. Formuliere result aus Sicht „Was bemerkt der Spieler bei DC X?“.
- narrative_hooks: optional, Array von { name?, role, description, is_alive }.

Antworte NUR mit einem JSON-Objekt mit den Feldern: name, title, description, gm_notes, role, race, status, alignment, appearance, personality_traits, narrative_hooks, check_results. Optional: faction_name_suggestion, current_location_name_suggestion, true_nature, hidden_agenda, secret_entry.${
    includeSecret
      ? `

Zusätzlich MUSS das Objekt das Feld "suggested_secret" enthalten: ein Geheimnis zu diesem NPC (z.B. verborgene Vergangenheit, Doppelspiel), das der GM später in einer Kampagne als npc_secret anlegen kann. Format: { "title": "Kurzer Titel (z.B. 3–6 Wörter)", "content": "2–4 Sätze Inhalt des Geheimnisses auf Deutsch." }`
      : ""
  }`;

  const userMessage = (prompt && String(prompt).trim()) ? String(prompt).trim() : "Erstelle einen passenden NPC für diese Welt.";

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Keine Antwort von der KI erhalten.");
  const raw = JSON.parse(content);

  // KI liefert appearance manchmal als Array (Stichpunkte) – in String normalisieren
  if (Array.isArray(raw.appearance)) {
    raw.appearance = raw.appearance
      .filter((x: unknown) => typeof x === "string")
      .join("\n")
      .trim() || null;
  } else if (raw.appearance != null && typeof raw.appearance !== "string") {
    raw.appearance = null;
  }

  const parsed = NPCSchema.safeParse(normalizeNpcAiPayload(raw as Record<string, unknown>));
  if (!parsed.success) {
    console.error("NPCSchema validation:", parsed.error.format(), raw);
    throw new Error("Die KI hat ein ungültiges NPC-Format geliefert.");
  }

  const data = parsed.data;
  let suggestedSecret: { title: string; content: string } | null = null;
  if (includeSecret && raw.suggested_secret && typeof raw.suggested_secret === "object") {
    const t = raw.suggested_secret.title;
    const c = raw.suggested_secret.content;
    if (typeof c === "string" && c.trim()) {
      suggestedSecret = { title: typeof t === "string" && t.trim() ? t.trim() : "Geheimnis", content: c.trim() };
    }
  }

  return {
    name: data.name,
    title: data.title ?? null,
    role: data.role ?? null,
    race: data.race ?? null,
    status: data.status,
    alignment: data.alignment,
    description: data.description,
    appearance: data.appearance ?? null,
    personality_traits: data.personality_traits ?? null,
    gm_notes: data.gm_notes ?? null,
    narrative_hooks: data.narrative_hooks ?? null,
    check_results: (data.check_results ?? []).map((r: { type: string; dc: number; result: string; is_critical?: boolean | null }) => ({
      ...r,
      is_critical: r.is_critical ?? false,
    })),
    faction_name_suggestion: data.faction_name_suggestion ?? null,
    current_location_name_suggestion: data.current_location_name_suggestion ?? null,
    true_nature: data.true_nature ?? null,
    hidden_agenda: data.hidden_agenda ?? null,
    secret_entry: data.secret_entry ?? null,
    suggested_secret: suggestedSecret ?? null,
  };
}

/** Legacy-Alias: gleiche Signatur wie bisher (worldId, prompt?). */
export async function generateNPCForWorld(
  worldId: string,
  prompt?: string
): Promise<GeneratedNPCResult> {
  return generateNPC(worldId, { prompt, includeSecret: true });
}

/** Einzelne Sektion neu generieren (Reroll), z.B. "appearance" oder "personality_traits". */
export type RerollSection = "appearance" | "personality_traits" | "description";

export async function regenerateNPCSection(
  worldId: string,
  section: RerollSection,
  currentData: { name?: string; role?: string; description?: string; appearance?: string; personality_traits?: string },
  prompt?: string
): Promise<{ [K in RerollSection]?: string }> {
  const { world, blueprint } = await loadWorldAndAuth(worldId);

  const blueprintContext = await buildBlueprintContext(world.name, blueprint);
  const genre = blueprint?.vibes?.genre ?? "Fantasy";
  const magic = blueprint?.vibes?.magic_prevalence ?? "nicht gesetzt";
  const tech = blueprint?.vibes?.tech_level ?? "nicht gesetzt";
  const currency = blueprint?.life_economy?.currency_name ?? "nicht gesetzt";

  const sectionLabels: Record<RerollSection, string> = {
    appearance: "Aussehen: NUR Stichpunkte (Größe, Haarfarbe, Narben, Kleidung) – keine Fließtexte",
    personality_traits: "Persönlichkeit (Charaktereigenschaften, Verhalten, 2–3 Sätze)",
    description: "Beschreibung: flüssiger Vorlesetext für Spieler, Fokus auf Vibe und Ausstrahlung (2–4 Sätze)",
  };

  const contentHint = section === "appearance"
    ? "Inhalt: NUR Bullet Points (z. B. • Groß, muskulös • Kurzes graues Haar • Narbe über linkem Auge • Dunkelgrüne Wachtuniform). Kein Fließtext."
    : section === "description"
      ? "Inhalt: 2–4 Sätze flüssiger Text zum Vorlesen, Atmosphäre und Ausstrahlung. Keine Stichpunkte."
      : "Inhalt: 2–4 Sätze, Deutsch.";

  const systemPrompt = `Du bist ein kreativer Game Master. Du generierst NUR eine einzelne Sektion für einen NPC in der Welt "${world.name}".
Welt-Vibe: ${genre}. Magie: ${magic}. Tech: ${tech}. Währung: ${currency}

${blueprintContext}

Der NPC heißt "${currentData.name || "Unbenannt"}"${currentData.role ? `, Rolle: ${currentData.role}` : ""}.
Generiere ausschließlich die Sektion: "${sectionLabels[section]}". ${contentHint}

Antworte NUR mit einem JSON-Objekt mit genau einem Feld: "${section}" (String, Deutsch).`;

  const userMessage = (prompt && String(prompt).trim()) ? String(prompt).trim() : `Generiere nur die Sektion "${section}".`;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Keine Antwort von der KI erhalten.");
  const raw = JSON.parse(content);
  const value = raw[section];
  if (typeof value !== "string") throw new Error("Die KI hat keine gültige Sektion geliefert.");
  return { [section]: value } as { [K in RerollSection]?: string };
}

/** KI-Beziehungs-Generator: erfindet eine logische Verbindung zwischen zwei NPCs (z.B. "Ehemalige Rivalen während des [Hauptkonflikts]"). */
export type NPCRelationSuggestion = {
  relationType: string;
  description: string;
};

export async function generateNPCRelation(
  npc1: { id: string; name: string; role?: string | null },
  npc2: { id: string; name: string; role?: string | null },
  worldBlueprint: WorldBlueprint | null
): Promise<NPCRelationSuggestion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const genre = worldBlueprint?.vibes?.genre ?? "Fantasy";
  const magic = worldBlueprint?.vibes?.magic_prevalence ?? "nicht gesetzt";
  const tech = worldBlueprint?.vibes?.tech_level ?? "nicht gesetzt";
  const mainConflict = worldBlueprint?.culture?.main_conflict ?? "nicht definiert";

  const systemPrompt = `Du bist ein kreativer Game Master. Erfinde eine logische, spannende Verbindung zwischen zwei NPCs für eine TTRPG-Welt.
Genre: ${genre}. Magie: ${magic}. Tech: ${tech}. Hauptkonflikt der Welt: ${mainConflict}

NPC 1: "${npc1.name}"${npc1.role ? ` (${npc1.role})` : ""}
NPC 2: "${npc2.name}"${npc2.role ? ` (${npc2.role})` : ""}

Antworte NUR mit einem JSON-Objekt mit genau zwei Feldern (Deutsch):
- "relationType": Kurzer Beziehungstyp (z.B. "Ehemalige Rivalen", "Verbündete", "Meister und Schüler")
- "description": 2–3 Sätze, die die Beziehung erklären und optional in den Hauptkonflikt der Welt einbinden (z.B. "Ehemalige Rivalen während des Krieges um X").`;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Erstelle eine passende Beziehung zwischen diesen beiden NPCs." },
    ],
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Keine Antwort von der KI erhalten.");
  const raw = JSON.parse(content);
  const relationType = typeof raw.relationType === "string" ? raw.relationType.trim() : "Beziehung";
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  return { relationType: relationType || "Beziehung", description: description || "Keine Beschreibung." };
}

/** KI-Beziehungs-Generator für NPC ↔ Fraktion (z.B. „Geheimes Mitglied der Diebesgilde“, „Wird von der Inquisition gesucht“). */
export type NPCFactionRelationSuggestion = {
  relationType: string;
  description: string;
};

export async function generateNPCFactionRelation(
  npc: { id: string; name: string; role?: string | null },
  faction: { id: string; name: string; type?: string | null },
  worldBlueprint: WorldBlueprint | null
): Promise<NPCFactionRelationSuggestion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const genre = worldBlueprint?.vibes?.genre ?? "Fantasy";
  const magic = worldBlueprint?.vibes?.magic_prevalence ?? "nicht gesetzt";
  const tech = worldBlueprint?.vibes?.tech_level ?? "nicht gesetzt";
  const mainConflict = worldBlueprint?.culture?.main_conflict ?? "nicht definiert";

  const systemPrompt = `Du bist ein kreativer Game Master. Erfinde eine logische, spannende Verbindung zwischen einem NPC und einer Fraktion.
Genre: ${genre}. Magie: ${magic}. Tech: ${tech}. Hauptkonflikt der Welt: ${mainConflict}

NPC: "${npc.name}"${npc.role ? ` (${npc.role})` : ""}
Fraktion: "${faction.name}"${faction.type ? ` (${faction.type})` : ""}

Beispiele für Beziehungstypen: "Geheimes Mitglied der Diebesgilde", "Wird von der Inquisition gejagt", "Informant der Stadtwache", "Verhasster Verräter", "Protegé des Ordens".

Antworte NUR mit einem JSON-Objekt mit genau zwei Feldern (Deutsch):
- "relationType": Kurzer Beziehungstyp (z.B. "Geheimes Mitglied der Diebesgilde", "Gesuchter Ketzer")
- "description": 2–3 Sätze, die erklären, wie der NPC und die Fraktion zueinander stehen und idealerweise den Hauptkonflikt der Welt einbinden.`;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Erstelle eine passende Beziehung zwischen diesem NPC und dieser Fraktion." },
    ],
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Keine Antwort von der KI erhalten.");
  const raw = JSON.parse(content);
  const relationType = typeof raw.relationType === "string" ? raw.relationType.trim() : "Beziehung";
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  return { relationType: relationType || "Beziehung", description: description || "Keine Beschreibung." };
}

// ============================================================================
// Recursive Worldbuilding: Briefing → Entity Discovery & Mapping
// ============================================================================

export type BriefingMapping = {
  mention: string;
  entity_type: "location" | "faction" | "npc";
  existing_id: string | null;
  existing_name: string | null;
};

export type BriefingNewEntity = {
  type: "location" | "faction" | "npc";
  proposed_name: string;
  description: string;
};

export type ProcessBriefingResult = {
  mappings: BriefingMapping[];
  new_entities: BriefingNewEntity[];
  summary: string;
};

/**
 * Step 1 des Narrative NPC Wizards: Briefing analysieren, Entitäten erkennen,
 * mit bestehenden Orten/Fraktionen mappen, neue Entitäten als [NEW_ENTITY] markieren.
 * Nutzt WorldBlueprint als System-Kontext.
 * @param currentNpcName Name des NPCs, der gerade erstellt wird – dieser darf NICHT in new_entities als Vorschlag erscheinen.
 */
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

  const completion = await getOpenAI().chat.completions.create({
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

  const response = await getOpenAI().images.generate({
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
