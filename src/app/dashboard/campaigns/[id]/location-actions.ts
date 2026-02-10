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

  // 4. Fallback: Direkt aus "world_lore" lesen, falls noch kein Eintrag in "locations" existiert
  const { data: lore, error: loreError } = await (supabase.from("world_lore") as any)
    .select("id, campaign_id, name, type, description, gm_notes, image_url")
    .eq("id", locationId)
    .maybeSingle();

  if (loreError) {
    console.error("❌ [getLocationDetailsForAI] world_lore error:", loreError);
    return null;
  }

  if (!lore) {
    console.log("⚠️ [getLocationDetailsForAI] No location found in 'locations' or 'world_lore':", {
      locationId,
      campaignId,
    });
    return null;
  }

  if (lore.campaign_id !== campaignId) {
    console.warn("⚠️ [getLocationDetailsForAI] world_lore entry belongs to different campaign:", {
      locationId,
      loreCampaignId: lore.campaign_id,
      requestedCampaignId: campaignId,
    });
    return null;
  }

  // 5. Mapping: world_lore-Eintrag in eine strukturähnliche Form wie die "locations"-Abfrage bringen
  const mappedFromLore = {
    id: lore.id,
    campaign_id: lore.campaign_id,
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

  // 3. Fetch NPCs with home_location_id === locationId (Ansässige NPCs)
  const { data: residents, error: residentsError } = await (supabase.from("npcs") as any)
    .select("id, name, image_url, role, status")
    .eq("campaign_id", campaignId)
    .eq("home_location_id", locationId);

  if (residentsError) {
    console.error("❌ [getNPCsByLocation] Residents Error:", residentsError);
    throw new Error(`Fehler beim Laden der ansässigen NPCs: ${residentsError.message}`);
  }

  // 4. Fetch NPCs with current_location_id === locationId AND home_location_id !== locationId (Aktuelle Gäste)
  const { data: guests, error: guestsError } = await (supabase.from("npcs") as any)
    .select("id, name, image_url, role, status")
    .eq("campaign_id", campaignId)
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

  // 2. Fetch NPC to verify GM ownership
  const { data: npc } = await (supabase.from("npcs") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", npcId)
    .single();

  if (!npc) throw new Error("NPC nicht gefunden.");

  const campaigns = npc.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann den Aufenthaltsort ändern.");
  }

  // 3. Validate location_id if provided
  if (newLocationId) {
    const { data: location, error: locationError } = await (supabase.from("locations") as any)
      .select("id, campaign_id")
      .eq("id", newLocationId)
      .single();

    if (locationError || !location) {
      throw new Error(`Ungültiger Ort ausgewählt.`);
    }

    if (location.campaign_id !== npc.campaign_id) {
      throw new Error(`Der ausgewählte Ort gehört zu einer anderen Kampagne.`);
    }
  }

  // 4. Update NPC
  const { error: updateError } = await (supabase.from("npcs") as any)
    .update({ current_location_id: newLocationId })
    .eq("id", npcId);

  if (updateError) {
    console.error("❌ [updateNPCCurrentLocation] Error:", updateError);
    throw new Error(`Fehler beim Aktualisieren: ${updateError.message}`);
  }

  // 5. Revalidate
  revalidatePath(`/dashboard/campaigns/${npc.campaign_id}/npcs/${npcId}`);
  revalidatePath(`/dashboard/campaigns/${npc.campaign_id}/locations/${newLocationId || ""}`);

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

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Rekursiv alle Unter-Locations finden
  const getAllSubLocations = async (parentId: string): Promise<string[]> => {
    try {
      // Versuche, Unter-Locations zu finden (falls parent_location_id existiert)
      const { data: subLocations, error } = await (supabase.from("locations") as any)
        .select("id")
        .eq("campaign_id", campaignId)
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

  // 4. Zähle NPCs in allen Locations (Residents)
  const { data: allResidents, error: residentsError } = await (supabase.from("npcs") as any)
    .select("id")
    .eq("campaign_id", campaignId)
    .in("home_location_id", uniqueLocationIds);

  if (residentsError) {
    console.error("❌ [getLocationStats] Residents Error:", residentsError);
    throw new Error(`Fehler beim Zählen der ansässigen NPCs: ${residentsError.message}`);
  }

  // 5. Zähle NPCs in allen Locations (Guests)
  // Für Guests: current_location_id muss in der Liste sein, aber home_location_id nicht
  const { data: allGuests, error: guestsError } = await (supabase.from("npcs") as any)
    .select("id, home_location_id")
    .eq("campaign_id", campaignId)
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

  // 2. Get world_id for this campaign
  const { data: world } = await (supabase.from("worlds") as any)
    .select("id")
    .eq("campaign_id", campaignId)
    .single();

  if (!world) {
    throw new Error("Für diese Kampagne existiert noch keine Welt. Bitte erstelle zuerst eine Welt.");
  }

  // 3. Fetch all locations from world_lore (geographical types) that belong to this world
  const geographicalTypes = ["Stadt", "Region", "Ort", "Insel", "Gebäude", "Tempel", "Land", "Dungeon", "Akademie", "Markt", "Laden", "Dorf", "Festung", "Ruine", "Palast"];
  
  const { data: locations, error } = await (supabase.from("world_lore") as any)
    .select("id, name, type")
    .eq("campaign_id", campaignId)
    .eq("world_id", world.id)
    .in("type", geographicalTypes)
    .order("name");

  if (error) {
    console.error("❌ [getAllLocations] Error:", error);
    throw new Error(`Fehler beim Laden der Locations: ${error.message}`);
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

  // 2. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", formData.campaign_id)
    .single();

  // Expliziter Cast gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Orte erstellen.");
  }

  // 3. Validate parent_location_id if provided (mit Fallback zu world_lore)
  let validatedParentLocationId: string | null = null;
  if (formData.parent_location_id) {
    // 3.a Primär: Prüfe, ob Parent in locations existiert
    const { data: parentLocation } = await (supabase.from("locations") as any)
      .select("id, campaign_id")
      .eq("id", formData.parent_location_id)
      .maybeSingle();

    if (parentLocation && parentLocation.campaign_id === formData.campaign_id) {
      validatedParentLocationId = parentLocation.id;
    } else {
      // 3.b Fallback: Prüfe, ob Parent in world_lore existiert
      const { data: parentLore } = await (supabase.from("world_lore") as any)
        .select("id, campaign_id, name, type, description, parent_id")
        .eq("id", formData.parent_location_id)
        .maybeSingle();

      if (parentLore && parentLore.campaign_id === formData.campaign_id) {
        // Rekursiv: Erstelle Parent-Ort, falls er noch nicht in locations existiert
        try {
          // Prüfe, ob Parent bereits in locations existiert (nochmal, falls er zwischenzeitlich erstellt wurde)
          const { data: existingParent } = await (supabase.from("locations") as any)
            .select("id, campaign_id")
            .eq("id", formData.parent_location_id)
            .maybeSingle();

          if (existingParent) {
            validatedParentLocationId = existingParent.id;
          } else {
            // Erstelle Parent-Ort rekursiv (mit seinem eigenen Parent, falls vorhanden)
            let parentParentLocationId: string | null = null;
            if (parentLore.parent_id) {
              // Rekursiver Aufruf für den Parent des Parents (max. 1 Ebene tief, um Endlosschleifen zu vermeiden)
              const { data: parentParentLore } = await (supabase.from("world_lore") as any)
                .select("id, campaign_id")
                .eq("id", parentLore.parent_id)
                .maybeSingle();

              if (parentParentLore) {
                // Prüfe, ob Parent-Parent bereits in locations existiert
                const { data: existingParentParent } = await (supabase.from("locations") as any)
                  .select("id")
                  .eq("id", parentLore.parent_id)
                  .maybeSingle();

                if (existingParentParent) {
                  parentParentLocationId = existingParentParent.id;
                } else {
                  // Erstelle Parent-Parent (ohne weitere Rekursion)
                  const { data: createdParentParent, error: createParentParentError } = await (supabase.from("locations") as any)
                    .insert({
                      id: parentParentLore.id,
                      campaign_id: parentParentLore.campaign_id,
                      name: (parentParentLore as any).name || "Unbekannt",
                      type: (parentParentLore as any).type || "Ort",
                      description: (parentParentLore as any).description || null,
                      parent_location_id: null, // Keine weitere Rekursion
                      lore_id: parentParentLore.id,
                    })
                    .select("id")
                    .single();

                  if (!createParentParentError && createdParentParent) {
                    parentParentLocationId = createdParentParent.id;
                  }
                }
              }
            }

            // Erstelle Parent-Ort
            const { data: createdParent, error: createParentError } = await (supabase.from("locations") as any)
              .insert({
                id: parentLore.id,
                campaign_id: parentLore.campaign_id,
                name: parentLore.name,
                type: parentLore.type,
                description: parentLore.description || null,
                parent_location_id: parentParentLocationId,
                lore_id: parentLore.id,
              })
              .select("id, campaign_id")
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

  // 4. Prüfe, ob Location bereits existiert (in locations oder world_lore)
  const { data: existingLocation } = await (supabase.from("locations") as any)
    .select("id, name, type, campaign_id")
    .eq("campaign_id", formData.campaign_id)
    .ilike("name", formData.name.trim())
    .maybeSingle();

  if (existingLocation) {
    console.log("ℹ️ [createLocationQuick] Location existiert bereits:", {
      id: existingLocation.id,
      name: existingLocation.name,
    });
    revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
    return {
      id: existingLocation.id,
      name: existingLocation.name,
      type: existingLocation.type,
    };
  }

  // 5. Prüfe, ob Location in world_lore existiert (ohne locations-Eintrag)
  const { data: existingLore } = await (supabase.from("world_lore") as any)
    .select("id, campaign_id, name, type, description, parent_id")
    .eq("campaign_id", formData.campaign_id)
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

    // 6.1. If no parent_location_id, try to find a "Welt" entry as default parent
    if (!parent_lore_id) {
      const { data: worldEntry } = await (supabase.from("world_lore") as any)
        .select("id")
        .eq("campaign_id", formData.campaign_id)
        .eq("type", "Welt")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (worldEntry) {
        parent_lore_id = worldEntry.id;
      }
    }

    // 7. Create Lore Entry (nur wenn noch nicht vorhanden)
    const { data: loreEntry, error: loreError } = await (supabase.from("world_lore") as any)
      .insert({
        campaign_id: formData.campaign_id,
        name: formData.name.trim(),
        type: formData.type,
        parent_id: parent_lore_id, // Set parent_id in world_lore
        description: formData.description || null,
        is_revealed: false, // Standardmäßig verborgen
      })
      .select("id")
      .single();

    if (loreError) {
      console.error("❌ [createLocationQuick] Lore Error:", loreError);
      // Prüfe, ob es ein Unique Constraint Fehler ist (Location existiert bereits)
      if (loreError.code === "23505" || loreError.message?.includes("unique constraint")) {
        // Versuche, den bestehenden Eintrag zu finden
        const { data: existingLoreRetry } = await (supabase.from("world_lore") as any)
          .select("id, campaign_id, name, type")
          .eq("campaign_id", formData.campaign_id)
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

  // 8. Create Location entry (using same ID as lore entry)
  // Verwende validatedParentLocationId statt formData.parent_location_id
  const { data: location, error: locationError } = await (supabase.from("locations") as any)
    .insert({
      id: loreEntryId,
      campaign_id: formData.campaign_id, // WICHTIG: campaign_id explizit setzen
      name: formData.name.trim(),
      type: formData.type,
      description: formData.description || null,
      parent_location_id: validatedParentLocationId, // Verwende validierte Parent-ID
      lore_id: loreEntryId,
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

  revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
  return location;
}

