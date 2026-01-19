"use server";

import { createClient } from "@/src/lib/supabase/server";

/**
 * Server Action: Get Campaign Gallery Images
 * 
 * Sammelt alle öffentlichen Bilder (is_revealed === true) aus:
 * - world_lore (image_url)
 * - npcs (image_url)
 * - factions (image_url)
 * 
 * Nur für Spieler sichtbare Einträge werden zurückgegeben.
 */

export type GalleryImage = {
  id: string;
  url: string;
  altText: string;
  type: "lore" | "npc" | "faction";
};

export async function getCampaignGalleryImages(
  campaignId: string
): Promise<GalleryImage[]> {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const galleryImages: GalleryImage[] = [];

  // 2. Fetch Lore Entries (is_revealed === true, has image_url)
  const { data: loreEntriesRaw } = await (supabase.from("world_lore") as any)
    .select("id, name, image_url")
    .eq("campaign_id", campaignId)
    .eq("is_revealed", true)
    .not("image_url", "is", null);

  // Expliziter Cast gegen 'never'
  const loreEntries = loreEntriesRaw as { id: string; name: string; image_url: string }[] | null;

  if (loreEntries) {
    loreEntries.forEach((entry) => {
      if (entry.image_url) {
        galleryImages.push({
          id: entry.id,
          url: entry.image_url,
          altText: entry.name,
          type: "lore",
        });
      }
    });
  }

  // 3. Fetch NPCs (is_revealed === true, has image_url)
  const { data: npcsRaw } = await (supabase.from("npcs") as any)
    .select("id, name, image_url")
    .eq("campaign_id", campaignId)
    .eq("is_revealed", true)
    .not("image_url", "is", null);

  // Expliziter Cast gegen 'never'
  const npcs = npcsRaw as { id: string; name: string; image_url: string }[] | null;

  if (npcs) {
    npcs.forEach((npc) => {
      if (npc.image_url) {
        galleryImages.push({
          id: npc.id,
          url: npc.image_url,
          altText: npc.name,
          type: "npc",
        });
      }
    });
  }

  // 4. Fetch Factions (is_revealed === true, has image_url)
  const { data: factionsRaw } = await (supabase.from("factions") as any)
    .select("id, name, image_url")
    .eq("campaign_id", campaignId)
    .eq("is_revealed", true)
    .not("image_url", "is", null);

  // Expliziter Cast gegen 'never'
  const factions = factionsRaw as { id: string; name: string; image_url: string }[] | null;

  if (factions) {
    factions.forEach((faction) => {
      if (faction.image_url) {
        galleryImages.push({
          id: faction.id,
          url: faction.image_url,
          altText: faction.name,
          type: "faction",
        });
      }
    });
  }

  return galleryImages;
}


