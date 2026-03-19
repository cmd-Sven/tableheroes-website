"use server";

import OpenAI from "openai";
import { createClient } from "@/src/lib/supabase/server";
import type { WorldBlueprint } from "@/src/types/world";
import { buildBlueprintContext } from "./world-npc-actions";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type GeneratedLocationResult = {
  name: string;
  description: string;
  gm_notes: string | null;
};

type LoadWorldResult = {
  world: { id: string; name: string; gm_id?: string; blueprint?: WorldBlueprint | null };
  blueprint: WorldBlueprint | null;
};

async function loadWorldAndAuth(worldId: string): Promise<LoadWorldResult> {
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
    throw new Error("Nur Spielleiter können Orte per KI generieren.");
  }

  const { data: worldRaw, error } = await (supabase.from("worlds") as any)
    .select("id, name, gm_id, blueprint")
    .eq("id", worldId)
    .single();

  if (error || !worldRaw) throw new Error("Welt nicht gefunden.");

  const world = worldRaw as {
    id: string;
    name: string;
    gm_id?: string;
    blueprint?: WorldBlueprint | null;
  };
  if (world.gm_id !== user.id) throw new Error("Keine Berechtigung für diese Welt.");

  return { world, blueprint: (world.blueprint as WorldBlueprint) ?? null };
}

/**
 * Generiert eine Orts-Beschreibung aus dem GM-Briefing.
 * Die description ist spielerfreundlich (was Spieler beim Betreten sehen),
 * gm_notes sind interne Notizen für den GM.
 */
export async function generateLocationFromBriefing(
  worldId: string,
  options: {
    type: string;
    parentName?: string | null;
    briefing: string;
  }
): Promise<GeneratedLocationResult> {
  const { world, blueprint } = await loadWorldAndAuth(worldId);
  const blueprintContext = await buildBlueprintContext(world.name, blueprint);

  const genre = blueprint?.vibes?.genre ?? "Fantasy";
  const tech = blueprint?.vibes?.tech_level ?? "nicht gesetzt";
  const parentHint = options.parentName
    ? ` Der Ort liegt in / gehört zu: ${options.parentName}.`
    : "";

  const systemPrompt = `Du bist ein kreativer Game Master. Erstelle einen Ort für die Welt "${world.name}".

Orts-Typ: ${options.type}
Welt-Vibe: ${genre}. Tech-Level: ${tech}.${parentHint}

${blueprintContext}

AUFGABE:
1. name: Ein prägnanter, passender Name für den Ort.
2. description: Eine ATMOSPHÄRISCHE Beschreibung für SPIELER – was sie sehen und erleben, wenn sie den Ort betreten. Flüssiger Einleitungstext (2–5 Sätze), KEINE Stichpunkte. Fokus auf Atmosphäre, Gerüche, Geräusche, erste Eindrücke.
3. gm_notes: Optionale interne GM-Notizen (z.B. versteckte Details, Plot-Hinweise). Kann null sein.

Antworte NUR mit einem JSON-Objekt: { "name": "string", "description": "string", "gm_notes": "string | null" }`;

  const userMessage = (options.briefing || "").trim()
    ? options.briefing.trim()
    : `Beschreibe einen ${options.type} in der Welt ${world.name}.`;

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
  const raw = JSON.parse(content);

  return {
    name: typeof raw.name === "string" ? raw.name.trim() : "Unbenannter Ort",
    description: typeof raw.description === "string" ? raw.description.trim() : "",
    gm_notes:
      raw.gm_notes != null && typeof raw.gm_notes === "string" && raw.gm_notes.trim()
        ? raw.gm_notes.trim()
        : null,
  };
}

// ============================================================================
// NPCs & Factions by Location (für World Lore Detail - GM-Sektionen)
// ============================================================================
export async function getNPCsByLocationForWorld(worldId: string, locationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { residents: [], guests: [] };

  const { data: world } = await (supabase.from("worlds") as any)
    .select("id, gm_id")
    .eq("id", worldId)
    .single();
  if (!world || (world as { gm_id: string }).gm_id !== user.id) return { residents: [], guests: [] };

  const [residentsRes, guestsRes] = await Promise.all([
    (supabase.from("npcs") as any)
      .select("id, name, image_url, role, status")
      .eq("world_id", worldId)
      .eq("home_location_id", locationId),
    (supabase.from("npcs") as any)
      .select("id, name, image_url, role, status")
      .eq("world_id", worldId)
      .eq("current_location_id", locationId)
      .neq("home_location_id", locationId),
  ]);

  return {
    residents: residentsRes.data ?? [],
    guests: guestsRes.data ?? [],
  };
}

export async function getFactionsByLocationId(worldId: string, locationId: string) {
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

  const { data: factions, error } = await (supabase.from("factions") as any)
    .select("id, name, type, description, image_url")
    .eq("world_id", worldId)
    .eq("hq_location_id", locationId)
    .order("name", { ascending: true });

  if (error) {
    console.error("getFactionsByLocationId Error:", error);
    return [];
  }
  return factions ?? [];
}
