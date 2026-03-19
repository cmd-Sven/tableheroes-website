"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server Actions für Locations
 * 
 * Unterstützt:
 * - Get Location by ID
 * - Get NPCs by Location (home_location_id und current_location_id)
 */

// ============================================================================
// Get Location by ID
// ============================================================================
export async function getLocationById(locationId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Location with Lore relation (inkl. GM-Notizen für GM-Zugriff)
  const { data: location, error } = await (supabase.from("locations") as any)
    .select(`
      *,
      lore:lore_id (
        id,
        name,
        type,
        description,
        gm_notes,
        image_url
      )
    `)
    .eq("id", locationId)
    .single();

  if (error) {
    console.error("❌ [getLocationById] Error:", error);
    throw new Error(`Fehler beim Laden der Location: ${error.message}`);
  }

  return location;
}

// ============================================================================
// Get Location Details for AI Generation (inkl. GM-Notizen)
// ============================================================================
export async function getLocationDetailsForAI(locationId: string, campaignId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. GM Check (nur GM kann GM-Notizen sehen)
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Expliziter Cast gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Location-Details für die KI-Generierung laden.");
  }

  // 3. Primärer Versuch: Location aus der "locations"-Tabelle inkl. Lore-Relation laden
  const { data: location, error: locationError } = await (supabase.from("locations") as any)
    .select(`
      *,
      lore:lore_id (
        id,
        name,
        type,
        description,
        gm_notes,
        image_url
      )
    `)
    .eq("id", locationId)
    .maybeSingle();

  if (locationError) {
    console.error("❌ [getLocationDetailsForAI] locations error:", locationError);
    // Wir gehen trotzdem in den Fallback, falls nötig.
  }

  if (location) {
    console.log("✅ [getLocationDetailsForAI] Loaded location context from 'locations' table:", {
      locationId,
      campaignId,
      source: "locations",
    });
    return location;
  }

  const { data: campaignRow } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  const campaignWorldId = (campaignRow as { world_id: string | null } | null)?.world_id ?? null;

  const { data: lore, error: loreError } = await (supabase.from("world_lore") as any)
    .select("id, world_id, name, type, description, gm_notes, image_url")
    .eq("id", locationId)
    .maybeSingle();

  if (loreError || !lore) {
    return null;
  }

  if (!campaignWorldId || lore.world_id !== campaignWorldId) {
    return null;
  }

  const mappedFromLore = {
    id: lore.id,
    world_id: lore.world_id,
    name: lore.name,
    type: lore.type,
    description: lore.description,
    // Simulierter Lore-Join, damit generateNPC den Kontext konsistent nutzen kann
    lore: {
      id: lore.id,
      name: lore.name,
      type: lore.type,
      description: lore.description,
      gm_notes: (lore as any).gm_notes ?? null,
      image_url: (lore as any).image_url ?? null,
    },
  };

  console.log("✅ [getLocationDetailsForAI] Loaded location context from 'world_lore' fallback:", {
    locationId,
    campaignId,
    source: "world_lore",
  });

  return mappedFromLore as any;
}

// ============================================================================
// Get NPCs by Location
// ============================================================================
export async function getNPCsByLocation(
  campaignId: string,
  locationId: string
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch user's favorite NPC IDs
  const { data: favorites } = await (supabase.from("npc_favorites") as any)
    .select("npc_id")
    .eq("user_id", user.id);

  const favoriteIds = new Set((favorites || []).map((f: { npc_id: string }) => f.npc_id));

  const { data: campaignRow } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  const worldId = (campaignRow as { world_id: string | null } | null)?.world_id;
  if (!worldId) {
    return { residents: [], guests: [] };
  }

  const { data: residents, error: residentsError } = await (supabase.from("npcs") as any)
    .select("id, name, image_url, role, status")
    .eq("world_id", worldId)
    .eq("home_location_id", locationId);

  if (residentsError) {
    throw new Error(`Fehler beim Laden der ansässigen NPCs: ${residentsError.message}`);
  }

  const { data: guests, error: guestsError } = await (supabase.from("npcs") as any)
    .select("id, name, image_url, role, status")
    .eq("world_id", worldId)
    .eq("current_location_id", locationId)
    .neq("home_location_id", locationId);

  if (guestsError) {
    console.error("❌ [getNPCsByLocation] Guests Error:", guestsError);
    throw new Error(`Fehler beim Laden der Gäste: ${guestsError.message}`);
  }

  return {
    residents: (residents || []).map((npc: any) => ({
      ...npc,
      is_favorite: favoriteIds.has(npc.id),
    })),
    guests: (guests || []).map((npc: any) => ({
      ...npc,
      is_favorite: favoriteIds.has(npc.id),
    })),
  };
}

// ============================================================================
// Update NPC Current Location (Quick Action)
// ============================================================================
export async function updateNPCCurrentLocation(
  npcId: string,
  newLocationId: string | null
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

  const worlds = npc.worlds as { gm_id: string } | undefined;
  if (!worlds || worlds.gm_id !== user.id) {
    throw new Error("Nur der GM der Welt kann den Aufenthaltsort ändern.");
  }

  if (newLocationId) {
    const { data: location, error: locationError } = await (supabase.from("locations") as any)
      .select("id, world_id")
      .eq("id", newLocationId)
      .single();

    if (locationError || !location || location.world_id !== npc.world_id) {
      throw new Error(`Ungültiger Ort oder Ort gehört zu einer anderen Welt.`);
    }
  }

  const { error: updateError } = await (supabase.from("npcs") as any)
    .update({ current_location_id: newLocationId })
    .eq("id", npcId);

  if (updateError) {
    throw new Error(`Fehler beim Aktualisieren: ${updateError.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns");

  return { success: true };
}

// ============================================================================
// Get Location Stats (rekursive NPC-Zählung)
// ============================================================================
export async function getLocationStats(
  campaignId: string,
  locationId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRow } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  const worldId = (campaignRow as { world_id: string | null } | null)?.world_id;
  if (!worldId) {
    return { residentsCount: 0, guestsCount: 0 };
  }

  const getAllSubLocations = async (parentId: string): Promise<string[]> => {
    try {
      const { data: subLocations, error } = await (supabase.from("locations") as any)
        .select("id")
        .eq("world_id", worldId)
        .eq("parent_location_id", parentId);

      // Wenn parent_location_id nicht existiert, wird ein Fehler geworfen
      // In diesem Fall geben wir nur die Haupt-Location zurück
      if (error || !subLocations || subLocations.length === 0) {
        return [parentId];
      }

      const allSubIds = [parentId];
      for (const subLoc of subLocations) {
        const deeperSubs = await getAllSubLocations(subLoc.id);
        allSubIds.push(...deeperSubs);
      }

      return allSubIds;
    } catch (error) {
      // Falls parent_location_id nicht existiert, nur die Haupt-Location zurückgeben
      return [parentId];
    }
  };

  // 3. Sammle alle Location-IDs (inklusive der Haupt-Location und aller Unter-Locations)
  const allLocationIds = await getAllSubLocations(locationId);
  // Entferne Duplikate
  const uniqueLocationIds = Array.from(new Set(allLocationIds));

  const { data: allResidents, error: residentsError } = await (supabase.from("npcs") as any)
    .select("id")
    .eq("world_id", worldId)
    .in("home_location_id", uniqueLocationIds);

  if (residentsError) {
    console.error("❌ [getLocationStats] Residents Error:", residentsError);
    throw new Error(`Fehler beim Zählen der ansässigen NPCs: ${residentsError.message}`);
  }

  const { data: allGuests, error: guestsError } = await (supabase.from("npcs") as any)
    .select("id, home_location_id")
    .eq("world_id", worldId)
    .in("current_location_id", uniqueLocationIds);

  if (guestsError) {
    console.error("❌ [getLocationStats] Guests Error:", guestsError);
    throw new Error(`Fehler beim Zählen der Gäste: ${guestsError.message}`);
  }

  // Filtere Gäste: home_location_id darf nicht in uniqueLocationIds sein
  const filteredGuests = (allGuests || []).filter(
    (npc: any) => !npc.home_location_id || !uniqueLocationIds.includes(npc.home_location_id)
  );

  return {
    totalResidents: allResidents?.length || 0,
    totalGuests: filteredGuests.length || 0,
  };
}

// ============================================================================
// Get All Locations for Campaign (for search/select)
// ============================================================================
export async function getAllLocations(campaignId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRow } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  const worldId = (campaignRow as { world_id: string | null } | null)?.world_id;
  if (!worldId) {
    return [];
  }

  const { LOCATION_TYPES } = await import("@/src/lib/lore-types");
  const { data: locations, error } = await (supabase.from("world_lore") as any)
    .select("id, name, type")
    .eq("world_id", worldId)
    .in("type", LOCATION_TYPES)
    .order("name");

  if (error) {
    console.error("❌ [getAllLocations] Error:", error);
    throw new Error(`Fehler beim Laden der Locations: ${error.message}`);
  }

  return locations || [];
}

/** Alle Orte einer Welt (für GM-Zentrale, ohne Kampagne). */
export async function getAllLocationsByWorld(worldId: string) {
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

  const { LOCATION_TYPES } = await import("@/src/lib/lore-types");
  const { data: locations, error } = await (supabase.from("world_lore") as any)
    .select("id, name, type")
    .eq("world_id", worldId)
    .in("type", LOCATION_TYPES)
    .order("name");

  if (error) {
    console.error("getAllLocationsByWorld Error:", error);
    return [];
  }
  return locations || [];
}

// ============================================================================
// Create Location (Quick/On-the-Fly)
// ============================================================================
export async function createLocationQuick(formData: {
  campaign_id: string;
  name: string;
  type: string;
  parent_location_id?: string | null;
  description?: string | null;
}): Promise<{ id: string; name: string; type: string }> {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, world_id")
    .eq("id", formData.campaign_id)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string; world_id: string | null } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Orte erstellen.");
  }
  if (!campaign.world_id) {
    throw new Error("Diese Kampagne hat keine Basis-Welt. Bitte weise eine Welt zu.");
  }
  const worldId = campaign.world_id;

  let validatedParentLocationId: string | null = null;
  if (formData.parent_location_id) {
    const { data: parentLocation } = await (supabase.from("locations") as any)
      .select("id, world_id")
      .eq("id", formData.parent_location_id)
      .maybeSingle();

    if (parentLocation && parentLocation.world_id === worldId) {
      validatedParentLocationId = parentLocation.id;
    } else {
      const { data: parentLore } = await (supabase.from("world_lore") as any)
        .select("id, world_id, name, type, description, parent_id")
        .eq("id", formData.parent_location_id)
        .maybeSingle();

      if (parentLore && parentLore.world_id === worldId) {
        try {
          const { data: existingParent } = await (supabase.from("locations") as any)
            .select("id")
            .eq("id", formData.parent_location_id)
            .maybeSingle();

          if (existingParent) {
            validatedParentLocationId = existingParent.id;
          } else {
            let parentParentLocationId: string | null = null;
            if (parentLore.parent_id) {
              const { data: parentParentLore } = await (supabase.from("world_lore") as any)
                .select("id, world_id, name, type, description")
                .eq("id", parentLore.parent_id)
                .maybeSingle();

              if (parentParentLore && parentParentLore.world_id === worldId) {
                const { data: existingParentParent } = await (supabase.from("locations") as any)
                  .select("id")
                  .eq("id", parentLore.parent_id)
                  .maybeSingle();

                if (existingParentParent) {
                  parentParentLocationId = existingParentParent.id;
                } else {
                  const { data: createdParentParent, error: createParentParentError } = await (supabase.from("locations") as any)
                    .insert({
                      id: parentParentLore.id,
                      world_id: worldId,
                      name: (parentParentLore as any).name || "Unbekannt",
                      type: (parentParentLore as any).type || "Ort",
                      description: (parentParentLore as any).description || null,
                      parent_location_id: null,
                    })
                    .select("id")
                    .single();

                  if (!createParentParentError && createdParentParent) {
                    parentParentLocationId = createdParentParent.id;
                  }
                }
              }
            }

            const { data: createdParent, error: createParentError } = await (supabase.from("locations") as any)
              .insert({
                id: parentLore.id,
                world_id: worldId,
                name: parentLore.name,
                type: parentLore.type,
                description: parentLore.description || null,
                parent_location_id: parentParentLocationId,
              })
              .select("id")
              .single();

            if (createParentError || !createdParent) {
              console.warn("⚠️ [createLocationQuick] Parent-Ort konnte nicht erstellt werden:", {
                parentId: formData.parent_location_id,
                error: createParentError,
              });
              // Setze auf null, um die Transaktion nicht abzubrechen
              validatedParentLocationId = null;
            } else {
              validatedParentLocationId = createdParent.id;
              console.log("✅ [createLocationQuick] Parent-Ort erstellt:", {
                parentId: validatedParentLocationId,
                name: parentLore.name,
              });
            }
          }
        } catch (parentError) {
          console.warn("⚠️ [createLocationQuick] Fehler beim Erstellen des Parent-Orts:", {
            parentId: formData.parent_location_id,
            error: parentError instanceof Error ? parentError.message : String(parentError),
          });
          // Setze auf null, um die Transaktion nicht abzubrechen
          validatedParentLocationId = null;
        }
      } else {
        console.warn("⚠️ [createLocationQuick] Parent-Ort nicht gefunden:", {
          parentId: formData.parent_location_id,
        });
        // Setze auf null, um die Transaktion nicht abzubrechen
        validatedParentLocationId = null;
      }
    }
  }

  const { data: existingLocation } = await (supabase.from("locations") as any)
    .select("id, name, type")
    .eq("world_id", worldId)
    .ilike("name", formData.name.trim())
    .maybeSingle();

  if (existingLocation) {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/campaigns");
    return {
      id: existingLocation.id,
      name: existingLocation.name,
      type: existingLocation.type,
    };
  }

  const { data: existingLore } = await (supabase.from("world_lore") as any)
    .select("id, world_id, name, type, description, parent_id")
    .eq("world_id", worldId)
    .ilike("name", formData.name.trim())
    .maybeSingle();

  let loreEntryId: string;
  if (existingLore) {
    // Verwende bestehenden Lore-Eintrag
    loreEntryId = existingLore.id;
    console.log("ℹ️ [createLocationQuick] Verwende bestehenden Lore-Eintrag:", {
      id: loreEntryId,
      name: existingLore.name,
    });
  } else {
    // 6. Find parent_lore_id if parent_location_id is provided
    let parent_lore_id: string | null = null;
    if (validatedParentLocationId) {
      // Find the lore entry that corresponds to this location
      const { data: parentLore } = await (supabase.from("world_lore") as any)
        .select("id")
        .eq("id", validatedParentLocationId) // locations.id === world_lore.id
        .maybeSingle();
      
      if (parentLore) {
        parent_lore_id = parentLore.id;
      } else {
        // Fallback: Check if location has lore_id field
        const { data: parentLocation } = await (supabase.from("locations") as any)
          .select("lore_id")
          .eq("id", validatedParentLocationId)
          .maybeSingle();
        
        if (parentLocation?.lore_id) {
          parent_lore_id = parentLocation.lore_id;
        }
      }
    }

    if (!parent_lore_id) {
      const { data: worldEntry } = await (supabase.from("world_lore") as any)
        .select("id")
        .eq("world_id", worldId)
        .eq("type", "Welt")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (worldEntry) {
        parent_lore_id = worldEntry.id;
      }
    }

    const { data: loreEntry, error: loreError } = await (supabase.from("world_lore") as any)
      .insert({
        world_id: worldId,
        name: formData.name.trim(),
        type: formData.type,
        parent_id: parent_lore_id,
        description: formData.description || null,
      })
      .select("id")
      .single();

    if (loreError) {
      if (loreError.code === "23505" || loreError.message?.includes("unique constraint")) {
        const { data: existingLoreRetry } = await (supabase.from("world_lore") as any)
          .select("id, name, type")
          .eq("world_id", worldId)
          .ilike("name", formData.name.trim())
          .maybeSingle();
        
        if (existingLoreRetry) {
          loreEntryId = existingLoreRetry.id;
          console.log("ℹ️ [createLocationQuick] Verwende bestehenden Lore-Eintrag (nach Unique Constraint):", {
            id: loreEntryId,
          });
        } else {
          throw new Error(`Fehler beim Erstellen des Lore-Eintrags: ${loreError.message}`);
        }
      } else {
        throw new Error(`Fehler beim Erstellen des Lore-Eintrags: ${loreError.message}`);
      }
    } else {
      loreEntryId = loreEntry.id;
    }
  }

  const { data: location, error: locationError } = await (supabase.from("locations") as any)
    .insert({
      id: loreEntryId,
      world_id: worldId,
      name: formData.name.trim(),
      type: formData.type,
      description: formData.description || null,
      parent_location_id: validatedParentLocationId,
    })
    .select("id, name, type")
    .single();

  if (locationError) {
    console.error("❌ [createLocationQuick] Location Error:", locationError);
    
    // Prüfe, ob es ein Foreign-Key-Fehler ist (Parent-Problem)
    if (locationError.code === "23503" || locationError.message?.includes("foreign key")) {
      // Try to clean up lore entry
      await (supabase.from("world_lore") as any).delete().eq("id", loreEntryId);
      throw new Error(
        `Der Ort "${formData.name}" oder sein übergeordneter Ort ist ungültig. Bitte prüfe die Orts-Hierarchie.`
      );
    }
    
    // Try to clean up lore entry
    await (supabase.from("world_lore") as any).delete().eq("id", loreEntryId);
    throw new Error(`Fehler beim Erstellen des Ortes: ${locationError.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns");
  return location;
}

