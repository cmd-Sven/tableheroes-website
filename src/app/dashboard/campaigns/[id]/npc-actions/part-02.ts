/**
 * npc-actions — part 2: getNPCsByContext, updateNPC, updateNPCAllowPcOnboarding.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getVisibilityForCampaign } from "../campaign-visibility-queries";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { resolveNpcPortraitMetaForServer } from "@/src/lib/npc-portrait-meta";

/**
 * Server Actions für NPCs
 * 
 * Unterstützt:
 * - Create NPC
 * - Update NPC
 * - Delete NPC
 * - Toggle Reveal Status
 * - Get NPCs (with Faction Join)
 */

// ============================================================================
// Create NPC
// ============================================================================
import { NarrativeHook } from "@/src/types/npc";
import { imageDisplayToJson, normalizeImageDisplay } from "@/src/lib/image-display";


// ============================================================================
// Get NPCs by Context (für intelligente Vorschläge)
// ============================================================================
export async function getNPCsByContext(
  campaignId: string,
  locationId: string | null,
  factionId: string | null,
  excludeNpcId?: string | null
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  const campaign = campaignRaw as { world_id: string | null } | null;
  if (!campaign?.world_id) return { sameLocation: [], nearbyLocations: [], sameFaction: [] };
  const worldId = campaign.world_id;

  const result: {
    sameLocation: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
    nearbyLocations: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
    sameFaction: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
  } = {
    sameLocation: [],
    nearbyLocations: [],
    sameFaction: [],
  };

  if (locationId) {
    let query = (supabase.from("npcs") as any)
      .select("id, name, image_url, role")
      .eq("world_id", worldId)
      .eq("current_location_id", locationId);
    
    // Filtere den aktuellen NPC aus, falls angegeben
    if (excludeNpcId) {
      query = query.neq("id", excludeNpcId);
    }

    const { data: sameLocationNPCs } = await query;

    if (sameLocationNPCs) {
      result.sameLocation = sameLocationNPCs;
    }

    // 3. Location-Hierarchie durchlaufen (Parent-Locations finden)
    const getAllParentLocations = async (locId: string): Promise<string[]> => {
      try {
        const { data: location } = await (supabase.from("locations") as any)
          .select("parent_location_id")
          .eq("id", locId)
          .single();

        if (!location || !location.parent_location_id) {
          return [];
        }

        const parentIds = [location.parent_location_id];
        const deeperParents = await getAllParentLocations(location.parent_location_id);
        return [...parentIds, ...deeperParents];
      } catch (error) {
        // Falls parent_location_id nicht existiert oder Fehler
        return [];
      }
    };

    const parentLocationIds = await getAllParentLocations(locationId);

    if (parentLocationIds.length > 0) {
      let query = (supabase.from("npcs") as any)
        .select("id, name, image_url, role")
        .eq("world_id", worldId)
        .in("current_location_id", parentLocationIds);
      
      // Filtere den aktuellen NPC aus, falls angegeben
      if (excludeNpcId) {
        query = query.neq("id", excludeNpcId);
      }

      const { data: nearbyNPCs } = await query;

      if (nearbyNPCs) {
        // Filtere NPCs heraus, die bereits in sameLocation sind
        const sameLocationIds = new Set((result.sameLocation || []).map((n: any) => n.id));
        result.nearbyLocations = (nearbyNPCs || []).filter((n: any) => !sameLocationIds.has(n.id));
      }
    }
  }

  if (factionId) {
    let query = (supabase.from("npcs") as any)
      .select("id, name, image_url, role")
      .eq("world_id", worldId)
      .eq("faction_id", factionId);
    
    // Filtere den aktuellen NPC aus, falls angegeben
    if (excludeNpcId) {
      query = query.neq("id", excludeNpcId);
    }

    const { data: factionNPCs } = await query;

    if (factionNPCs) {
      // Filtere NPCs heraus, die bereits in sameLocation oder nearbyLocations sind
      const existingIds = new Set([
        ...(result.sameLocation || []).map((n: any) => n.id),
        ...(result.nearbyLocations || []).map((n: any) => n.id),
      ]);
      result.sameFaction = (factionNPCs || []).filter((n: any) => !existingIds.has(n.id));
    }
  }

  return result;
}


// ============================================================================
// Update NPC
// ============================================================================
export async function updateNPC(
  npcId: string,
  updates: {
    name?: string;
    title?: string;
    description?: string;
    gm_notes?: string;
    faction_id?: string | null;
    current_location_id?: string | null;
    home_location_id?: string | null;
    is_dead?: boolean; // Globaler Status: gilt für alle Kampagnen dieser Welt
    race?: string;
    role?: string;
    status?: string;
    appearance?: string;
    personality_traits?: string;
    alignment?: string;
    image_url?: string;
    narrative_hooks?: NarrativeHook[] | null;
    is_secret_antagonist?: boolean;
    is_merchant?: boolean;
    shop_id?: string | null;
    hidden_agenda?: string | null;
    true_nature?: string | null;
    check_results?: Array<{
      type: "Wahrnehmung" | "Motiv erkennen" | "Wissen";
      dc: number;
      result: string;
      is_critical: boolean;
    }> | null;
    /** Weltweite Beziehungen zu anderen NPCs (weltbezogen, nicht kampagnenbezogen). Pro Ziel-NPC max. 2 Beziehungstypen. */
    world_relations?: Array<{ target_npc_id: string; relation_types: string[] }> | null;
    image_display?: unknown | null;
    image_is_ai_generated?: boolean;
    image_upload_rights_confirmed?: boolean | null;
    token_url?: string | null;
    token_storage_path?: string | null;
    token_border?: { thicknessPx: number; color: string } | null;
    token_size_category?: string | null;
    sheet_data?: unknown | null;
    sheet_source?: string | null;
  }
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch NPC to verify GM ownership
  const { data: npc } = await (supabase.from("npcs") as any)
    .select("world_id, worlds!inner(gm_id)")
    .eq("id", npcId)
    .single();

  if (!npc) throw new Error("NPC nicht gefunden.");

  const worlds = npc.worlds as { gm_id: string } | undefined;
  if (!worlds || worlds.gm_id !== user.id) {
    throw new Error("Nur der GM der Welt kann NPCs bearbeiten.");
  }

  // 3. Normalize foreign keys and jsonb: empty -> null
  const normalizedUpdates: any = { ...updates };
  if (updates.check_results !== undefined) {
    normalizedUpdates.check_results =
      Array.isArray(updates.check_results) && updates.check_results.length > 0
        ? updates.check_results
        : null;
  }
  if (updates.faction_id !== undefined) {
    normalizedUpdates.faction_id = updates.faction_id && String(updates.faction_id).trim() !== "" 
      ? String(updates.faction_id).trim() 
      : null;
  }
  if (updates.current_location_id !== undefined) {
    const originalLocationId = updates.current_location_id;
    normalizedUpdates.current_location_id = updates.current_location_id && String(updates.current_location_id).trim() !== "" 
      ? String(updates.current_location_id).trim() 
      : null;

    console.log("🔍 [updateNPC] Normalized location_id:", {
      original: originalLocationId,
      normalized: normalizedUpdates.current_location_id,
    });
  }
  if (updates.is_merchant !== undefined || updates.shop_id !== undefined) {
    const isMerchant = updates.is_merchant ?? Boolean(normalizedUpdates.is_merchant);
    normalizedUpdates.is_merchant = isMerchant;
    normalizedUpdates.shop_id =
      isMerchant && updates.shop_id && String(updates.shop_id).trim() !== ""
        ? String(updates.shop_id).trim()
        : null;
  }

  const ALLOWED_RELATION_TYPES = new Set([
    "Bruder", "Schwester", "Ehefrau", "Ehemann", "Mentor", "Meister", "Vorgesetzter", "Ausbilder", "Lehrmeister",
    "Erzfeind", "Gegenspieler", "Liebschaft", "Geschäftspartner", "Kollege", "Kamerad", "Verräter",
    "Sklave", "Untertan", "Diener", "Leibeigener", "Angestellter",
  ]);
  if (updates.image_display !== undefined) {
    const raw = updates.image_display;
    normalizedUpdates.image_display =
      raw == null
        ? null
        : imageDisplayToJson(normalizeImageDisplay(raw));
  }

  if (updates.sheet_data !== undefined) {
    normalizedUpdates.sheet_data = updates.sheet_data;
    normalizedUpdates.sheet_synced_at = updates.sheet_data
      ? new Date().toISOString()
      : null;
    if (updates.sheet_source !== undefined) {
      normalizedUpdates.sheet_source = updates.sheet_source;
    } else if (updates.sheet_data) {
      normalizedUpdates.sheet_source = "manual";
    }
  }

  if (updates.token_border !== undefined) {
    normalizedUpdates.token_border = updates.token_border;
  }

  if (
    updates.image_url !== undefined ||
    updates.image_is_ai_generated !== undefined ||
    updates.image_upload_rights_confirmed !== undefined
  ) {
    const nextUrl =
      updates.image_url !== undefined
        ? (updates.image_url || "").trim() || null
        : undefined;
    if (nextUrl !== undefined) {
      const portraitMeta = resolveNpcPortraitMetaForServer(user.id, {
        imageUrl: nextUrl,
        portraitIsAiGenerated: updates.image_is_ai_generated,
        uploadRightsConfirmed: updates.image_upload_rights_confirmed,
      });
      normalizedUpdates.image_url = nextUrl;
      normalizedUpdates.image_is_ai_generated = portraitMeta.image_is_ai_generated;
      normalizedUpdates.image_upload_rights_confirmed =
        portraitMeta.image_upload_rights_confirmed;

      if (
        nextUrl &&
        !portraitMeta.image_is_ai_generated &&
        portraitMeta.image_upload_rights_confirmed !== true
      ) {
        throw new Error(
          "Bitte bestätige die Nutzungsrechte am hochgeladenen Bild oder kennzeichne es als KI-generiert.",
        );
      }
    }
  }

  if (updates.world_relations !== undefined) {
    const raw = updates.world_relations;
    if (!Array.isArray(raw) || raw.length === 0) {
      normalizedUpdates.world_relations = null;
    } else {
      normalizedUpdates.world_relations = raw
        .filter((r: any) => r && typeof r.target_npc_id === "string" && String(r.target_npc_id).trim() !== "")
        .map((r: any) => {
          const arr = Array.isArray(r.relation_types) ? r.relation_types : [];
          const types = arr
            .filter((t: any) => typeof t === "string" && ALLOWED_RELATION_TYPES.has(String(t).trim()))
            .map((t: any) => String(t).trim())
            .slice(0, 2);
          return { target_npc_id: String(r.target_npc_id).trim(), relation_types: types };
        })
        .filter((r: any) => r.relation_types.length > 0);
    }
  }

  // 4. Validate location_id (Location muss zur gleichen Welt gehören)
  if (normalizedUpdates.current_location_id) {
    const { data: location, error: locationError } = await (supabase.from("locations") as any)
      .select("id, world_id")
      .eq("id", normalizedUpdates.current_location_id)
      .single();

    if (locationError || !location) {
      throw new Error(`Ungültiger Ort ausgewählt. Bitte wähle einen gültigen Ort aus der Liste.`);
    }

    if (location.world_id !== npc.world_id) {
      throw new Error(`Der ausgewählte Ort gehört zu einer anderen Welt.`);
    }

    normalizedUpdates.current_location_id = location.id;
  }

  // 5. Update
  console.log("🔍 [updateNPC] Update payload:", {
    ...normalizedUpdates,
    current_location_id: normalizedUpdates.current_location_id,
  });

  const { error } = await (supabase.from("npcs") as any)
    .update(normalizedUpdates)
    .eq("id", npcId);

  if (error) {
    console.error("Update NPC Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns");
}


// deleteNPC / toggleNPCReveal → npc-campaign-actions.ts (direkt importieren)

// ============================================================================
// Onboarding: Toggle allow_pc_onboarding (GM only)
// Tabelle: npcs, Spalte: allow_pc_onboarding, ID: npcs.id
// ============================================================================
export async function updateNPCAllowPcOnboarding(npcId: string, allow: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: npc, error: fetchError } = await (supabase.from("npcs") as any)
    .select("*, worlds!inner(gm_id)")
    .eq("id", npcId)
    .single();

  if (fetchError) {
    console.error("[updateNPCAllowPcOnboarding] Fetch npc error:", fetchError);
    throw new Error("NPC nicht gefunden oder kein Zugriff.");
  }
  if (!npc) throw new Error("NPC nicht gefunden.");
  const worlds = npc.worlds as { gm_id: string } | undefined;
  if (!worlds || worlds.gm_id !== user.id) {
    throw new Error("Nur der GM der Welt kann die Onboarding-Einstellung ändern.");
  }

  const { data: updated, error } = await (supabase.from("npcs") as any)
    .update({ allow_pc_onboarding: allow })
    .eq("id", npcId)
    .select("*")
    .single();

  if (error) {
    console.error("[updateNPCAllowPcOnboarding] Update error:", error);
    throw new Error(error.message || "Speichern fehlgeschlagen.");
  }
  if (!updated) {
    console.error("[updateNPCAllowPcOnboarding] Update nicht bestätigt:", { npcId, allow, updated });
    throw new Error("Update konnte nicht bestätigt werden. Bitte Seite neu laden und erneut versuchen.");
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns");
}
