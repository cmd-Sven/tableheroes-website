import { createClient } from "@/src/lib/supabase/server";
import { isExileCultureName } from "@/src/lib/lore-race-bonuses";

/**
 * Reine Datenqueries (kein "use server") – für Server Components.
 * Client nutzt weiterhin die Server-Action-Wrapper in character-actions.ts.
 */

export type WizardRaceOption = {
  id: string;
  name: string;
  culture_id: string | null;
  race_traits: string | null;
  race_subtypes: string | null;
};

export type WizardCultureOption = {
  id: string;
  name: string;
  race_ids: string[];
  language_ids: string[];
  religion_ids: string[];
};

export type WizardLanguageOption = { id: string; name: string };
export type WizardReligionOption = { id: string; name: string };

export async function getCharacterWizardLoreData(campaignId: string) {
  const supabase = await createClient();

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  if (!campaign?.world_id) {
    return {
      races: [] as WizardRaceOption[],
      cultures: [] as WizardCultureOption[],
      languages: [] as WizardLanguageOption[],
      religions: [] as WizardReligionOption[],
    };
  }

  const worldId = campaign.world_id as string;

  const { data: visRows } = await (supabase.from("campaign_visibility") as any)
    .select("entity_id")
    .eq("campaign_id", campaignId)
    .eq("entity_type", "lore")
    .eq("is_revealed", true);

  const revealedIds = new Set(((visRows as any[]) ?? []).map((v: any) => v.entity_id as string));

  const { data: loreRows } = await (supabase.from("world_lore") as any)
    .select(
      "id, name, type, culture_id, race_ids, language_ids, religion_ids, race_traits, race_subtypes",
    )
    .eq("world_id", worldId)
    .in("type", ["Rasse", "Kultur", "Sprache", "Religion"]);

  const all = (loreRows as any[]) ?? [];

  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)) : [];

  const races = all
    .filter((l: any) => l.type === "Rasse" && revealedIds.has(l.id))
    .map((l: any) => ({
      id: String(l.id),
      name: String(l.name ?? "").trim(),
      culture_id: l.culture_id != null ? String(l.culture_id) : null,
      race_traits: l.race_traits != null ? String(l.race_traits) : null,
      race_subtypes: l.race_subtypes != null ? String(l.race_subtypes) : null,
    }));

  const cultures = all
    .filter((l: any) => l.type === "Kultur" && revealedIds.has(l.id))
    .map((l: any) => ({
      id: String(l.id),
      name: String(l.name ?? "").trim(),
      race_ids: asStringArray(l.race_ids),
      language_ids: asStringArray(l.language_ids),
      religion_ids: asStringArray(l.religion_ids),
    }));

  const languages = all
    .filter((l: any) => l.type === "Sprache" && revealedIds.has(l.id))
    .map((l: any) => ({
      id: String(l.id),
      name: String(l.name ?? "").trim(),
    }));

  const religions = all
    .filter((l: any) => l.type === "Religion" && revealedIds.has(l.id))
    .map((l: any) => ({
      id: String(l.id),
      name: String(l.name ?? "").trim(),
    }));

  return { races, cultures, languages, religions };
}

/** Hilfsfunktion für Clients: Exilanten-Fallback. */
export function cultureAllowsAllRaces(cultureName: string): boolean {
  return isExileCultureName(cultureName);
}

const GEOGRAPHIC_TYPES_GM = [
  "Stadt",
  "Region",
  "Ort",
  "Akademie",
  "Tempel",
  "Gilde",
];

function typeMatchesGeographicGm(type: string | null | undefined) {
  return GEOGRAPHIC_TYPES_GM.some(
    (t) => String(t).toLowerCase() === String(type ?? "").toLowerCase(),
  );
}

/** GM: alle relevanten world_lore-/Fraktions-Optionen ohne campaign_visibility (Bearbeitung Spielercharakter). */
export async function getCharacterEditorLoreOptionsForGm(campaignId: string) {
  const supabase = await createClient();

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  if (!campaign?.world_id) {
    return {
      cultures: [] as { id: string; name: string; race_ids: string[]; language_ids: string[]; religion_ids: string[] }[],
      races: [] as WizardRaceOption[],
      languages: [] as { id: string; name: string }[],
      religions: [] as { id: string; name: string }[],
      locations: [] as { id: string; name: string; type: string }[],
      factions: [] as { id: string; name: string }[],
    };
  }

  const worldId = campaign.world_id as string;

  const [{ data: loreRows }, { data: factionRows }] = await Promise.all([
    (supabase.from("world_lore") as any)
      .select(
        "id, name, type, culture_id, race_ids, language_ids, religion_ids, race_traits, race_subtypes",
      )
      .eq("world_id", worldId)
      .in("type", [
        "Kultur",
        "Rasse",
        "Sprache",
        "Religion",
        "Stadt",
        "Region",
        "Ort",
        "Akademie",
        "Tempel",
        "Gilde",
      ]),
    (supabase.from("factions") as any).select("id, name").eq("world_id", worldId).order("name"),
  ]);

  const all = (loreRows as any[]) ?? [];
  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)) : [];

  const cultures = all
    .filter((l: any) => l.type === "Kultur")
    .map((l: any) => ({
      id: String(l.id),
      name: String(l.name ?? "").trim() || "Ohne Namen",
      race_ids: asStringArray(l.race_ids),
      language_ids: asStringArray(l.language_ids),
      religion_ids: asStringArray(l.religion_ids),
    }));

  const races = all
    .filter((l: any) => l.type === "Rasse")
    .map((l: any) => ({
      id: String(l.id),
      name: String(l.name ?? "").trim() || "Ohne Namen",
      culture_id: l.culture_id != null ? String(l.culture_id) : null,
      race_traits: l.race_traits != null ? String(l.race_traits) : null,
      race_subtypes: l.race_subtypes != null ? String(l.race_subtypes) : null,
    }));

  const languages = all
    .filter((l: any) => l.type === "Sprache")
    .map((l: any) => ({ id: String(l.id), name: String(l.name ?? "").trim() || "—" }));

  const religions = all
    .filter((l: any) => l.type === "Religion")
    .map((l: any) => ({ id: String(l.id), name: String(l.name ?? "").trim() || "—" }));

  const locations = all
    .filter((l: any) => typeMatchesGeographicGm(l.type))
    .map((l: any) => ({
      id: String(l.id),
      name: String(l.name ?? "").trim() || "—",
      type: String(l.type ?? ""),
    }));

  const factions = ((factionRows as any[]) ?? []).map((f: any) => ({
    id: String(f.id),
    name: String(f.name ?? "").trim() || "—",
  }));

  return { cultures, races, languages, religions, locations, factions };
}
