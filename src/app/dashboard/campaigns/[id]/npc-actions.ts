"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getVisibilityForCampaign } from "./campaign-visibility-queries";
import { setCampaignVisibility } from "./campaign-visibility-actions";

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

export async function createNPC(formData: {
  campaign_id?: string;
  world_id?: string;
  name: string;
  title?: string;
  description?: string;
  gm_notes?: string;
  faction_id?: string | null;
  current_location_id?: string | null;
  home_location_id?: string | null;
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
  hidden_agenda?: string;
  true_nature?: string;
  secret_entry?: string;
  check_results?: Array<{
    type: "Wahrnehmung" | "Motiv erkennen" | "Wissen";
    dc: number;
    result: string;
    is_critical: boolean;
  }> | null;
  religions?: string[] | null;
  deities?: string[] | null;
  languages?: string[] | null;
  image_display?: unknown;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  let worldId: string;

  if (formData.world_id) {
    const { data: world } = await (supabase.from("worlds") as any)
      .select("id, gm_id")
      .eq("id", formData.world_id)
      .single();
    if (!world || (world as { gm_id: string }).gm_id !== user.id) {
      throw new Error("Nur der GM dieser Welt kann NPCs erstellen.");
    }
    worldId = formData.world_id;
  } else if (formData.campaign_id) {
    const { data: campaignRaw } = await (supabase.from("campaigns") as any)
      .select("id, gm_id, world_id")
      .eq("id", formData.campaign_id)
      .single();
    const campaign = campaignRaw as { id: string; gm_id: string; world_id: string | null } | null;
    if (!campaign || campaign.gm_id !== user.id) {
      throw new Error("Nur der GM kann NPCs erstellen.");
    }
    if (!campaign.world_id) {
      throw new Error("Diese Kampagne hat keine Basis-Welt. Bitte weise unter Welt & Lore eine Welt zu.");
    }
    worldId = campaign.world_id;
  } else {
    throw new Error("Entweder campaign_id oder world_id angeben.");
  }

  // 4. Normalize foreign keys: empty strings -> null
  const normalizedFactionId = formData.faction_id && formData.faction_id.trim() !== "" 
    ? formData.faction_id.trim() 
    : null;
  const normalizedCurrentLocationId = formData.current_location_id && formData.current_location_id.trim() !== "" 
    ? formData.current_location_id.trim() 
    : null;
  const normalizedHomeLocationId = formData.home_location_id && formData.home_location_id.trim() !== "" 
    ? formData.home_location_id.trim() 
    : null;

  console.log("🔍 [createNPC] Normalized IDs:", {
    faction_id: normalizedFactionId,
    current_location_id: normalizedCurrentLocationId,
    home_location_id: normalizedHomeLocationId,
  });

  // 5. Validate location_ids (welt-zentrisch: world_id)
  const validateOrCreateLocation = async (
    locationId: string,
    worldIdParam: string,
    depth: number = 0
  ): Promise<{ id: string; world_id: string }> => {
    if (depth > 10) {
      throw new Error("Zu viele verschachtelte Parent-Orte. Bitte prüfe die Hierarchie.");
    }

    const { data: location, error: locationError } = await (supabase.from("locations") as any)
      .select("id, world_id, name")
      .eq("id", locationId)
      .maybeSingle();

    if (location && location.world_id === worldIdParam) {
      return location as { id: string; world_id: string };
    }

    const { data: lore, error: loreError } = await (supabase.from("world_lore") as any)
      .select("id, world_id, name, type, description, parent_id")
      .eq("id", locationId)
      .maybeSingle();

    if (!lore || lore.world_id !== worldIdParam) {
      console.error(`❌ [validateOrCreateLocation] Location not found:`, {
        locationId,
        depth,
        locationError,
        loreError,
        loreFound: !!lore,
      });
      throw new Error(`Der Ort mit der ID "${locationId}" existiert nicht in dieser Welt.`);
    }

    let validatedParentLocationId: string | null = null;
    if (lore.parent_id) {
      try {
        const parentLocation = await validateOrCreateLocation(lore.parent_id, worldIdParam, depth + 1);
        validatedParentLocationId = parentLocation.id;
      } catch {
        validatedParentLocationId = null;
      }
    }

    const { data: createdLocation, error: createError } = await (supabase.from("locations") as any)
      .insert({
        id: lore.id,
        world_id: lore.world_id,
        name: lore.name,
        type: lore.type,
        description: lore.description || null,
        parent_location_id: validatedParentLocationId,
      })
      .select("id, world_id")
      .single();

    if (createError || !createdLocation) {
      if (createError?.code === "23503" || createError?.message?.includes("foreign key")) {
        throw new Error(
          `Der Ort "${lore.name}" oder sein übergeordneter Ort ist ungültig. Bitte prüfe die Orts-Hierarchie.`
        );
      }
      throw new Error(
        `Fehler beim Erstellen des Ortes "${lore.name}": ${createError?.message || "Unbekannter Fehler"}`
      );
    }

    return createdLocation as { id: string; world_id: string };
  };

  const validateLocation = async (locationId: string | null, fieldName: string): Promise<string | null> => {
    if (!locationId) return null;

    try {
      const effectiveLocation = await validateOrCreateLocation(locationId, worldId, 0);

      if (effectiveLocation.world_id !== worldId) {
        throw new Error(`Der ausgewählte Ort gehört zu einer anderen Welt.`);
      }

      return effectiveLocation.id;
    } catch (error) {
      console.error(`❌ [createNPC] Location validation failed for ${fieldName}:`, {
        locationId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Verbesserte Fehlermeldung
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      throw new Error(
        `Ungültiger ${fieldName === "current_location_id" ? "Aufenthaltsort" : "Heimatort"}: ${errorMessage}`
      );
    }
  };

  const validatedCurrentLocationId = await validateLocation(normalizedCurrentLocationId, "current_location_id");
  const validatedHomeLocationId = await validateLocation(normalizedHomeLocationId, "home_location_id");

  // 6. Insert NPC (welt-zentrisch: nur world_id)
  const insertPayload = {
    world_id: worldId,
    name: formData.name,
    title: formData.title || null,
    description: formData.description || null,
    gm_notes: formData.gm_notes || null,
    faction_id: normalizedFactionId,
    current_location_id: validatedCurrentLocationId, // WICHTIG: Verwende die validierte ID
    home_location_id: validatedHomeLocationId, // WICHTIG: Verwende die validierte ID
    race: formData.race || null,
    role: formData.role || null,
    status: formData.status || "Alive",
    appearance: formData.appearance || null,
    personality_traits: formData.personality_traits || null,
    alignment: formData.alignment || null,
    image_url: formData.image_url || null,
    image_display:
      formData.image_display != null && (formData.image_url || "").trim() !== ""
        ? imageDisplayToJson(normalizeImageDisplay(formData.image_display))
        : null,
    narrative_hooks: formData.narrative_hooks && formData.narrative_hooks.length > 0 ? formData.narrative_hooks : null,
    is_secret_antagonist: formData.is_secret_antagonist ?? false,
    is_merchant: formData.is_merchant ?? false,
    shop_id: formData.is_merchant && formData.shop_id ? formData.shop_id : null,
    hidden_agenda: formData.hidden_agenda || null,
    true_nature: formData.true_nature || null,
    check_results: formData.check_results && formData.check_results.length > 0 ? formData.check_results : null,
    religions: formData.religions && formData.religions.length > 0 ? formData.religions : null,
    deities: formData.deities && formData.deities.length > 0 ? formData.deities : null,
    languages: formData.languages && formData.languages.length > 0 ? formData.languages : null,
  };

  console.log("🔍 [createNPC] Insert payload:", {
    ...insertPayload,
    current_location_id: insertPayload.current_location_id,
    home_location_id: insertPayload.home_location_id,
  });

  const { data: npc, error } = await (supabase.from("npcs") as any)
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error("Create NPC Error:", error);
    throw new Error(error.message);
  }

  // 7. Automatisches Secret erstellen, wenn is_secret_antagonist true ist oder secret_entry vorhanden ist
  if ((formData.is_secret_antagonist || formData.secret_entry) && npc.id) {
    try {
      // Erstelle ein Secret für den Antagonisten
      const secretTitle = formData.secret_entry 
        ? `Geheimnis: ${formData.name}`
        : `Die wahre Natur von ${formData.name}`;
      
      const secretContent = formData.secret_entry 
        ? formData.secret_entry
        : formData.hidden_agenda 
          ? `${formData.hidden_agenda}\n\n${formData.true_nature ? `Wahre Persönlichkeit: ${formData.true_nature}` : ""}`
          : formData.true_nature || `Dieser NPC ist ein geheimer Antagonist. Seine wahre Natur ist verborgen.`;

      const { error: secretError } = await (supabase.from("secrets") as any)
        .insert({
          campaign_id: formData.campaign_id,
          entity_type: "npc",
          entity_id: npc.id,
          title: secretTitle,
          content: secretContent,
          is_revealed: false, // Standardmäßig nicht enthüllt
        });

      if (secretError) {
        console.error("⚠️ [createNPC] Failed to create automatic secret:", secretError);
        // Nicht werfen - Secret-Erstellung ist optional
      } else {
        console.log("✅ [createNPC] Automatic secret created for antagonist");
      }
    } catch (secretErr) {
      console.error("⚠️ [createNPC] Error creating automatic secret:", secretErr);
      // Nicht werfen - Secret-Erstellung ist optional
    }
  }

  if (formData.campaign_id) {
    revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
    revalidatePath(`/dashboard/campaigns/${formData.campaign_id}?tab=npcs`);
    revalidatePath(`/dashboard/campaigns/${formData.campaign_id}/npcs`);
  }
  if (formData.world_id) {
    revalidatePath(`/dashboard/worlds/${formData.world_id}`);
    revalidatePath(`/dashboard/worlds/${formData.world_id}/npcs`);
  }
  return npc;
}

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

// ============================================================================
// Delete NPC
// ============================================================================
export async function deleteNPC(npcId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: npc } = await (supabase.from("npcs") as any)
    .select("world_id, worlds!inner(gm_id)")
    .eq("id", npcId)
    .single();

  if (!npc) throw new Error("NPC nicht gefunden.");

  const worlds = npc.worlds as { gm_id: string } | undefined;
  if (!worlds || worlds.gm_id !== user.id) {
    throw new Error("Nur der GM der Welt kann NPCs löschen.");
  }

  const { error } = await (supabase.from("npcs") as any).delete().eq("id", npcId);

  if (error) {
    console.error("Delete NPC Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns");
}

// ============================================================================
// Toggle Reveal Status (pro Kampagne via campaign_visibility)
// ============================================================================
export async function toggleNPCReveal(campaignId: string, npcId: string, currentRevealed: boolean) {
  await setCampaignVisibility(campaignId, "npc", npcId, !currentRevealed);
}

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

// ============================================================================
// Nur NPCs, die in dieser Kampagne für Spieler freigegeben sind UND für Onboarding markiert sind
// ============================================================================
export async function getNPCsByFactionForOnboarding(campaignId: string, factionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  const campaign = campaignRaw as { world_id: string | null } | null;
  if (!campaign?.world_id) return [];

  const { data: npcsRaw, error } = await (supabase.from("npcs") as any)
    .select("id, name, title, role, allow_pc_onboarding")
    .eq("world_id", campaign.world_id)
    .eq("faction_id", factionId)
    .order("name", { ascending: true });

  if (error) {
    console.error("getNPCsByFactionForOnboarding Error:", error);
    return [];
  }

  const visibility = await getVisibilityForCampaign(campaignId, "npc");
  const npcs = (npcsRaw || []).filter(
    (npc: any) => visibility[npc.id] === true && npc.allow_pc_onboarding === true,
  );
  return npcs.map((n: any) => ({ id: n.id, name: n.name, title: n.title, role: n.role })) as { id: string; name: string; title: string | null; role: string | null }[];
}

// ============================================================================
// Get NPCs (with Faction Join, Quests, Favorites)
// ============================================================================
// ============================================================================
// Get NPCs for Analysis (Simplified version for AI analysis)
// ============================================================================
export async function getNPCsForAnalysis(campaignId: string) {
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
  if (!campaign?.world_id) return [];

  const { data: npcs, error } = await (supabase.from("npcs") as any)
    .select("id, name")
    .eq("world_id", campaign.world_id);

  if (error) {
    console.error("Error fetching NPCs for analysis:", error);
    throw new Error("Fehler beim Laden der NPCs.");
  }

  return npcs || [];
}

/** Alle NPCs einer Welt (GM-Zentrale). Kein Sichtbarkeits-Filter. */
export async function getNPCsByWorld(worldId: string) {
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

  const { data: npcsRaw, error } = await (supabase.from("npcs") as any)
    .select(`
      *,
      factions ( id, name, type )
    `)
    .eq("world_id", worldId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getNPCsByWorld Error:", error);
    return [];
  }

  return (npcsRaw || []).map((npc: any) => ({
    ...npc,
    is_revealed: true,
    is_favorite: false,
    has_active_quest: false,
    has_active_quest_as_giver: false,
    active_quests: [],
    active_quest_titles_as_giver: [],
  }));
}

// Get Single NPC by ID (with Quests and Favorites)
export async function getNPCById(npcId: string) {
  const supabase = await createClient();

  console.log("🔍 [getNPCById] Fetching NPC with ID:", npcId);

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("❌ [getNPCById] User not authenticated");
    throw new Error("Nicht authentifiziert.");
  }

  // 2. Fetch NPC with Faction and Location (ohne Quest-Embeds – FK quests.quest_giver_id kann fehlen)
  const { data: npc, error } = await (supabase.from("npcs") as any)
    .select(`
      *,
      factions:faction_id!left (
        id,
        name,
        type
      ),
      current_location:current_location_id!left (
        id,
        name,
        type
      ),
      home_location:home_location_id!left (
        id,
        name,
        type
      )
    `)
    .eq("id", npcId)
    .maybeSingle();

  if (error) {
    console.error("❌ [getNPCById] Error:", JSON.stringify(error, null, 2));
    console.error("❌ [getNPCById] Error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      npcId: npcId,
    });
    return null;
  }

  // 3. Check if NPC was found
  if (!npc) {
    console.warn("⚠️ [getNPCById] NPC not found:", npcId);
    return null;
  }

  // 4. Quests separat laden (kein Embed, da Beziehung npcs↔quests im Schema fehlen kann)
  let questsAsGiver: any[] = [];
  let questsAsParticipant: any[] = [];
  try {
    const { data: giverQuests } = await (supabase.from("quests") as any)
      .select("id, title, status, type, description")
      .eq("quest_giver_id", npcId);
    questsAsGiver = giverQuests || [];
  } catch {
    // Tabelle quests oder Spalte quest_giver_id fehlt – ignorieren
  }
  try {
    const { data: participantRows } = await (supabase.from("quest_participants") as any)
      .select("quest_id, role_description, quests(id, title, status, type, description)")
      .eq("npc_id", npcId);
    questsAsParticipant = (participantRows || []).map((p: any) => ({
      ...(p.quests || {}),
      participant_role: p.role_description,
    }));
  } catch {
    // quest_participants oder Embed fehlt – ignorieren
  }

  // 5. Check if user has favorited this NPC
  const { data: favorite } = await (supabase.from("npc_favorites") as any)
    .select("npc_id")
    .eq("user_id", user.id)
    .eq("npc_id", npcId)
    .maybeSingle();

  console.log("✅ [getNPCById] NPC loaded successfully:", {
    id: npc?.id,
    name: npc?.name,
    faction_id: (npc as any)?.faction_id,
    hasFaction: !!npc?.factions,
    current_location_id: (npc as any)?.current_location_id,
    hasLocation: !!npc?.locations,
    locationName: (npc as any)?.locations?.name || "Keine Location",
  });

  // 5. Map locations for backward compatibility
  const result = {
    ...npc,
    current_location: (npc as any).current_location || null,
    home_location: (npc as any).home_location || null,
    // Backward compatibility: locations -> current_location
    locations: (npc as any).current_location || null,
    is_favorite: !!favorite,
    all_quests: [...questsAsGiver, ...questsAsParticipant],
  };

  return result;
}

// ============================================================================
// Get NPC Narrative Hooks (for transitive hook suggestions)
// ============================================================================
export async function getNPCNarrativeHooks(npcId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: npc, error } = await (supabase.from("npcs") as any)
    .select("narrative_hooks")
    .eq("id", npcId)
    .maybeSingle();

  if (error) {
    console.error("Error loading narrative hooks:", error);
    return [];
  }

  return (npc?.narrative_hooks as NarrativeHook[]) || [];
}

// ============================================================================
// Toggle NPC Favorite
// ============================================================================
export async function toggleNPCFavorite(npcId: string, isFavorite: boolean) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch NPC to get campaign_id
  const { data: npc } = await (supabase.from("npcs") as any)
    .select("campaign_id")
    .eq("id", npcId)
    .single();

  if (!npc) throw new Error("NPC nicht gefunden.");

  if (isFavorite) {
    // Remove favorite
    const { error } = await (supabase.from("npc_favorites") as any)
      .delete()
      .eq("user_id", user.id)
      .eq("npc_id", npcId);

    if (error) {
      console.error("Remove Favorite Error:", error);
      throw new Error(error.message);
    }
  } else {
    // Add favorite
    const { error } = await (supabase.from("npc_favorites") as any)
      .insert({
        user_id: user.id,
        npc_id: npcId,
      });

    if (error) {
      console.error("Add Favorite Error:", error);
      throw new Error(error.message);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns");
}

// ============================================================================
// Update NPC Notes
// ============================================================================
export async function updateNPCNotes(
  npcId: string,
  notes: {
    gm_notes?: string;
  }
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: npc } = await (supabase.from("npcs") as any)
    .select("world_id, worlds!inner(gm_id)")
    .eq("id", npcId)
    .single();

  if (!npc) throw new Error("NPC nicht gefunden.");

  const worlds = (npc as { worlds?: { gm_id: string } }).worlds;
  const isGM = worlds && worlds.gm_id === user.id;

  // 3. Prepare updates
  const updates: any = {};
  if (isGM && notes.gm_notes !== undefined) {
    updates.gm_notes = notes.gm_notes;
  }
  // Spieler-Notizen: siehe campaign_notes (pro Kampagne isoliert)

  if (Object.keys(updates).length === 0) return;

  const { error } = await (supabase.from("npcs") as any).update(updates).eq("id", npcId);

  if (error) {
    console.error("Update NPC Notes Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns");
}

// ============================================================================
// Search All NPCs (for global relationship selection)
// ============================================================================
export async function searchAllNPCs(
  campaignId: string,
  searchQuery?: string
): Promise<Array<{
  id: string;
  name: string;
  image_url: string | null;
  role: string | null;
  current_location_id: string | null;
  location_name: string | null;
}>> {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  const campaign = campaignRaw as { world_id: string | null } | null;
  if (!campaign?.world_id) return [];

  let query = (supabase.from("npcs") as any)
    .select(`
      id,
      name,
      image_url,
      role,
      current_location_id,
      locations:current_location_id (
        name
      )
    `)
    .eq("world_id", campaign.world_id);

  // 3. Optional: Filter by search query
  if (searchQuery && searchQuery.trim()) {
    query = query.ilike("name", `%${searchQuery.trim()}%`);
  }

  const { data: npcs, error } = await query;

  if (error) {
    console.error("Search All NPCs Error:", error);
    throw new Error(error.message);
  }

  // 4. Normalize the response (locations is an array, but we only need the first item)
  return (npcs || []).map((npc: any) => ({
    id: npc.id,
    name: npc.name,
    image_url: npc.image_url,
    role: npc.role,
    current_location_id: npc.current_location_id,
    location_name: npc.locations?.[0]?.name || null,
  }));
}

