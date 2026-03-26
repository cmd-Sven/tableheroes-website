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

  const races = all
    .filter((l: any) => l.type === "Rasse" && revealedIds.has(l.id))
    .map((l: any) => ({
      id: l.id as string,
      name: (l.name as string).trim(),
      culture_id: l.culture_id as string | null,
    }));

  const cultures = all
    .filter((l: any) => l.type === "Kultur" && revealedIds.has(l.id))
    .map((l: any) => ({
      id: l.id as string,
      name: (l.name as string).trim(),
      race_ids: (l.race_ids as string[]) ?? [],
      language_ids: (l.language_ids as string[]) ?? [],
    }));

  const languages = all
    .filter((l: any) => l.type === "Sprache" && revealedIds.has(l.id))
    .map((l: any) => ({
      id: l.id as string,
      name: (l.name as string).trim(),
    }));

  return { races, cultures, languages };
}
