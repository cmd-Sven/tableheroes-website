"use server";

import OpenAI from "openai";
import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { buildBlueprintContext, loadWorldAndAuth } from "@/src/app/dashboard/worlds/world-npc-actions";
import type { WorldBlueprint } from "@/src/types/world";
import {
  normalizeBeastCheckResults,
  type BeastCheckResult,
} from "@/src/lib/beast-check-results";
import { resolveNpcPortraitMetaForServer } from "@/src/lib/npc-portrait-meta";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type BestariumAttack = {
  name: string;
  attack_bonus: number | null;
  damage_notation: string;
  damage_type?: string | null;
  range?: string | null;
  notes?: string | null;
};

export type GeneratedBeastResult = {
  name: string;
  game_system: string;
  size_category: string | null;
  creature_type: string | null;
  subtype: string | null;
  alignment: string | null;
  armor_class: number | null;
  hit_points: number | null;
  hit_dice: string | null;
  damage_vulnerabilities: string | null;
  damage_resistances: string | null;
  damage_immunities: string | null;
  condition_immunities: string | null;
  ability_str: number | null;
  ability_dex: number | null;
  ability_con: number | null;
  ability_int: number | null;
  ability_wis: number | null;
  ability_cha: number | null;
  multiattack_notes: string | null;
  attacks: BestariumAttack[];
  special_abilities: string | null;
  legendary_actions: string | null;
  lair_actions: string | null;
  challenge_rating: number | null;
  xp_awarded: number | null;
  senses: string | null;
  languages: string | null;
  passive_traits: string | null;
  physical_description: string | null;
  /** Nur für Spieler:innen (bei Freigabe), ohne Statblock – Gerüchte, Volksmund, allgemeines Wissen. */
  player_knowledge: string | null;
  lore_notes: string | null;
  check_results?: BeastCheckResult[] | null;
  known_loot?: string | null;
  lifestyle_habitat?: string | null;
  image_is_ai_generated?: boolean | null;
  image_upload_rights_confirmed?: boolean | null;
};

export type BestariumCreatureRow = GeneratedBeastResult & {
  id: string;
  world_id: string;
  location_id: string | null;
  lore_id: string | null;
  image_url: string | null;
  image_display: unknown;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function truncateText(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Lädt world_lore für den Ortskontext (Vorkommen). */
async function fetchWorldLoreSnippet(
  supabase: SupabaseServer,
  worldId: string,
  loreId: string
): Promise<{ name: string; type: string | null; description: string | null; gm_notes: string | null }> {
  const { data, error } = await (supabase.from("world_lore") as any)
    .select("id, world_id, name, type, description, gm_notes")
    .eq("id", loreId)
    .maybeSingle();

  if (error || !data || (data as { world_id: string }).world_id !== worldId) {
    throw new Error("Vorkommen nicht gefunden oder gehört nicht zu dieser Welt.");
  }

  const row = data as {
    name?: string | null;
    type?: string | null;
    description?: string | null;
    gm_notes?: string | null;
  };

  return {
    name: String(row.name ?? "Unbenannt"),
    type: row.type != null ? String(row.type) : null,
    description: row.description != null ? String(row.description) : null,
    gm_notes: row.gm_notes != null ? String(row.gm_notes) : null,
  };
}

function formatHabitatBlock(title: string, row: Awaited<ReturnType<typeof fetchWorldLoreSnippet>>): string {
  const parts = [
    title,
    `Name: ${row.name}`,
    row.type ? `Typ: ${row.type}` : null,
    row.description ? `Beschreibung:\n${truncateText(row.description, 2800)}` : null,
    row.gm_notes ? `GM-Notizen:\n${truncateText(row.gm_notes, 1600)}` : null,
  ].filter(Boolean);
  return parts.join("\n\n");
}

function parseAttacks(raw: unknown): BestariumAttack[] {
  if (!Array.isArray(raw)) return [];
  const out: BestariumAttack[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = strOrNull(o.name);
    if (!name) continue;
    out.push({
      name,
      attack_bonus: numOrNull(o.attack_bonus),
      damage_notation: strOrNull(o.damage_notation) ?? "",
      damage_type: strOrNull(o.damage_type),
      range: strOrNull(o.range),
      notes: strOrNull(o.notes),
    });
  }
  return out;
}

function normalizeGeneratedBeast(raw: Record<string, unknown>): GeneratedBeastResult {
  const name = strOrNull(raw.name);
  if (!name) throw new Error("Die KI hat keinen Namen geliefert.");

  return {
    name,
    game_system: strOrNull(raw.game_system) ?? "dnd5e",
    size_category: strOrNull(raw.size_category),
    creature_type: strOrNull(raw.creature_type),
    subtype: strOrNull(raw.subtype),
    alignment: strOrNull(raw.alignment),
    armor_class: numOrNull(raw.armor_class),
    hit_points: numOrNull(raw.hit_points),
    hit_dice: strOrNull(raw.hit_dice),
    damage_vulnerabilities: strOrNull(raw.damage_vulnerabilities),
    damage_resistances: strOrNull(raw.damage_resistances),
    damage_immunities: strOrNull(raw.damage_immunities),
    condition_immunities: strOrNull(raw.condition_immunities),
    ability_str: numOrNull(raw.ability_str ?? raw.str),
    ability_dex: numOrNull(raw.ability_dex ?? raw.dex),
    ability_con: numOrNull(raw.ability_con ?? raw.con),
    ability_int: numOrNull(raw.ability_int ?? raw.int),
    ability_wis: numOrNull(raw.ability_wis ?? raw.wis),
    ability_cha: numOrNull(raw.ability_cha ?? raw.cha),
    multiattack_notes: strOrNull(raw.multiattack_notes),
    attacks: parseAttacks(raw.attacks),
    special_abilities: strOrNull(raw.special_abilities),
    legendary_actions: strOrNull(raw.legendary_actions),
    lair_actions: strOrNull(raw.lair_actions),
    challenge_rating: numOrNull(raw.challenge_rating),
    xp_awarded: numOrNull(raw.xp_awarded),
    senses: strOrNull(raw.senses),
    languages: strOrNull(raw.languages),
    passive_traits: strOrNull(raw.passive_traits),
    physical_description: strOrNull(raw.physical_description),
    player_knowledge: strOrNull(raw.player_knowledge),
    lore_notes: strOrNull(raw.lore_notes),
    check_results: normalizeBeastCheckResults(raw.check_results),
    known_loot: strOrNull(raw.known_loot),
    lifestyle_habitat: strOrNull(raw.lifestyle_habitat),
  };
}

export async function getBestariumByWorld(worldId: string): Promise<BestariumCreatureRow[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("bestarium_creatures") as any)
    .select("*")
    .eq("world_id", worldId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[getBestariumByWorld]", error);
    return [];
  }
  return (data || []) as BestariumCreatureRow[];
}

export async function getBestariumCreatureById(creatureId: string): Promise<BestariumCreatureRow | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("bestarium_creatures") as any)
    .select("*")
    .eq("id", creatureId)
    .maybeSingle();

  if (error || !data) return null;
  return data as BestariumCreatureRow;
}

export type SaveBestariumInput = GeneratedBeastResult & {
  world_id: string;
  location_id?: string | null;
  lore_id?: string | null;
  image_url?: string | null;
  image_display?: unknown;
  image_is_ai_generated?: boolean | null;
  image_upload_rights_confirmed?: boolean | null;
  sort_order?: number;
};

function toRowPayload(input: SaveBestariumInput, userId: string) {
  const imageUrl = (input.image_url || "").trim();
  const portraitMeta = resolveNpcPortraitMetaForServer(userId, {
    imageUrl,
    portraitIsAiGenerated: input.image_is_ai_generated === true,
    uploadRightsConfirmed: input.image_upload_rights_confirmed,
  });

  if (
    imageUrl &&
    !portraitMeta.image_is_ai_generated &&
    portraitMeta.image_upload_rights_confirmed !== true
  ) {
    throw new Error(
      "Bitte bestätige die Nutzungsrechte am Bild oder kennzeichne es als KI-generiert.",
    );
  }

  return {
    world_id: input.world_id,
    game_system: input.game_system || "dnd5e",
    name: input.name,
    size_category: input.size_category,
    creature_type: input.creature_type,
    subtype: input.subtype,
    alignment: input.alignment,
    armor_class: input.armor_class,
    hit_points: input.hit_points,
    hit_dice: input.hit_dice,
    damage_vulnerabilities: input.damage_vulnerabilities,
    damage_resistances: input.damage_resistances,
    damage_immunities: input.damage_immunities,
    condition_immunities: input.condition_immunities,
    ability_str: input.ability_str,
    ability_dex: input.ability_dex,
    ability_con: input.ability_con,
    ability_int: input.ability_int,
    ability_wis: input.ability_wis,
    ability_cha: input.ability_cha,
    multiattack_notes: input.multiattack_notes,
    attacks: input.attacks,
    special_abilities: input.special_abilities,
    legendary_actions: input.legendary_actions,
    lair_actions: input.lair_actions,
    challenge_rating: input.challenge_rating,
    xp_awarded: input.xp_awarded,
    senses: input.senses,
    languages: input.languages,
    passive_traits: input.passive_traits,
    physical_description: input.physical_description,
    player_knowledge: input.player_knowledge,
    lore_notes: input.lore_notes,
    location_id: input.location_id ?? null,
    lore_id: input.lore_id ?? null,
    image_url: imageUrl || null,
    image_display: input.image_display ?? null,
    image_is_ai_generated: portraitMeta.image_is_ai_generated,
    image_upload_rights_confirmed: portraitMeta.image_upload_rights_confirmed,
    check_results:
      input.check_results && input.check_results.length > 0 ? input.check_results : null,
    known_loot: input.known_loot ?? null,
    lifestyle_habitat: input.lifestyle_habitat ?? null,
    sort_order: input.sort_order ?? 0,
  };
}

async function assertGmWorld(supabase: Awaited<ReturnType<typeof createClient>>, worldId: string, userId: string) {
  const { data: world } = await (supabase.from("worlds") as any)
    .select("id, gm_id")
    .eq("id", worldId)
    .single();
  if (!world || (world as { gm_id: string }).gm_id !== userId) {
    throw new Error("Keine Berechtigung für diese Welt.");
  }
}

async function validateLocationAndLore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  worldId: string,
  locationId: string | null | undefined,
  loreId: string | null | undefined
) {
  if (locationId) {
    const { data: loc } = await (supabase.from("locations") as any)
      .select("id, world_id")
      .eq("id", locationId)
      .maybeSingle();
    if (!loc || (loc as { world_id: string }).world_id !== worldId) {
      throw new Error("Ungültiger Ort für diese Welt.");
    }
  }
  if (loreId) {
    const { data: lore } = await (supabase.from("world_lore") as any)
      .select("id, world_id")
      .eq("id", loreId)
      .maybeSingle();
    if (!lore || (lore as { world_id: string }).world_id !== worldId) {
      throw new Error("Ungültiger Lore-Eintrag für diese Welt.");
    }
  }
}

export async function createBestariumCreature(input: SaveBestariumInput): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  await assertGmWorld(supabase, input.world_id, user.id);
  await validateLocationAndLore(supabase, input.world_id, input.location_id, input.lore_id);

  const payload = toRowPayload(input, user.id);
  const { data, error } = await (supabase.from("bestarium_creatures") as any)
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createBestariumCreature]", error);
    throw new Error(error?.message || "Speichern fehlgeschlagen.");
  }

  revalidatePath(`/dashboard/worlds/${input.world_id}/bestarium`);
  return { id: (data as { id: string }).id };
}

export async function updateBestariumCreature(
  creatureId: string,
  input: Omit<SaveBestariumInput, "world_id"> & { world_id: string }
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  await assertGmWorld(supabase, input.world_id, user.id);
  await validateLocationAndLore(supabase, input.world_id, input.location_id, input.lore_id);

  const existing = await getBestariumCreatureById(creatureId);
  if (!existing || existing.world_id !== input.world_id) {
    throw new Error("Kreatur nicht gefunden.");
  }

  const payload = toRowPayload({ ...input, world_id: input.world_id }, user.id);

  const { error } = await (supabase.from("bestarium_creatures") as any)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", creatureId);

  if (error) {
    console.error("[updateBestariumCreature]", error);
    throw new Error(error.message || "Aktualisieren fehlgeschlagen.");
  }

  revalidatePath(`/dashboard/worlds/${input.world_id}/bestarium`);
  revalidatePath(`/dashboard/worlds/${input.world_id}/bestarium/${creatureId}`);
}

export async function deleteBestariumCreature(creatureId: string, worldId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  await assertGmWorld(supabase, worldId, user.id);

  const { error } = await (supabase.from("bestarium_creatures") as any)
    .delete()
    .eq("id", creatureId)
    .eq("world_id", worldId);

  if (error) {
    console.error("[deleteBestariumCreature]", error);
    throw new Error(error.message || "Löschen fehlgeschlagen.");
  }

  revalidatePath(`/dashboard/worlds/${worldId}/bestarium`);
}

export type GenerateBeastOptions = {
  briefing?: string;
  /** Verbindliches Ziel-CR; Attribute, RK, TP und Schaden sollen dazu passen. */
  targetCr: number;
  /** world_lore.id des Vorkommens – Pflicht, liefert Ortskontext für Ökologie und Texte. */
  habitatLoreId: string;
  /** Optional: weiterer Lore-Eintrag (z. B. Fraktion, Legende) als zusätzlicher Kontext. */
  contextLoreId?: string | null;
};

export async function generateBeastForWorld(worldId: string, options: GenerateBeastOptions): Promise<GeneratedBeastResult> {
  const briefing = (options.briefing && String(options.briefing).trim()) || "";
  const targetCr = options.targetCr;
  const habitatLoreId = (options.habitatLoreId && String(options.habitatLoreId).trim()) || "";
  const contextLoreId = options.contextLoreId ? String(options.contextLoreId).trim() : "";

  if (!habitatLoreId) {
    throw new Error("Bitte wähle ein Vorkommen (Ort) aus – die KI braucht den Ortskontext.");
  }
  if (!Number.isFinite(targetCr) || targetCr < 0) {
    throw new Error("Bitte gib einen gültigen Ziel-Schwierigkeitsgrad (CR) an.");
  }

  const { world, blueprint } = await loadWorldAndAuth(worldId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: profileRaw } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { primary_role?: string } | null;
  if (profile?.primary_role !== "GameMaster" && profile?.primary_role !== "Admin") {
    throw new Error("Nur Spielleiter können Kreaturen per KI generieren.");
  }

  const habitatRow = await fetchWorldLoreSnippet(supabase, worldId, habitatLoreId);
  const habitatBlock = formatHabitatBlock(
    "=== VORKOMMEN / HABITAT (verbindlich: Ökologie, Stimmung, Begegnung) ===",
    habitatRow
  );

  let extraLoreBlock = "";
  if (contextLoreId && contextLoreId !== habitatLoreId) {
    const ctxRow = await fetchWorldLoreSnippet(supabase, worldId, contextLoreId);
    extraLoreBlock =
      "\n\n" +
      formatHabitatBlock("=== ZUSÄTZLICHER WELT- / LORE-KONTEXT (einbeziehen, wenn passend) ===", ctxRow);
  }

  const blueprintContext = await buildBlueprintContext(world.name, blueprint as WorldBlueprint | null);
  const genre = blueprint?.vibes?.genre ?? "Fantasy";
  const magic = blueprint?.vibes?.magic_prevalence ?? "nicht gesetzt";

  const crGuidelines = `SCHWIERIGKEIT (CR) – VERBINDLICH:
- Ziel-CR: ${targetCr}. Setze challenge_rating auf den nächstliegenden gültigen D&D-5e-CR (0, 0.125, 0.25, 0.5, 1, 2, …) und xp_awarded exakt laut offizieller XP-Tabelle zu diesem CR.
- RK, Trefferpunkte, Trefferwürfel, Angriffsbonus, Schaden und alle ability_* müssen zu diesem CR passen (kein CR-1-Monster mit Legendär-Werten).
- Richtwerte (anpassen an Kreaturform): CR 0–2: Attribute meist 6–14, RK oft 11–15; CR 3–7: oft 14–18, RK 14–17; CR 8–12: stärker, RK 16–19; CR 13+: bis zu sehr hohen Werten bei Bossen.
- Nutze den Proficiency-Ansatz von Monstern in 5e: Angriffsbonus und Rettungswürfe sollen zum CR stimmig sein.`;

  const descriptionRules = `BESCHREIBUNG (Deutsch):
- physical_description: Mindestens 4–6 Sätze flüssiges Deutsch für die Spielrunde – Aussehen, Bewegung, Licht, Geräusche, Geruch, wie sich die Kreatur im genannten VORKOMMEN ausnimmt (Bezug zum Ort). Keine Spielwerte nennen.
- player_knowledge: 2–5 Sätze Deutsch – was Charaktere in der Welt üblicherweise über diese Kreatur wissen oder erzählen (Gerüchte, Volksmund, Reisenden‑Weisheiten). Keine RK/TP/CR/Attribute; nichts, was nur der GM wissen soll.
- lore_notes: 3–5 Sätze nur für den GM: Rolle am Ort, Verhalten, mögliche Hooks, wie sie zur Welt passt (Blueprint + Vorkommen).
- known_loot: 1–3 Sätze – was Jäger, Alchemisten oder Handwerker an der Kreatur interessant finden (ohne exakte Spielwerte).
- lifestyle_habitat: 2–4 Sätze – Lebensweise, Jagdverhalten, Tagesrhythmus, typischer Lebensraum (Deutsch).
- check_results: Array für Spieler-Proben. Pro Eintrag: type (genau einer von: "Monsterkategorie", "Schwächen", "Immunität", "Besondere Fähigkeit", "Loot", "Lebensweise"), skill (deutsche D&D-Fertigkeit, z. B. Naturkunde, Arkane Kunde, Wahrnehmung, Überleben), dc (10–22), result (was der Spieler bei Erfolg erfährt – KEINE RK/TP/CR; Schwächen/Immunitäten in Fließtext ohne Mechanik-Werte), is_critical (optional). Mindestens je einen Eintrag für Monsterkategorie, Schwächen, Immunität, Besondere Fähigkeit, Loot, Lebensweise.`;

  const systemPrompt = `Du bist ein erfahrener D&D 5e Game Designer. Erstelle eine MONSTER- oder BEAST-Statblock-Datenstruktur für die Fantasy-Welt "${world.name}".
Genre: ${genre}. Magie-Level: ${magic}.

${blueprintContext}

${habitatBlock}
${extraLoreBlock}

REGELN (D&D 5e, offizielle Logik):
- Größe (size_category): exakt eine von: Tiny, Small, Medium, Large, Huge, Gargantuan (englische D&D-Begriffe).
- creature_type: englischer D&D-Typ, z. B. beast, monstrosity, undead, construct, elemental, aberration, fiend, celestial, dragon, humanoid, ooze, plant.
- alignment: z. B. chaotic evil, lawful neutral, unaligned (englisch, kleingeschrieben).
- RK (armor_class), TP (hit_points), hit_dice (z. B. "8d10+16") müssen zusammenpassen.
- challenge_rating und xp_awarded: gültige D&D-5e-Kombination.
- attacks: Array von Angriffen. Jedes Objekt: name, attack_bonus (integer), damage_notation (englische Würfelnotation, z. B. "2d6+4"), damage_type (z. B. slashing), range (z. B. "5 ft." oder "60 ft."), notes (optional).
- ability_*: Ganzzahlen 1–30; MÜSSEN zum gewählten CR passen (siehe CR-Richtlinien).
- Alle beschreibenden Fließtexte (special_abilities, passive_traits, physical_description, lore_notes, multiattack_notes, legendary_actions, lair_actions, senses, languages): auf DEUTSCH.
- game_system immer "dnd5e".

${crGuidelines}

${descriptionRules}

Antworte NUR mit einem JSON-Objekt. Pflichtfelder:
name, game_system, size_category, creature_type, subtype (oder null), alignment,
armor_class, hit_points, hit_dice,
damage_vulnerabilities, damage_resistances, damage_immunities, condition_immunities (leerer String wenn nichts),
ability_str, ability_dex, ability_con, ability_int, ability_wis, ability_cha,
multiattack_notes (String, leer wenn kein Multiattack),
attacks (Array),
special_abilities, legendary_actions, lair_actions (String, leer wenn nicht zutreffend),
challenge_rating, xp_awarded,
senses, languages, passive_traits,
physical_description, player_knowledge, lore_notes,
known_loot, lifestyle_habitat,
check_results (Array wie oben beschrieben)`;

  const userMessage =
    briefing.length > 0
      ? `Zusätzliche Wünsche / Ideen des GMs:\n${briefing}`
      : "Erfinde eine passende Kreatur, die sich aus dem VORKOMMEN und dem Weltenkontext ergibt.";

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
  return normalizeGeneratedBeast(raw);
}
