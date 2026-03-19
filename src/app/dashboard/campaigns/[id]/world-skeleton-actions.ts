"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createFaction } from "./factions-actions";
import { createLoreEntry } from "./lore-actions";
import { createNPC } from "./npc-actions";

/**
 * Server Action: Apply World Skeleton
 * 
 * Takes generated skeleton data and saves it to the database.
 */
export async function applyWorldSkeleton(
  campaignId: string,
  data: {
    factions?: Array<{
      name: string;
      type: string;
      current_status?: string;
      description?: string;
      gm_notes?: string;
    }>;
    locations?: Array<{
      name: string;
      type: string;
      description?: string;
      gm_notes?: string;
    }>;
    npcs?: Array<{
      name: string;
      title?: string;
      description?: string;
      gm_notes?: string;
      faction_name_suggestion?: string;
    }>;
  }
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Typ-Sicherung gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann ein World Skeleton anwenden.");
  }

  const created: {
    factions: number;
    locations: number;
    npcs: number;
  } = {
    factions: 0,
    locations: 0,
    npcs: 0,
  };

  // 3. Create Factions first (NPCs might reference them)
  const factionMap = new Map<string, string>(); // name -> id

  if (data.factions && data.factions.length > 0) {
    for (const faction of data.factions) {
      try {
        const result = await createFaction({
          campaign_id: campaignId,
          name: faction.name,
          type: faction.type,
          current_status: faction.current_status || "Neutral",
          description: faction.description,
          gm_notes: faction.gm_notes,
        });
        factionMap.set(faction.name, result.id);
        created.factions++;
      } catch (error) {
        console.error(`Error creating faction ${faction.name}:`, error);
        // Continue with other factions
      }
    }
  }

  // 4. Create Locations
  if (data.locations && data.locations.length > 0) {
    for (const location of data.locations) {
      try {
        await createLoreEntry({
          campaign_id: campaignId,
          name: location.name,
          type: location.type || "Location",
          description: location.description,
          gm_notes: location.gm_notes,
        });
        created.locations++;
      } catch (error) {
        console.error(`Error creating location ${location.name}:`, error);
        // Continue with other locations
      }
    }
  }

  // 5. Create NPCs (with faction matching)
  if (data.npcs && data.npcs.length > 0) {
    for (const npc of data.npcs) {
      try {
        // Try to match faction by name
        let factionId: string | null = null;
        if (npc.faction_name_suggestion) {
          factionId = factionMap.get(npc.faction_name_suggestion) || null;
        }

        await createNPC({
          campaign_id: campaignId,
          name: npc.name,
          title: npc.title,
          description: npc.description,
          gm_notes: npc.gm_notes,
          faction_id: factionId,
        });
        created.npcs++;
      } catch (error) {
        console.error(`Error creating NPC ${npc.name}:`, error);
        // Continue with other NPCs
      }
    }
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);

  return created;
}





