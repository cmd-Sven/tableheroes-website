"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

export async function createNPC(formData: {
  campaign_id: string;
  name: string;
  title?: string;
  description?: string;
  gm_notes?: string;
  player_notes?: string;
  faction_id?: string | null;
  current_location_id?: string | null;
  home_location_id?: string | null;
  is_revealed?: boolean;
  race?: string;
  role?: string;
  status?: string;
  appearance?: string;
  personality_traits?: string;
  alignment?: string;
  image_url?: string;
  narrative_hooks?: NarrativeHook[] | null;
  is_secret_antagonist?: boolean;
  hidden_agenda?: string;
  true_nature?: string;
  secret_entry?: string;
  check_results?: Array<{
    type: "Wahrnehmung" | "Motiv erkennen" | "Wissen";
    dc: number;
    result: string;
    is_critical: boolean;
  }> | null;
}) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", formData.campaign_id)
    .single();

  // Expliziter Cast gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann NPCs erstellen.");
  }

  // 3. Get world_id for this campaign
  const { data: world } = await (supabase.from("worlds") as any)
    .select("id")
    .eq("campaign_id", formData.campaign_id)
    .single();

  if (!world) {
    throw new Error("Für diese Kampagne existiert noch keine Welt. Bitte erstelle zuerst eine Welt.");
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

  // 4. Validate location_ids exist if provided
  // Rekursive Hilfsfunktion, um Parent-Orte zu validieren/erstellen
  const validateOrCreateLocation = async (
    locationId: string,
    campaignId: string,
    depth: number = 0
  ): Promise<{ id: string; campaign_id: string }> => {
    // Schutz vor Endlosschleifen
    if (depth > 10) {
      throw new Error("Zu viele verschachtelte Parent-Orte. Bitte prüfe die Hierarchie.");
    }

    // 4.a Primär: Versuch, den Ort aus der "locations"-Tabelle zu laden
    const { data: location, error: locationError } = await (supabase.from("locations") as any)
      .select("id, campaign_id, name")
      .eq("id", locationId)
      .maybeSingle();

    if (location && location.campaign_id === campaignId) {
      return location as { id: string; campaign_id: string };
    }

    // 4.b Fallback: Falls kein Eintrag in "locations" existiert, prüfe world_lore
    const { data: lore, error: loreError } = await (supabase.from("world_lore") as any)
      .select("id, campaign_id, name, type, description, parent_id")
      .eq("id", locationId)
      .maybeSingle();

    if (!lore || lore.campaign_id !== campaignId) {
      console.error(`❌ [validateOrCreateLocation] Location not found:`, {
        locationId,
        depth,
        locationError,
        loreError,
        loreFound: !!lore,
      });
      throw new Error(`Der Ort mit der ID "${locationId}" existiert nicht in dieser Kampagne.`);
    }

    // 4.c Rekursiv: Validiere/Erstelle Parent-Ort, falls vorhanden
    let validatedParentLocationId: string | null = null;
    if (lore.parent_id) {
      try {
        const parentLocation = await validateOrCreateLocation(lore.parent_id, campaignId, depth + 1);
        validatedParentLocationId = parentLocation.id;
        console.log(`✅ [validateOrCreateLocation] Parent-Ort validiert/erstellt:`, {
          parentId: validatedParentLocationId,
          childId: locationId,
          depth,
        });
      } catch (parentError) {
        console.warn(`⚠️ [validateOrCreateLocation] Parent-Ort konnte nicht validiert werden:`, {
          parentId: lore.parent_id,
          childId: locationId,
          error: parentError instanceof Error ? parentError.message : String(parentError),
          depth,
        });
        // Setze parent_location_id auf null, um die Transaktion nicht abzubrechen
        validatedParentLocationId = null;
      }
    }

    // 4.d Erstelle Location-Eintrag aus world_lore
    const { data: createdLocation, error: createError } = await (supabase.from("locations") as any)
      .insert({
        id: lore.id,
        campaign_id: lore.campaign_id,
        name: lore.name,
        type: lore.type,
        description: lore.description || null,
        parent_location_id: validatedParentLocationId, // Verwende validierte Parent-ID oder null
        lore_id: lore.id,
      })
      .select("id, campaign_id")
      .single();

    if (createError || !createdLocation) {
      console.error(`❌ [validateOrCreateLocation] Failed to create locations entry:`, {
        locationId,
        parentLocationId: validatedParentLocationId,
        createError,
        depth,
      });

      // Prüfe, ob es ein Foreign-Key-Fehler ist (Parent-Problem)
      if (createError?.code === "23503" || createError?.message?.includes("foreign key")) {
        throw new Error(
          `Der Ort "${lore.name}" oder sein übergeordneter Ort ist ungültig. Bitte prüfe die Orts-Hierarchie.`
        );
      }

      throw new Error(
        `Fehler beim Erstellen des Ortes "${lore.name}": ${createError?.message || "Unbekannter Fehler"}`
      );
    }

    console.log(`✅ [validateOrCreateLocation] Location erstellt:`, {
      locationId: createdLocation.id,
      name: lore.name,
      parentLocationId: validatedParentLocationId,
      depth,
    });

    return createdLocation as { id: string; campaign_id: string };
  };

  const validateLocation = async (locationId: string | null, fieldName: string): Promise<string | null> => {
    if (!locationId) return null;

    console.log("🔍 [createNPC] validateLocation input:", {
      fieldName,
      rawLocationId: locationId,
    });

    try {
      const effectiveLocation = await validateOrCreateLocation(locationId, formData.campaign_id, 0);

      // Zusätzliche Validierung: Location muss zur gleichen Kampagne gehören
      if (effectiveLocation.campaign_id !== formData.campaign_id) {
        console.error(`❌ [createNPC] Location belongs to different campaign:`, {
          locationCampaignId: effectiveLocation.campaign_id,
          npcCampaignId: formData.campaign_id,
        });
        throw new Error(`Der ausgewählte Ort gehört zu einer anderen Kampagne.`);
      }

      console.log(`✅ [createNPC] ${fieldName} validated:`, effectiveLocation.id);
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

  // 6. Insert NPC
  const insertPayload = {
    campaign_id: formData.campaign_id,
    world_id: world.id,
    name: formData.name,
    title: formData.title || null,
    description: formData.description || null,
    gm_notes: formData.gm_notes || null,
    player_notes: formData.player_notes || null,
    faction_id: normalizedFactionId,
    current_location_id: validatedCurrentLocationId, // WICHTIG: Verwende die validierte ID
    home_location_id: validatedHomeLocationId, // WICHTIG: Verwende die validierte ID
    is_revealed: formData.is_revealed ?? false,
    race: formData.race || null,
    role: formData.role || null,
    status: formData.status || "Alive",
    appearance: formData.appearance || null,
    personality_traits: formData.personality_traits || null,
    alignment: formData.alignment || null,
    image_url: formData.image_url || null,
    narrative_hooks: formData.narrative_hooks && formData.narrative_hooks.length > 0 ? formData.narrative_hooks : null,
    is_secret_antagonist: formData.is_secret_antagonist ?? false,
    hidden_agenda: formData.hidden_agenda || null,
    true_nature: formData.true_nature || null,
    check_results: formData.check_results && formData.check_results.length > 0 ? formData.check_results : null,
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

  revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
  revalidatePath(`/dashboard/campaigns/${formData.campaign_id}?tab=npcs`);
  revalidatePath(`/dashboard/campaigns/${formData.campaign_id}/npcs`);
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

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const result: {
    sameLocation: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
    nearbyLocations: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
    sameFaction: Array<{ id: string; name: string; image_url: string | null; role: string | null }>;
  } = {
    sameLocation: [],
    nearbyLocations: [],
    sameFaction: [],
  };

  // 2. NPCs am exakten Ort finden
  if (locationId) {
    let query = (supabase.from("npcs") as any)
      .select("id, name, image_url, role")
      .eq("campaign_id", campaignId)
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
        .eq("campaign_id", campaignId)
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

  // 4. NPCs in der gleichen Fraktion finden
  if (factionId) {
    let query = (supabase.from("npcs") as any)
      .select("id, name, image_url, role")
      .eq("campaign_id", campaignId)
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
    player_notes?: string;
    faction_id?: string | null;
    current_location_id?: string | null;
    home_location_id?: string | null;
    is_revealed?: boolean;
    race?: string;
    role?: string;
    status?: string;
    appearance?: string;
    personality_traits?: string;
    alignment?: string;
    image_url?: string;
    narrative_hooks?: NarrativeHook[] | null;
    is_secret_antagonist?: boolean;
    hidden_agenda?: string | null;
    true_nature?: string | null;
    check_results?: Array<{
      type: "Wahrnehmung" | "Motiv erkennen" | "Wissen";
      dc: number;
      result: string;
      is_critical: boolean;
    }> | null;
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
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", npcId)
    .single();

  if (!npc) throw new Error("NPC nicht gefunden.");

  const campaigns = (npc as any).campaigns;
  if (!campaigns || campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann NPCs bearbeiten.");
  }

  // 3. Normalize foreign keys: empty strings -> null
  const normalizedUpdates: any = { ...updates };
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

  // 4. Validate location_id exists if provided
  if (normalizedUpdates.current_location_id) {
    // Fetch NPC to get campaign_id for validation
    const { data: npcData } = await (supabase.from("npcs") as any)
      .select("campaign_id")
      .eq("id", npcId)
      .single();

    const { data: location, error: locationError } = await (supabase.from("locations") as any)
      .select("id, campaign_id")
      .eq("id", normalizedUpdates.current_location_id)
      .single();

    if (locationError || !location) {
      console.error("❌ [updateNPC] Invalid location_id:", {
        locationId: normalizedUpdates.current_location_id,
        error: locationError,
      });
      throw new Error(`Ungültiger Ort ausgewählt. Bitte wähle einen gültigen Ort aus der Liste.`);
    }

    // Zusätzliche Validierung: Location muss zur gleichen Kampagne gehören
    if (npcData && location.campaign_id !== npcData.campaign_id) {
      console.error("❌ [updateNPC] Location belongs to different campaign:", {
        locationCampaignId: location.campaign_id,
        npcCampaignId: npcData.campaign_id,
      });
      throw new Error(`Der ausgewählte Ort gehört zu einer anderen Kampagne.`);
    }

    // Verwende die validierte ID direkt aus der Datenbank
    normalizedUpdates.current_location_id = location.id;
    console.log("✅ [updateNPC] Location validated:", normalizedUpdates.current_location_id);
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

  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}?tab=npcs`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}/npcs`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}/npcs/${npcId}`);
}

// ============================================================================
// Delete NPC
// ============================================================================
export async function deleteNPC(npcId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch NPC to verify GM ownership
  const { data: npc } = await (supabase.from("npcs") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", npcId)
    .single();

  if (!npc) throw new Error("NPC nicht gefunden.");

  const campaigns = (npc as any).campaigns;
  if (!campaigns || campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann NPCs löschen.");
  }

  // 3. Delete
  const { error } = await (supabase.from("npcs") as any).delete().eq("id", npcId);

  if (error) {
    console.error("Delete NPC Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}?tab=npcs`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}/npcs`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}/npcs/${npcId}`);
}

// ============================================================================
// Toggle Reveal Status
// ============================================================================
export async function toggleNPCReveal(npcId: string, currentState: boolean) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch NPC to verify GM ownership
  const { data: npc } = await (supabase.from("npcs") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", npcId)
    .single();

  if (!npc) throw new Error("NPC nicht gefunden.");

  const campaigns = (npc as any).campaigns;
  if (!campaigns || campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann die Sichtbarkeit ändern.");
  }

  // 3. Toggle
  const { error } = await (supabase.from("npcs") as any)
    .update({ is_revealed: !currentState })
    .eq("id", npcId);

  if (error) {
    console.error("Toggle NPC Reveal Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}?tab=npcs`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}/npcs`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}/npcs/${npcId}`);
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
    .select("id, campaign_id, allow_pc_onboarding, campaigns!inner(gm_id)")
    .eq("id", npcId)
    .single();

  if (fetchError) {
    console.error("[updateNPCAllowPcOnboarding] Fetch npc error:", fetchError);
    throw new Error("NPC nicht gefunden oder kein Zugriff.");
  }
  if (!npc) throw new Error("NPC nicht gefunden.");
  const campaigns = (npc as any).campaigns;
  if (!campaigns || campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann die Onboarding-Einstellung ändern.");
  }

  const { data: updated, error } = await (supabase.from("npcs") as any)
    .update({ allow_pc_onboarding: allow })
    .eq("id", npcId)
    .select("id, allow_pc_onboarding")
    .single();

  if (error) {
    console.error("[updateNPCAllowPcOnboarding] Update error:", error);
    throw new Error(error.message || "Speichern fehlgeschlagen.");
  }
  if (!updated || (updated as any).allow_pc_onboarding !== allow) {
    console.error("[updateNPCAllowPcOnboarding] Update nicht bestätigt:", { npcId, allow, updated });
    throw new Error("Update konnte nicht bestätigt werden. Bitte Seite neu laden und erneut versuchen.");
  }
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}?tab=settings`);
}

// ============================================================================
// Get NPCs by Faction for Onboarding (is_revealed OR allow_pc_onboarding)
// ============================================================================
export async function getNPCsByFactionForOnboarding(campaignId: string, factionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: npcs, error } = await (supabase.from("npcs") as any)
    .select("id, name, title, role")
    .eq("campaign_id", campaignId)
    .eq("faction_id", factionId)
    .or("is_revealed.eq.true,allow_pc_onboarding.eq.true")
    .order("name", { ascending: true });

  if (error) {
    console.error("getNPCsByFactionForOnboarding Error:", error);
    return [];
  }
  return (npcs || []) as { id: string; name: string; title: string | null; role: string | null }[];
}

// ============================================================================
// Get NPCs (with Faction Join, Quests, Favorites)
// ============================================================================
// ============================================================================
// Get NPCs for Analysis (Simplified version for AI analysis)
// ============================================================================
export async function getNPCsForAnalysis(campaignId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Get all NPCs (only id and name for analysis)
  const { data: npcs, error } = await (supabase.from("npcs") as any)
    .select("id, name")
    .eq("campaign_id", campaignId);

  if (error) {
    console.error("Error fetching NPCs for analysis:", error);
    throw new Error("Fehler beim Laden der NPCs.");
  }

  return npcs || [];
}

export async function getNPCs(campaignId: string, userId: string, isGM: boolean = false) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // Build query with explicit join syntax to ensure RLS works correctly
  let query = (supabase.from("npcs") as any)
    .select(`
      *,
      factions (
        id,
        name,
        type
      ),
      quests!quest_giver_id (
        id,
        title,
        status,
        type,
        is_revealed
      ),
      quest_participants (
        quest_id,
        quests (
          id,
          title,
          status,
          type,
          is_revealed
        )
      )
    `)
    .eq("campaign_id", campaignId);

  // Apply filters based on role
  // For players: Only show revealed NPCs OR own NPCs (created during character creation)
  // RLS will also filter quests based on is_revealed
  if (!isGM) {
    query = query.or(`is_revealed.eq.true,user_id.eq.${userId}`);
  }

  const { data: npcs, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch NPCs Error:", error);
    return [];
  }

  // 2. Fetch user's favorites
  const { data: favorites } = await (supabase.from("npc_favorites") as any)
    .select("npc_id")
    .eq("user_id", user.id);

  const favoriteIds = new Set((favorites || []).map((f: { npc_id: string }) => f.npc_id));

  // Helper function to check if NPC has an active, revealed quest
  const hasActiveQuest = (npc: any): boolean => {
    // Check direct quests (Questgeber)
    const isGiver = npc.quests?.some((q: any) => 
      q && q.status === 'Active' && q.is_revealed === true
    ) || false;

    // Check participation (via quest_participants)
    const isParticipant = npc.quest_participants?.some((qp: any) => 
      qp.quests && 
      qp.quests.status === 'Active' && 
      qp.quests.is_revealed === true
    ) || false;

    return isGiver || isParticipant;
  };

  // Helper function to get all active, revealed quests
  const getActiveQuests = (npc: any): any[] => {
    const activeQuests: any[] = [];

    // Add quests where NPC is giver
    if (npc.quests) {
      const giverQuests = npc.quests.filter((q: any) => 
        q && q.status === 'Active' && q.is_revealed === true
      );
      activeQuests.push(...giverQuests);
    }

    // Add quests where NPC is participant
    if (npc.quest_participants) {
      const participantQuests = npc.quest_participants
        .map((qp: any) => qp.quests)
        .filter((q: any) => 
          q && q.status === 'Active' && q.is_revealed === true
        );
      activeQuests.push(...participantQuests);
    }

    return activeQuests;
  };

  // 3. Enrich NPCs with favorite status and active quests
  const enrichedNPCs = (npcs || []).map((npc: any) => {
    // Get all quest data for debugging
    const questsAsGiver = npc.quests || [];
    const questsAsParticipant = npc.quest_participants || [];
    
    // Debug: Log raw quest data
    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 [getNPCs] NPC ${npc.name} Raw Quest Data:`, {
        questsAsGiver,
        questsAsParticipant,
        questsAsGiverLength: questsAsGiver.length,
        questsAsParticipantLength: questsAsParticipant.length,
        rawNPCKeys: Object.keys(npc), // Show all keys in NPC object
      });
    }
    
    // Use helper functions to get active quests
    const activeQuests = getActiveQuests(npc);
    const hasActive = hasActiveQuest(npc);

    // Questgeber: NPC hat mindestens eine aktive Quest als Geber (status = 'Active')
    const activeQuestsAsGiver = questsAsGiver.filter((q: any) => q && q.status === "Active");
    const hasActiveQuestAsGiver = activeQuestsAsGiver.length > 0;
    const activeQuestTitlesAsGiver = activeQuestsAsGiver.map((q: any) => q.title).filter(Boolean) as string[];

    // Debug: Log processed quest data
    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 [getNPCs] NPC ${npc.name} Processed:`, {
        activeQuestsCount: activeQuests.length,
        activeQuests,
        has_active_quest: hasActive,
        has_active_quest_as_giver: hasActiveQuestAsGiver,
        active_quest_titles_as_giver: activeQuestTitlesAsGiver,
      });
    }

    return {
      ...npc,
      is_favorite: favoriteIds.has(npc.id),
      active_quests: activeQuests,
      has_active_quest: hasActive,
      has_active_quest_as_giver: hasActiveQuestAsGiver,
      active_quest_titles_as_giver: activeQuestTitlesAsGiver,
      // Keep original quest data for debugging (with both naming conventions for compatibility)
      quests_as_giver: questsAsGiver, // Alias for consistency with frontend
      quests_as_participant: questsAsParticipant, // Alias for consistency with frontend
    };
  });

  return enrichedNPCs;
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

  // 2. Fetch NPC with Faction data, Quests, Favorites, and Location
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
      ),
      quests_as_giver:quests!quest_giver_id (
        id,
        title,
        status,
        type,
        description
      ),
      quests_as_participant:quest_participants!npc_id (
        quest_id,
        role_description,
        quests (
          id,
          title,
          status,
          type,
          description
        )
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

  // 4. Check if user has favorited this NPC
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

  // 4. Combine all quests
  const questsAsGiver = npc.quests_as_giver || [];
  const questsAsParticipant = (npc.quests_as_participant || []).map((p: any) => ({
    ...p.quests,
    participant_role: p.role_description,
  }));

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

  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}?tab=npcs`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}/npcs`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}/npcs/${npcId}`);
}

// ============================================================================
// Update NPC Notes
// ============================================================================
export async function updateNPCNotes(
  npcId: string,
  notes: {
    gm_notes?: string;
    player_notes?: string;
  }
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch NPC to verify access
  const { data: npc } = await supabase
    .from("npcs")
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", npcId)
    .single();

  if (!npc) throw new Error("NPC nicht gefunden.");

  const campaigns = (npc as any).campaigns;
  const isGM = campaigns && campaigns.gm_id === user.id;

  // 3. Prepare updates
  const updates: any = {};
  if (isGM && notes.gm_notes !== undefined) {
    updates.gm_notes = notes.gm_notes;
  }
  if (notes.player_notes !== undefined) {
    // Both GM and players can edit player_notes
    updates.player_notes = notes.player_notes;
  }

  // 4. Update
  const { error } = await (supabase.from("npcs") as any).update(updates).eq("id", npcId);

  if (error) {
    console.error("Update NPC Notes Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}?tab=npcs`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}/npcs`);
  revalidatePath(`/dashboard/campaigns/${(npc as any).campaign_id}/npcs/${npcId}`);
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

  // 2. Query NPCs with Location Join
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
    .eq("campaign_id", campaignId);

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

