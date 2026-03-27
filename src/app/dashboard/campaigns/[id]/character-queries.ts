import { createClient } from "@/src/lib/supabase/server";

/**
 * Reine Datenqueries (kein "use server") – für Server Components.
 * Client nutzt weiterhin die Server-Action-Wrapper in character-actions.ts.
 */

export async function getCharacterWizardLoreData(campaignId: string) {
  const supabase = await createClient();

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  if (!campaign?.world_id) return { races: [], cultures: [], languages: [] };

  const worldId = campaign.world_id as string;

  const { data: visRows } = await (supabase.from("campaign_visibility") as any)
    .select("entity_id")
    .eq("campaign_id", campaignId)
    .eq("entity_type", "lore")
    .eq("is_revealed", true);

  const revealedIds = new Set(((visRows as any[]) ?? []).map((v: any) => v.entity_id as string));

  const { data: loreRows } = await (supabase.from("world_lore") as any)
    .select("id, name, type, culture_id, race_ids, language_ids")
    .eq("world_id", worldId)
    .in("type", ["Rasse", "Kultur", "Sprache"]);

  const all = (loreRows as any[]) ?? [];

  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)) : [];

  const races = all
    .filter((l: any) => l.type === "Rasse" && revealedIds.has(l.id))
    .map((l: any) => ({
      id: String(l.id),
      name: String(l.name ?? "").trim(),
      culture_id: l.culture_id != null ? String(l.culture_id) : null,
    }));

  const cultures = all
    .filter((l: any) => l.type === "Kultur" && revealedIds.has(l.id))
    .map((l: any) => ({
      id: String(l.id),
      name: String(l.name ?? "").trim(),
      race_ids: asStringArray(l.race_ids),
      language_ids: asStringArray(l.language_ids),
    }));

  const languages = all
    .filter((l: any) => l.type === "Sprache" && revealedIds.has(l.id))
    .map((l: any) => ({
      id: String(l.id),
      name: String(l.name ?? "").trim(),
    }));

  return { races, cultures, languages };
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
    return { cultures: [] as { id: string; name: string }[], languages: [] as { id: string; name: string }[], locations: [] as { id: string; name: string; type: string }[], factions: [] as { id: string; name: string }[] };
  }

  const worldId = campaign.world_id as string;

  const [{ data: loreRows }, { data: factionRows }] = await Promise.all([
    (supabase.from("world_lore") as any)
      .select("id, name, type")
      .eq("world_id", worldId)
      .in("type", ["Kultur", "Sprache", "Stadt", "Region", "Ort", "Akademie", "Tempel", "Gilde"]),
    (supabase.from("factions") as any).select("id, name").eq("world_id", worldId).order("name"),
  ]);

  const all = (loreRows as any[]) ?? [];
  const cultures = all
    .filter((l: any) => l.type === "Kultur")
    .map((l: any) => ({ id: String(l.id), name: String(l.name ?? "").trim() || "Ohne Namen" }));

  const languages = all
    .filter((l: any) => l.type === "Sprache")
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

  return { cultures, languages, locations, factions };
}
