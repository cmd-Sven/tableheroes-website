"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import type { WorldBlueprint } from "@/src/types/world";

/**
 * Server Actions für World Management (welt-zentrisch).
 * Welten haben gm_id; Kampagnen referenzieren eine Welt über world_id.
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Get World by Campaign (campaign.world_id -> worlds.id)
// ============================================================================
export async function getWorldByCampaign(campaignId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, world_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string; world_id: string | null } | null;
  if (!campaign) throw new Error("Kampagne nicht gefunden.");

  const { data: membership } = await (supabase.from("campaign_members") as any)
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (campaign.gm_id !== user.id && !membership) {
    throw new Error("Kein Zugriff auf diese Kampagne.");
  }

  if (!campaign.world_id) return null;

  const { data: world, error } = await (supabase.from("worlds") as any)
    .select("*")
    .eq("id", campaign.world_id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("Get World Error:", error);
    throw new Error(error.message);
  }
  return world;
}

// ============================================================================
// Get Worlds by GM (für Dropdowns / Welten-Verwaltung)
// ============================================================================
export async function getWorldsByGm(userId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("worlds") as any)
    .select("id, name, description")
    .eq("gm_id", userId)
    .order("name", { ascending: true });
  if (error) {
    console.error("Get Worlds By GM Error:", error);
    return [];
  }
  return (data || []) as { id: string; name: string; description: string | null }[];
}

// ============================================================================
// Assign World to Campaign (GM only; Kampagne hatte keine world_id)
// ============================================================================
export async function assignWorldToCampaign(campaignId: string, worldId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();
  const campaign = campaignRaw as { id: string; gm_id: string } | null;
  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann die Welt der Kampagne zuweisen.");
  }

  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("id, gm_id")
    .eq("id", worldId)
    .single();
  const world = worldRaw as { id: string; gm_id: string } | null;
  if (!world || world.gm_id !== user.id) {
    throw new Error("Welt nicht gefunden oder keine Berechtigung.");
  }

  const { error } = await (supabase.from("campaigns") as any)
    .update({ world_id: worldId })
    .eq("id", campaignId);

  if (error) {
    console.error("Assign World To Campaign Error:", error);
    throw new Error(error.message || "Zuweisung fehlgeschlagen.");
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard/worlds");
}

// ============================================================================
// Generate Blueprint Proposal (Vibes / Physics / Culture) via KI
// ============================================================================
export async function generateBlueprintProposal(
  worldId: string,
  section: "vibes" | "physics" | "culture" | "life_economy",
): Promise<
  Array<
    | WorldBlueprint["vibes"]
    | WorldBlueprint["physics"]
    | WorldBlueprint["culture"]
    | WorldBlueprint["life_economy"]
  >
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: worldRaw, error } = await (supabase.from("worlds") as any)
    .select("name, description, gm_id, blueprint")
    .eq("id", worldId)
    .single();

  if (error || !worldRaw) {
    console.error("generateBlueprintProposal: Welt nicht gefunden oder Fehler:", error);
    throw new Error("Welt nicht gefunden.");
  }

  const world = worldRaw as {
    name: string;
    description: string | null;
    gm_id?: string;
blueprint?: WorldBlueprint | null;
};
  const isOwner = world.gm_id === user.id;
  if (!isOwner) {
    throw new Error("Keine Berechtigung für KI-Vorschläge zu dieser Welt.");
  }

  const baseContext = `
WELT KONTEXT:
- Name: ${world.name}
- Beschreibung: ${world.description || "Keine Beschreibung hinterlegt."}

AKTUELLER BLUEPRINT (falls gesetzt):
${JSON.stringify(world.blueprint ?? {}, null, 2)}
`;

  let sectionInstructions = "";
  let schemaDescription = "";

  if (section === "vibes") {
    sectionInstructions = `
Erstelle 3 konsistente Vorschläge für die \"Vibes\" dieser Welt:
- genre (z.B. High Fantasy, Dark Fantasy, Sci-Fi, Steampunk, Postapokalypse, Heroic Fantasy, Low Fantasy)
- tech_level (von Steinzeit bis Interstellar)
- magic_prevalence (z.B. \"Keine Magie\", \"Selten\", \"Alltäglich\", \"Überall präsent\", \"Instabil / Chaotisch\").

Alle Vorschläge müssen zur bestehenden Beschreibung und ggf. zum Blueprint passen.`;
    schemaDescription = `
{
  "options": [
    { "genre": "string", "tech_level": "string", "magic_prevalence": "string" },
    { "genre": "string", "tech_level": "string", "magic_prevalence": "string" },
    { "genre": "string", "tech_level": "string", "magic_prevalence": "string" }
  ]
}`;
  } else if (section === "physics") {
    sectionInstructions = `
Erstelle 3 Vorschläge für Physik & Kosmologie:
- shape (z.B. Kugel, Scheibe, Fragmentiert, Schwebende Inseln, Unbekannt / Bizarre Kosmologie)
- sky_details (1–3 Sätze zu Himmel, Monden, Zeitrechnung, besonderen Phänomenen).`;
    schemaDescription = `
{
  "options": [
    { "shape": "string", "sky_details": "string" },
    { "shape": "string", "sky_details": "string" },
    { "shape": "string", "sky_details": "string" }
  ]
}`;
  } else if (section === "culture") {
    sectionInstructions = `
Erstelle 3 Vorschläge für das kulturelle Gefüge:
- religion_type (z.B. Pantheon, Monotheismus, Dualismus, Ahnenkult, Animismus, Säkular)
- language_base (z.B. Eigenständig, Angelehnt an Deutsch/Englisch/Latein/Nordisch/Ostasiatisch)
- main_conflict (1 Satz, der den zentralen Konflikt der Welt auf den Punkt bringt).`;
    schemaDescription = `
{
  "options": [
    { "religion_type": "string", "language_base": "string", "main_conflict": "string" },
    { "religion_type": "string", "language_base": "string", "main_conflict": "string" },
    { "religion_type": "string", "language_base": "string", "main_conflict": "string" }
  ]
}`;
  } else {
    sectionInstructions = `
Erstelle 3 Vorschläge für Alltag & Wirtschaft:
- holidays_summary: 1–3 Sätze, die typische Feste / Feiertage und ihren Ton beschreiben.
- calendar_months: Liste der Monatsnamen (kommagetrennt oder je Zeile), die zur Welt passen.
- month_origin: 1–2 Sätze, wie die Monatsnamen entstanden sind (z.B. nach Göttern, Helden, Ereignissen).
- currency_name: Name der gebräuchlichsten Währung.
- currency_details: 1–3 Sätze zu Material, Wertstufen, gesellschaftlicher Bedeutung.

SPEZIALFALL PANTHEON:
- Falls im Blueprint der Religions-Typ \"Pantheon\" ist, sollen die Monatsnamen möglichst von Göttern, heiligen Aspekten oder Festen dieses Pantheons inspiriert sein.`;
    schemaDescription = `
{
  "options": [
    {
      "holidays_summary": "string",
      "calendar_months": "string",
      "month_origin": "string",
      "currency_name": "string",
      "currency_details": "string"
    },
    {
      "holidays_summary": "string",
      "calendar_months": "string",
      "month_origin": "string",
      "currency_name": "string",
      "currency_details": "string"
    },
    {
      "holidays_summary": "string",
      "calendar_months": "string",
      "month_origin": "string",
      "currency_name": "string",
      "currency_details": "string"
    }
  ]
}`;
  }

  const systemPrompt = `
Du bist ein erfahrener Worldbuilding-Co-GM.
Du hilfst dabei, den Welt-Blueprint für ein TTRPG-Setting zu verfeinern.

${baseContext}

${sectionInstructions}

WICHTIG:
- Antworte NUR mit gültigem JSON-Objekt.
- Es MUSS dem folgenden Schema entsprechen:
${schemaDescription}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Erstelle die drei Vorschläge jetzt." },
    ],
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error("Keine Antwort von der KI erhalten.");
  }

  const parsed = JSON.parse(content);
  if (!parsed.options || !Array.isArray(parsed.options)) {
    throw new Error("Ungültiges Antwortformat der KI (erwartet: { options: [...] }).");
  }

  return parsed.options;
}

// ============================================================================
// Generate Blueprint Proposal for NEW World (no worldId yet; nur Name + optionaler Blueprint)
// ============================================================================
export async function generateBlueprintProposalForNewWorld(
  worldName: string,
  section: "vibes" | "physics" | "culture" | "life_economy",
  currentBlueprint?: WorldBlueprint | null,
): Promise<
  Array<
    | WorldBlueprint["vibes"]
    | WorldBlueprint["physics"]
    | WorldBlueprint["culture"]
    | WorldBlueprint["life_economy"]
  >
> {
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
    throw new Error("Nur Spielleiter können KI-Vorschläge nutzen.");
  }

  const baseContext = `
WELT KONTEXT (Neue Welt – noch nicht gespeichert):
- Name: ${worldName}

AKTUELLER BLUEPRINT (falls bereits ausgefüllt):
${JSON.stringify(currentBlueprint ?? {}, null, 2)}
`;

  let sectionInstructions = "";
  let schemaDescription = "";

  if (section === "vibes") {
    sectionInstructions = `
Erstelle 3 konsistente Vorschläge für die \"Vibes\" dieser Welt:
- genre (z.B. High Fantasy, Dark Fantasy, Sci-Fi, Steampunk, Postapokalypse, Heroic Fantasy, Low Fantasy)
- tech_level (von Steinzeit bis Interstellar)
- magic_prevalence (z.B. \"Keine Magie\", \"Selten\", \"Alltäglich\", \"Überall präsent\", \"Instabil / Chaotisch\").

Alle Vorschläge müssen zum Weltnamen und ggf. zum Blueprint passen.`;
    schemaDescription = `
{
  "options": [
    { "genre": "string", "tech_level": "string", "magic_prevalence": "string" },
    { "genre": "string", "tech_level": "string", "magic_prevalence": "string" },
    { "genre": "string", "tech_level": "string", "magic_prevalence": "string" }
  ]
}`;
  } else if (section === "physics") {
    sectionInstructions = `
Erstelle 3 Vorschläge für Physik & Kosmologie:
- shape (z.B. Kugel, Scheibe, Fragmentiert, Schwebende Inseln, Unbekannt / Bizarre Kosmologie)
- sky_details (1–3 Sätze zu Himmel, Monden, Zeitrechnung, besonderen Phänomenen).`;
    schemaDescription = `
{
  "options": [
    { "shape": "string", "sky_details": "string" },
    { "shape": "string", "sky_details": "string" },
    { "shape": "string", "sky_details": "string" }
  ]
}`;
  } else if (section === "culture") {
    sectionInstructions = `
Erstelle 3 Vorschläge für das kulturelle Gefüge:
- religion_type (z.B. Pantheon, Monotheismus, Dualismus, Ahnenkult, Animismus, Säkular)
- language_base (z.B. Eigenständig, Angelehnt an Deutsch/Englisch/Latein/Nordisch/Ostasiatisch)
- main_conflict (1 Satz, der den zentralen Konflikt der Welt auf den Punkt bringt).`;
    schemaDescription = `
{
  "options": [
    { "religion_type": "string", "language_base": "string", "main_conflict": "string" },
    { "religion_type": "string", "language_base": "string", "main_conflict": "string" },
    { "religion_type": "string", "language_base": "string", "main_conflict": "string" }
  ]
}`;
  } else {
    sectionInstructions = `
Erstelle 3 Vorschläge für Alltag & Wirtschaft:
- holidays_summary: 1–3 Sätze, die typische Feste / Feiertage und ihren Ton beschreiben.
- calendar_months: Liste der Monatsnamen (kommagetrennt oder je Zeile), die zur Welt passen.
- month_origin: 1–2 Sätze, wie die Monatsnamen entstanden sind (z.B. nach Göttern, Helden, Ereignissen).
- currency_name: Name der gebräuchlichsten Währung.
- currency_details: 1–3 Sätze zu Material, Wertstufen, gesellschaftlicher Bedeutung.

SPEZIALFALL PANTHEON:
- Falls im Blueprint der Religions-Typ \"Pantheon\" ist, sollen die Monatsnamen möglichst von Göttern, heiligen Aspekten oder Festen dieses Pantheons inspiriert sein.`;
    schemaDescription = `
{
  "options": [
    {
      "holidays_summary": "string",
      "calendar_months": "string",
      "month_origin": "string",
      "currency_name": "string",
      "currency_details": "string"
    },
    {
      "holidays_summary": "string",
      "calendar_months": "string",
      "month_origin": "string",
      "currency_name": "string",
      "currency_details": "string"
    },
    {
      "holidays_summary": "string",
      "calendar_months": "string",
      "month_origin": "string",
      "currency_name": "string",
      "currency_details": "string"
    }
  ]
}`;
  }

  const systemPrompt = `
Du bist ein erfahrener Worldbuilding-Co-GM.
Du hilfst dabei, den Welt-Blueprint für ein TTRPG-Setting zu verfeinern.

${baseContext}

${sectionInstructions}

WICHTIG:
- Antworte NUR mit gültigem JSON-Objekt.
- Es MUSS dem folgenden Schema entsprechen:
${schemaDescription}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Erstelle die drei Vorschläge jetzt." },
    ],
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error("Keine Antwort von der KI erhalten.");
  }

  const parsed = JSON.parse(content);
  if (!parsed.options || !Array.isArray(parsed.options)) {
    throw new Error("Ungültiges Antwortformat der KI (erwartet: { options: [...] }).");
  }

  return parsed.options;
}

