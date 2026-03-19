"use server";

import { createClient } from "@/src/lib/supabase/server";
import { getVisibilityForCampaign } from "./campaign-visibility-actions";

/**
 * Server Action: Get Campaign Gallery Images
 *
 * Sammelt alle für diese Kampagne sichtbaren Bilder (campaign_visibility.is_revealed) aus:
 * - world_lore (image_url)
 * - npcs (image_url)
 * - factions (image_url, falls campaign_visibility für faction genutzt wird)
 */

type GalleryImage = {
  id: string;
  url: string;
  altText: string;
  type: "lore" | "npc" | "faction";
};

export async function getCampaignGalleryImages(
  campaignId: string,
): Promise<GalleryImage[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  if (!campaign?.world_id) return [];

  const [loreVisibility, npcVisibility, factionVisibility] = await Promise.all([
    getVisibilityForCampaign(campaignId, "lore"),
    getVisibilityForCampaign(campaignId, "npc"),
    getVisibilityForCampaign(campaignId, "faction"),
  ]);

  const galleryImages: GalleryImage[] = [];

  const { data: loreEntriesRaw } = await (supabase.from("world_lore") as any)
    .select("id, name, image_url")
    .eq("world_id", campaign.world_id)
    .not("image_url", "is", null);
  const loreEntries = (loreEntriesRaw || []) as { id: string; name: string; image_url: string }[];
  loreEntries.forEach((entry) => {
    if (entry.image_url && loreVisibility[entry.id]) {
      galleryImages.push({
        id: entry.id,
        url: entry.image_url,
        altText: entry.name,
        type: "lore",
      });
    }
  });

  const { data: npcsRaw } = await (supabase.from("npcs") as any)
    .select("id, name, image_url")
    .eq("world_id", campaign.world_id)
    .not("image_url", "is", null);
  const npcs = (npcsRaw || []) as { id: string; name: string; image_url: string }[];
  npcs.forEach((npc) => {
    if (npc.image_url && npcVisibility[npc.id]) {
      galleryImages.push({
        id: npc.id,
        url: npc.image_url,
        altText: npc.name,
        type: "npc",
      });
    }
  });

  const { data: factionsRaw } = await (supabase.from("factions") as any)
    .select("id, name, image_url")
    .eq("campaign_id", campaignId)
    .not("image_url", "is", null);
  const factions = (factionsRaw || []) as { id: string; name: string; image_url: string }[];
  factions.forEach((faction) => {
    if (faction.image_url && factionVisibility[faction.id]) {
      galleryImages.push({
        id: faction.id,
        url: faction.image_url,
        altText: faction.name,
        type: "faction",
      });
    }
  });

  return galleryImages;
}
